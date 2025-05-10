"""
Repository Connector - Interface for accessing code repositories

This module implements the connector for code repositories,
enabling the system to ingest code files directly from
Git repositories or local file systems.
"""

import os
import re
import glob
import logging
import asyncio
import tempfile
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple, Union
from datetime import datetime

from ..models.document_model import Document, DocumentMetadata, DocumentType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RepositoryConnector:
    """
    Connector for accessing and processing code repositories.
    
    This class provides functionality to:
    1. Clone/pull Git repositories
    2. Scan local file systems for code files
    3. Apply gitignore patterns
    4. Track file changes over time
    5. Extract code files for processing
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the repository connector.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        self.base_path = config.get("repository", {}).get("base_path", ".")
        self.git_enabled = config.get("repository", {}).get("git_enabled", True)
        self.ignore_patterns = config.get("repository", {}).get("ignore_patterns", [])
        self.max_file_size = config.get("repository", {}).get("max_file_size", 10 * 1024 * 1024)  # 10 MB default
        self.default_extensions = config.get("repository", {}).get("extensions", [
            # Code files
            ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".cpp", ".h", ".hpp",
            ".go", ".rb", ".php", ".cs", ".scala", ".swift", ".kt", ".rs", ".sh",
            # Web files
            ".html", ".css", ".scss", ".less",
            # Data files
            ".json", ".yaml", ".yml", ".toml", ".xml",
            # Documentation
            ".md", ".rst", ".txt"
        ])
        
        # Compiled ignore patterns
        self.compiled_ignore_patterns = [re.compile(p) for p in self.ignore_patterns]
        
        # Add default ignore patterns
        self.default_ignore_patterns = [
            re.compile(r"^\.git/"),
            re.compile(r"^node_modules/"),
            re.compile(r"^__pycache__/"),
            re.compile(r"\.pyc$"),
            re.compile(r"^\.venv/"),
            re.compile(r"^venv/"),
            re.compile(r"^env/"),
            re.compile(r"^\.env/"),
            re.compile(r"^build/"),
            re.compile(r"^dist/"),
            re.compile(r"^\.cache/"),
            re.compile(r"^\.pytest_cache/")
        ]
        
        logger.info(f"Repository connector initialized with base path: {self.base_path}")
    
    async def clone_repository(self, repo_url: str, target_dir: Optional[str] = None) -> str:
        """
        Clone a Git repository to the local file system.
        
        Args:
            repo_url: URL of the Git repository
            target_dir: Target directory (optional, will use repo name if not provided)
            
        Returns:
            Path to the cloned repository
        """
        if not self.git_enabled:
            raise ValueError("Git operations are disabled in configuration")
        
        # Extract repo name from URL
        repo_name = repo_url.split("/")[-1]
        if repo_name.endswith(".git"):
            repo_name = repo_name[:-4]
        
        # Determine target directory
        if not target_dir:
            target_dir = os.path.join(self.base_path, repo_name)
        
        logger.info(f"Cloning repository {repo_url} to {target_dir}")
        
        # Clone repository using Git subprocess
        try:
            # Check if directory already exists
            if os.path.exists(target_dir):
                if not os.path.exists(os.path.join(target_dir, ".git")):
                    raise ValueError(f"Target directory {target_dir} exists but is not a Git repository")
                
                # Pull updates instead of cloning
                return await self.pull_repository(target_dir)
            
            # Create parent directories if needed
            os.makedirs(os.path.dirname(target_dir), exist_ok=True)
            
            # Clone the repository
            proc = await asyncio.create_subprocess_exec(
                "git", "clone", repo_url, target_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await proc.communicate()
            
            if proc.returncode != 0:
                error_msg = stderr.decode().strip()
                raise RuntimeError(f"Git clone failed: {error_msg}")
            
            logger.info(f"Repository cloned successfully: {target_dir}")
            return target_dir
            
        except Exception as e:
            logger.error(f"Error cloning repository: {e}")
            raise
    
    async def pull_repository(self, repo_path: str) -> str:
        """
        Pull latest changes for a Git repository.
        
        Args:
            repo_path: Path to the local repository
            
        Returns:
            Path to the repository
        """
        if not self.git_enabled:
            raise ValueError("Git operations are disabled in configuration")
        
        logger.info(f"Pulling updates for repository at {repo_path}")
        
        try:
            # Pull the repository
            proc = await asyncio.create_subprocess_exec(
                "git", "-C", repo_path, "pull",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await proc.communicate()
            
            if proc.returncode != 0:
                error_msg = stderr.decode().strip()
                raise RuntimeError(f"Git pull failed: {error_msg}")
            
            logger.info(f"Repository updated successfully: {repo_path}")
            return repo_path
            
        except Exception as e:
            logger.error(f"Error pulling repository: {e}")
            raise
    
    async def scan_repository(self, repo_path: str, extensions: Optional[List[str]] = None) -> List[str]:
        """
        Scan a repository for code files.
        
        Args:
            repo_path: Path to the repository
            extensions: List of file extensions to include (optional)
            
        Returns:
            List of file paths
        """
        logger.info(f"Scanning repository at {repo_path}")
        
        if extensions is None:
            extensions = self.default_extensions
        
        file_paths = []
        
        # Load gitignore if present
        gitignore_patterns = await self._load_gitignore(repo_path)
        
        # Walk the repository
        for root, dirs, files in os.walk(repo_path):
            # Skip ignored directories
            dirs[:] = [d for d in dirs if not self._is_ignored(os.path.join(root, d), gitignore_patterns)]
            
            # Filter files by extension and ignore patterns
            for file in files:
                file_path = os.path.join(root, file)
                
                # Skip files that don't match extensions
                if not any(file.endswith(ext) for ext in extensions):
                    continue
                
                # Skip ignored files
                if self._is_ignored(file_path, gitignore_patterns):
                    continue
                
                # Skip files that are too large
                if os.path.getsize(file_path) > self.max_file_size:
                    logger.warning(f"Skipping file that exceeds size limit: {file_path}")
                    continue
                
                # Add file to the list
                file_paths.append(file_path)
        
        logger.info(f"Found {len(file_paths)} files in repository")
        return file_paths
    
    def _is_ignored(self, path: str, gitignore_patterns: List[re.Pattern]) -> bool:
        """
        Check if a path should be ignored.
        
        Args:
            path: Path to check
            gitignore_patterns: List of gitignore patterns
            
        Returns:
            True if the path should be ignored
        """
        # Get relative path
        rel_path = os.path.relpath(path, self.base_path)
        
        # Check default ignore patterns
        for pattern in self.default_ignore_patterns:
            if pattern.search(rel_path):
                return True
        
        # Check configured ignore patterns
        for pattern in self.compiled_ignore_patterns:
            if pattern.search(rel_path):
                return True
        
        # Check gitignore patterns
        for pattern in gitignore_patterns:
            if pattern.search(rel_path):
                return True
        
        return False
    
    async def _load_gitignore(self, repo_path: str) -> List[re.Pattern]:
        """
        Load and parse .gitignore file.
        
        Args:
            repo_path: Path to the repository
            
        Returns:
            List of compiled gitignore patterns
        """
        patterns = []
        gitignore_path = os.path.join(repo_path, ".gitignore")
        
        if not os.path.exists(gitignore_path):
            return patterns
        
        try:
            with open(gitignore_path, "r") as f:
                for line in f:
                    line = line.strip()
                    
                    # Skip empty lines and comments
                    if not line or line.startswith("#"):
                        continue
                    
                    # Convert gitignore pattern to regex
                    pattern = self._gitignore_to_regex(line)
                    patterns.append(re.compile(pattern))
            
            logger.info(f"Loaded {len(patterns)} patterns from .gitignore")
            
        except Exception as e:
            logger.error(f"Error loading .gitignore: {e}")
        
        return patterns
    
    def _gitignore_to_regex(self, pattern: str) -> str:
        """
        Convert a gitignore pattern to a regex pattern.
        
        Args:
            pattern: Gitignore pattern
            
        Returns:
            Regex pattern
        """
        # Handle negation
        negated = pattern.startswith("!")
        if negated:
            pattern = pattern[1:]
        
        # Handle directory indicator
        is_dir = pattern.endswith("/")
        if is_dir:
            pattern = pattern[:-1]
        
        # Escape special characters
        pattern = re.escape(pattern)
        
        # Convert gitignore wildcards to regex
        pattern = pattern.replace(r"\*\*/", ".*")  # **/ -> .*
        pattern = pattern.replace(r"\*\*", ".*")   # ** -> .*
        pattern = pattern.replace(r"\*", "[^/]*")  # * -> [^/]*
        pattern = pattern.replace(r"\?", "[^/]")   # ? -> [^/]
        
        # Handle start of path
        if pattern.startswith(r"\^"):
            pattern = "^" + pattern[2:]
        else:
            pattern = ".*/" + pattern
        
        # Handle end of path
        if is_dir:
            pattern = pattern + "(/.*)?$"
        else:
            pattern = pattern + "$"
        
        return pattern
    
    async def get_repository_metadata(self, repo_path: str) -> Dict[str, Any]:
        """
        Get metadata about a repository.
        
        Args:
            repo_path: Path to the repository
            
        Returns:
            Repository metadata
        """
        metadata = {
            "path": repo_path,
            "name": os.path.basename(repo_path),
            "last_updated": datetime.fromtimestamp(os.path.getmtime(repo_path)).isoformat()
        }
        
        # Add Git metadata if available
        if self.git_enabled and os.path.exists(os.path.join(repo_path, ".git")):
            try:
                # Get remote URL
                proc = await asyncio.create_subprocess_exec(
                    "git", "-C", repo_path, "config", "--get", "remote.origin.url",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                if stdout:
                    metadata["remote_url"] = stdout.decode().strip()
                
                # Get current branch
                proc = await asyncio.create_subprocess_exec(
                    "git", "-C", repo_path, "rev-parse", "--abbrev-ref", "HEAD",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                if stdout:
                    metadata["branch"] = stdout.decode().strip()
                
                # Get last commit hash
                proc = await asyncio.create_subprocess_exec(
                    "git", "-C", repo_path, "rev-parse", "HEAD",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                if stdout:
                    metadata["commit_hash"] = stdout.decode().strip()
                
                # Get last commit date
                proc = await asyncio.create_subprocess_exec(
                    "git", "-C", repo_path, "log", "-1", "--format=%cd", "--date=iso",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                if stdout:
                    metadata["commit_date"] = stdout.decode().strip()
                
            except Exception as e:
                logger.error(f"Error getting Git metadata: {e}")
        
        return metadata
    
    async def get_file_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Get metadata about a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            File metadata
        """
        rel_path = os.path.relpath(file_path, self.base_path)
        stat = os.stat(file_path)
        
        metadata = {
            "path": file_path,
            "relative_path": rel_path,
            "name": os.path.basename(file_path),
            "extension": os.path.splitext(file_path)[1],
            "size": stat.st_size,
            "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
        }
        
        # Add Git metadata if available
        if self.git_enabled and os.path.exists(os.path.join(os.path.dirname(file_path), ".git")):
            try:
                # Get last commit hash for this file
                proc = await asyncio.create_subprocess_exec(
                    "git", "-C", os.path.dirname(file_path), "log", "-1", "--format=%H", "--", file_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                if stdout:
                    metadata["last_commit_hash"] = stdout.decode().strip()
                
                # Get last commit date for this file
                proc = await asyncio.create_subprocess_exec(
                    "git", "-C", os.path.dirname(file_path), "log", "-1", "--format=%cd", "--date=iso", "--", file_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                if stdout:
                    metadata["last_commit_date"] = stdout.decode().strip()
                
                # Get last commit author for this file
                proc = await asyncio.create_subprocess_exec(
                    "git", "-C", os.path.dirname(file_path), "log", "-1", "--format=%an <%ae>", "--", file_path,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                )
                stdout, _ = await proc.communicate()
                if stdout:
                    metadata["last_commit_author"] = stdout.decode().strip()
                
            except Exception as e:
                logger.error(f"Error getting Git metadata for file: {e}")
        
        return metadata
    
    async def create_document_from_file(self, file_path: str, options: Dict[str, Any] = None) -> Document:
        """
        Create a document from a file.
        
        Args:
            file_path: Path to the file
            options: Processing options
            
        Returns:
            Document object
        """
        options = options or {}
        logger.info(f"Creating document from file: {file_path}")
        
        # Get file metadata
        file_metadata = await self.get_file_metadata(file_path)
        
        # Read file content
        try:
            with open(file_path, "rb") as f:
                raw_content = f.read()
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            raise
        
        # Determine document type
        extension = file_metadata["extension"].lower()
        document_type = DocumentType.UNKNOWN
        
        # Map extensions to document types
        ext_mapping = {
            ".md": DocumentType.MARKDOWN,
            ".markdown": DocumentType.MARKDOWN,
            ".pdf": DocumentType.PDF,
            ".html": DocumentType.HTML,
            ".htm": DocumentType.HTML,
            ".txt": DocumentType.TEXT,
            ".ipynb": DocumentType.JUPYTER,
            ".docx": DocumentType.WORD,
            ".doc": DocumentType.WORD
        }
        
        if extension in ext_mapping:
            document_type = ext_mapping[extension]
        else:
            # Assume it's code
            document_type = DocumentType.CODE
        
        # Create document metadata
        metadata = DocumentMetadata(
            title=options.get("title", file_metadata["name"]),
            description=options.get("description", ""),
            authors=[file_metadata.get("last_commit_author", "Unknown")],
            created_at=datetime.fromisoformat(file_metadata["created"]),
            updated_at=datetime.fromisoformat(file_metadata["modified"]),
            document_type=document_type,
            status=options.get("status", "draft"),
            version=options.get("version", "1.0.0"),
            source_path=file_path,
            custom_metadata={
                **file_metadata,
                **options.get("custom_metadata", {})
            }
        )
        
        # Create document
        document = Document(
            id=options.get("id", os.path.relpath(file_path, self.base_path).replace(os.sep, "_")),
            metadata=metadata,
            raw_content=raw_content
        )
        
        # Try to decode content for text files
        if document_type in [DocumentType.MARKDOWN, DocumentType.HTML, DocumentType.TEXT, DocumentType.CODE]:
            try:
                document.content = raw_content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    document.content = raw_content.decode("latin-1")
                except Exception:
                    document.content = ""
        
        return document
    
    async def process_repository(self, repo_path: str, 
                              pipeline_processor, 
                              extensions: Optional[List[str]] = None,
                              options: Dict[str, Any] = None) -> List[Document]:
        """
        Process an entire repository through the document pipeline.
        
        Args:
            repo_path: Path to the repository
            pipeline_processor: Document processing pipeline
            extensions: List of file extensions to include (optional)
            options: Processing options
            
        Returns:
            List of processed documents
        """
        options = options or {}
        logger.info(f"Processing repository: {repo_path}")
        
        # Scan repository for files
        file_paths = await self.scan_repository(repo_path, extensions)
        
        # Process files in batches
        batch_size = options.get("batch_size", 10)
        documents = []
        
        for i in range(0, len(file_paths), batch_size):
            batch = file_paths[i:i+batch_size]
            logger.info(f"Processing batch {i//batch_size + 1}/{(len(file_paths)-1)//batch_size + 1} ({len(batch)} files)")
            
            # Process files in parallel
            tasks = []
            for file_path in batch:
                task = asyncio.create_task(self._process_file(file_path, pipeline_processor, options))
                tasks.append(task)
            
            # Wait for all tasks to complete
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            for result in batch_results:
                if isinstance(result, Exception):
                    logger.error(f"Error processing file: {result}")
                else:
                    documents.append(result)
        
        logger.info(f"Repository processing complete: {len(documents)} documents processed")
        return documents
    
    async def _process_file(self, file_path: str, pipeline_processor, options: Dict[str, Any]) -> Document:
        """
        Process a single file through the document pipeline.
        
        Args:
            file_path: Path to the file
            pipeline_processor: Document processing pipeline
            options: Processing options
            
        Returns:
            Processed document
        """
        try:
            # Create document from file
            document = await self.create_document_from_file(file_path, options)
            
            # Process document
            processed_document = await pipeline_processor.process_document(document)
            
            return processed_document
            
        except Exception as e:
            logger.error(f"Error processing file {file_path}: {e}")
            raise