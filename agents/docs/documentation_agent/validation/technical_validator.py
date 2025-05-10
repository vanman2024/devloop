"""
Technical Validator - Validates document technical correctness

This module implements the TechnicalValidator which checks documents
for technical correctness, such as code snippets, API references,
and technical terminology.
"""

import os
import re
import logging
import asyncio
from typing import Dict, List, Any, Optional, Set

# Import validation models
from ..models.document_model import Document
from ..models.validation_result import ValidationIssue, ValidationSeverity, ValidationType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TechnicalValidator:
    """
    Technical validator for checking document technical correctness.
    
    Validates code snippets, API references, command syntax, and technical
    terminology to ensure documents are technically accurate.
    """
    
    def __init__(self, config: Dict[str, Any], knowledge_graph=None, vector_store=None):
        """
        Initialize the technical validator.
        
        Args:
            config: Configuration dictionary
            knowledge_graph: Knowledge graph connector
            vector_store: Vector store connector
        """
        self.config = config
        self.kg = knowledge_graph
        self.vector_store = vector_store
        
        # Extract validator-specific configuration
        validator_config = config.get("validators", {}).get("technical", {})
        
        # Configure validation options
        self.check_code_blocks = validator_config.get("check_code_blocks", True)
        self.check_api_references = validator_config.get("check_api_references", True)
        self.check_commands = validator_config.get("check_commands", True)
        self.check_urls = validator_config.get("check_urls", True)
        
        # Initialize reference data
        self.api_references = {}
        self.technical_terms = {}
        self.code_language_patterns = {}
        
        # Load reference data if available
        self._load_reference_data()
        
        logger.info("Technical validator initialized")
    
    def configure(self, config: Dict[str, Any]):
        """
        Update validator configuration.
        
        Args:
            config: Configuration dictionary
        """
        if "check_code_blocks" in config:
            self.check_code_blocks = config["check_code_blocks"]
        if "check_api_references" in config:
            self.check_api_references = config["check_api_references"]
        if "check_commands" in config:
            self.check_commands = config["check_commands"]
        if "check_urls" in config:
            self.check_urls = config["check_urls"]
        
        logger.info("Technical validator configuration updated")
    
    async def validate(self, document: Document) -> List[ValidationIssue]:
        """
        Validate document technical correctness.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        logger.info(f"Validating technical correctness for document: {document.id}")
        
        issues = []
        validation_tasks = []
        
        # Check code blocks
        if self.check_code_blocks:
            validation_tasks.append(self._validate_code_blocks(document))
        
        # Check API references
        if self.check_api_references:
            validation_tasks.append(self._validate_api_references(document))
        
        # Check command syntax
        if self.check_commands:
            validation_tasks.append(self._validate_commands(document))
        
        # Check URLs
        if self.check_urls:
            validation_tasks.append(self._validate_urls(document))
        
        # Run validation tasks in parallel
        task_results = await asyncio.gather(*validation_tasks)
        
        # Collect issues from all tasks
        for result in task_results:
            issues.extend(result)
        
        logger.info(f"Technical validation completed for document {document.id}: {len(issues)} issues found")
        return issues
    
    async def _validate_code_blocks(self, document: Document) -> List[ValidationIssue]:
        """
        Validate code blocks in the document.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Extract code blocks using markdown pattern ```language ... ```
        code_block_pattern = r"```(\w+)?\s*\n(.*?)\n```"
        code_blocks = re.findall(code_block_pattern, content, re.DOTALL)
        
        logger.info(f"Found {len(code_blocks)} code blocks in document {document.id}")
        
        for i, (language, code) in enumerate(code_blocks):
            block_issues = []
            
            # Check if language is specified
            if not language:
                block_issues.append(ValidationIssue(
                    id=f"code-block-no-language-{i}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.WARNING,
                    message="Code block without language specification",
                    location=f"Code block {i+1}",
                    context=f"```\n{code[:100]}{'...' if len(code) > 100 else ''}\n```",
                    suggestions=["Specify language for syntax highlighting", 
                                "Add language identifier after opening backticks"]
                ))
            
            # Check for common syntax errors based on language
            if language:
                syntax_issues = await self._check_code_syntax(language, code, i)
                block_issues.extend(syntax_issues)
            
            # Check for missing imports or dependencies
            if language in ["python", "javascript", "typescript", "java"]:
                import_issues = await self._check_missing_imports(language, code, i)
                block_issues.extend(import_issues)
            
            # Check for indentation consistency
            indent_issues = self._check_indentation_consistency(code, i)
            block_issues.extend(indent_issues)
            
            issues.extend(block_issues)
        
        # Check for inline code consistency
        inline_code_pattern = r"`([^`]+)`"
        inline_codes = re.findall(inline_code_pattern, content)
        
        # Check if code elements mentioned in text also appear in code blocks
        if inline_codes and code_blocks:
            code_block_content = " ".join(code for _, code in code_blocks)
            
            for i, code in enumerate(inline_codes):
                # Skip short inline codes (likely not references)
                if len(code) < a:
                    continue
                
                if code not in code_block_content and not any(c in code for c in "{}[]():;,"):
                    issues.append(ValidationIssue(
                        id=f"inline-code-missing-{i}",
                        type=ValidationType.TECHNICAL,
                        severity=ValidationSeverity.INFO,
                        message=f"Inline code '{code}' not found in code blocks",
                        location=f"Inline code reference",
                        context=f"...`{code}`...",
                        suggestions=["Ensure inline code references match code blocks",
                                    "Check for spelling or capitalization differences"]
                    ))
        
        return issues
    
    async def _check_code_syntax(self, language: str, code: str, block_index: int) -> List[ValidationIssue]:
        """
        Check code syntax based on language.
        
        Args:
            language: Programming language
            code: Code to check
            block_index: Index of the code block
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Basic syntax checks based on language
        if language == "python":
            # Check for common Python syntax errors
            if ":" in code and not re.search(r":\s*\n", code):
                issues.append(ValidationIssue(
                    id=f"python-missing-newline-{block_index}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.ERROR,
                    message="Missing newline after colon in Python code",
                    location=f"Code block {block_index+1}",
                    context=code,
                    suggestions=["Add newline after colon in control structures or function definitions"]
                ))
            
            # Check for unbalanced parentheses, brackets, braces
            if code.count("(") != code.count(")"):
                issues.append(ValidationIssue(
                    id=f"python-unbalanced-parentheses-{block_index}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.ERROR,
                    message="Unbalanced parentheses in Python code",
                    location=f"Code block {block_index+1}",
                    context=code,
                    suggestions=["Check for missing opening or closing parentheses"]
                ))
            
            if code.count("[") != code.count("]"):
                issues.append(ValidationIssue(
                    id=f"python-unbalanced-brackets-{block_index}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.ERROR,
                    message="Unbalanced brackets in Python code",
                    location=f"Code block {block_index+1}",
                    context=code,
                    suggestions=["Check for missing opening or closing brackets"]
                ))
            
            if code.count("{") != code.count("}"):
                issues.append(ValidationIssue(
                    id=f"python-unbalanced-braces-{block_index}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.ERROR,
                    message="Unbalanced braces in Python code",
                    location=f"Code block {block_index+1}",
                    context=code,
                    suggestions=["Check for missing opening or closing braces"]
                ))
        
        elif language in ["javascript", "typescript", "js", "ts"]:
            # Check for common JavaScript/TypeScript syntax errors
            if re.search(r"[^=!<>]=[^=]", code) and not re.search(r":\s*[^=]+=", code):
                # Assignment without declaration (var, let, const)
                declaration_keywords = ["var", "let", "const"]
                lines = code.splitlines()
                for line_num, line in enumerate(lines):
                    if re.search(r"[^=!<>]=[^=]", line) and not any(kw in line for kw in declaration_keywords) and not ":" in line:
                        issues.append(ValidationIssue(
                            id=f"js-assignment-without-declaration-{block_index}-{line_num}",
                            type=ValidationType.TECHNICAL,
                            severity=ValidationSeverity.WARNING,
                            message="Assignment without variable declaration",
                            location=f"Code block {block_index+1}, line {line_num+1}",
                            context=line,
                            suggestions=["Use 'let', 'var', or 'const' for variable declarations"]
                        ))
            
            # Check for missing semicolons (if not using ASI style)
            lines = code.splitlines()
            for line_num, line in enumerate(lines):
                # Skip empty lines, comments, and lines ending with brackets
                if not line.strip() or line.strip().startswith("//") or line.strip().endswith(("{", "}", "[", "]", "(", ")", ":")):
                    continue
                
                if not line.strip().endswith(";") and not line.strip().endswith(","):
                    # Maybe this codebase doesn't use semicolons, so make it just info
                    issues.append(ValidationIssue(
                        id=f"js-missing-semicolon-{block_index}-{line_num}",
                        type=ValidationType.TECHNICAL,
                        severity=ValidationSeverity.INFO,
                        message="Missing semicolon at end of line",
                        location=f"Code block {block_index+1}, line {line_num+1}",
                        context=line,
                        suggestions=["Add semicolon at the end of statements if the codebase uses them"]
                    ))
            
            # Check for unbalanced brackets
            if code.count("(") != code.count(")"):
                issues.append(ValidationIssue(
                    id=f"js-unbalanced-parentheses-{block_index}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.ERROR,
                    message="Unbalanced parentheses in JavaScript/TypeScript code",
                    location=f"Code block {block_index+1}",
                    context=code,
                    suggestions=["Check for missing opening or closing parentheses"]
                ))
            
            if code.count("[") != code.count("]"):
                issues.append(ValidationIssue(
                    id=f"js-unbalanced-brackets-{block_index}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.ERROR,
                    message="Unbalanced brackets in JavaScript/TypeScript code",
                    location=f"Code block {block_index+1}",
                    context=code,
                    suggestions=["Check for missing opening or closing brackets"]
                ))
            
            if code.count("{") != code.count("}"):
                issues.append(ValidationIssue(
                    id=f"js-unbalanced-braces-{block_index}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.ERROR,
                    message="Unbalanced braces in JavaScript/TypeScript code",
                    location=f"Code block {block_index+1}",
                    context=code,
                    suggestions=["Check for missing opening or closing braces"]
                ))
        
        # Add other language checks as needed
        
        return issues
    
    async def _check_missing_imports(self, language: str, code: str, block_index: int) -> List[ValidationIssue]:
        """
        Check for missing imports or dependencies in code.
        
        Args:
            language: Programming language
            code: Code to check
            block_index: Index of the code block
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Extract potential module/library references
        if language == "python":
            # Get imported modules
            import_pattern = r"(?:from|import)\s+([a-zA-Z0-9_.]+)"
            imports = set(re.findall(import_pattern, code))
            
            # Get referenced modules (potential unimported modules)
            # This is a simplified approach - a real implementation would use AST parsing
            lines = [line for line in code.splitlines() if not line.strip().startswith("#")]
            code_without_imports = "\n".join([line for line in lines if not re.match(r"^\s*(?:from|import)", line)])
            
            # Look for potential module references with dot notation (module.attribute)
            ref_pattern = r"([a-zA-Z][a-zA-Z0-9_]*)\.[a-zA-Z][a-zA-Z0-9_]*"
            refs = set(re.findall(ref_pattern, code_without_imports))
            
            # Check for potential missing imports (references not in imports)
            # Exclude common built-ins
            builtins = {"self", "cls", "super", "dict", "list", "set", "str", "int", "float", "bool"}
            potential_missing = refs - imports - builtins
            
            for module in potential_missing:
                # Skip common object properties
                if module in ["sort", "append", "extend", "items", "keys", "values"]:
                    continue
                
                issues.append(ValidationIssue(
                    id=f"python-potential-missing-import-{block_index}-{module}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.WARNING,
                    message=f"Potential missing import for module: {module}",
                    location=f"Code block {block_index+1}",
                    context=f"References to {module}.* found without corresponding import",
                    suggestions=[f"Add 'import {module}' or 'from ... import {module}'", 
                                "Check if this is a variable defined elsewhere in the code"]
                ))
        
        elif language in ["javascript", "typescript", "js", "ts"]:
            # Get imported modules
            import_pattern = r"(?:import|require)\s+(?:[\w{},\s*]+\s+from\s+)?['\"]([^'\"]+)['\"]"
            imports = set(re.findall(import_pattern, code))
            
            # For ECMAScript modules, also check destructuring imports
            destructure_pattern = r"import\s+{([^}]+)}\s+from"
            destructure_matches = re.findall(destructure_pattern, code)
            destructured_modules = set()
            for match in destructure_matches:
                # Split by comma and clean up whitespace
                items = [item.strip() for item in match.split(",")]
                destructured_modules.update(items)
            
            # Get referenced modules or constants that might need importing
            # This is a simplified approach
            lines = [line for line in code.splitlines() if not line.strip().startswith("//")]
            code_without_imports = "\n".join([line for line in lines if not re.search(r"(?:import|require)\s+", line)])
            
            # Look for potential imported constants/functions with TitleCase or ALL_CAPS (common convention)
            ref_pattern = r"([A-Z][a-zA-Z0-9_]*|[A-Z][A-Z0-9_]+)\b"
            refs = set(re.findall(ref_pattern, code_without_imports))
            
            # Check for potential references to libraries
            # Exclude common JavaScript globals and React hooks
            js_globals = {"Array", "Boolean", "Date", "Error", "Function", "JSON", "Map", "Math", "Number", 
                         "Object", "Promise", "RegExp", "Set", "String", "Symbol", "setTimeout", "setInterval",
                         "React", "Component", "useState", "useEffect", "useContext", "useReducer", "useMemo"}
            potential_missing = refs - destructured_modules - js_globals
            
            for ref in potential_missing:
                # Skip common identifiers and HTML tags
                if ref in ["DIV", "SPAN", "ID", "URL", "URI", "API", "HTTP", "TYPE", "KEY", "REF", "TRUE", "FALSE"] or len(ref) <= 2:
                    continue
                
                issues.append(ValidationIssue(
                    id=f"js-potential-missing-import-{block_index}-{ref}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.INFO,
                    message=f"Potential missing import for: {ref}",
                    location=f"Code block {block_index+1}",
                    context=f"References to {ref} found without corresponding import",
                    suggestions=["Check if this should be imported from a module", 
                                "Verify if this is a custom type or constant defined elsewhere"]
                ))
        
        return issues
    
    def _check_indentation_consistency(self, code: str, block_index: int) -> List[ValidationIssue]:
        """
        Check for indentation consistency in code.
        
        Args:
            code: Code to check
            block_index: Index of the code block
            
        Returns:
            List of validation issues
        """
        issues = []
        lines = code.splitlines()
        
        # Skip empty or very short code blocks
        if len(lines) < 3:
            return issues
        
        # Determine indentation type (spaces or tabs)
        space_indents = 0
        tab_indents = 0
        indent_sizes = []
        
        for line in lines:
            if not line.strip():
                continue
                
            # Count leading spaces and tabs
            leading_spaces = len(line) - len(line.lstrip(' '))
            leading_tabs = len(line) - len(line.lstrip('\t'))
            
            if leading_spaces > 0:
                space_indents += 1
                if leading_spaces > 0:
                    indent_sizes.append(leading_spaces)
            
            if leading_tabs > 0:
                tab_indents += 1
        
        # Check for mixed indentation
        if space_indents > 0 and tab_indents > 0:
            issues.append(ValidationIssue(
                id=f"mixed-indentation-{block_index}",
                type=ValidationType.TECHNICAL,
                severity=ValidationSeverity.WARNING,
                message="Mixed space and tab indentation",
                location=f"Code block {block_index+1}",
                context="Code block uses both spaces and tabs for indentation",
                suggestions=["Use consistent indentation throughout code", 
                            "Choose either spaces or tabs for indentation"]
            ))
        
        # Check for inconsistent indentation size
        if len(indent_sizes) >= 3:  # Need at least a few indented lines to check
            # Get common indent sizes (e.g., 2, 4, 8)
            common_sizes = {}
            for size in indent_sizes:
                if size % 2 == 0 and size <= 8:  # Only consider even sizes up to 8
                    common_sizes[size] = common_sizes.get(size, 0) + 1
            
            if len(common_sizes) > 1:
                # If there are multiple common indent sizes, check if any is dominant
                total_indents = sum(common_sizes.values())
                for size, count in common_sizes.items():
                    if count / total_indents < 0.8:  # Less than 80% consistent
                        issues.append(ValidationIssue(
                            id=f"inconsistent-indent-size-{block_index}",
                            type=ValidationType.TECHNICAL,
                            severity=ValidationSeverity.INFO,
                            message="Inconsistent indentation size",
                            location=f"Code block {block_index+1}",
                            context="Code block uses different indentation sizes",
                            suggestions=["Use consistent indentation size throughout code", 
                                        "Common sizes are 2 or 4 spaces per indentation level"]
                        ))
                        break
        
        return issues
    
    async def _validate_api_references(self, document: Document) -> List[ValidationIssue]:
        """
        Validate API references in the document.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Check for API references in various formats
        api_patterns = [
            # REST API endpoints
            (r"(GET|POST|PUT|DELETE|PATCH)\s+(/[a-zA-Z0-9_/-]+)", "REST endpoint"),
            # Function calls
            (r"([a-zA-Z][a-zA-Z0-9_]*)\((.*?)\)", "Function call"),
            # Class methods
            (r"([a-zA-Z][a-zA-Z0-9_]*)\.[a-zA-Z][a-zA-Z0-9_]*\((.*?)\)", "Method call")
        ]
        
        for pattern, ref_type in api_patterns:
            references = re.findall(pattern, content)
            
            for ref in references:
                # Skip references inside code blocks
                code_blocks = re.findall(r"```.*?```", content, re.DOTALL)
                in_code_block = any(str(ref) in block for block in code_blocks)
                
                if in_code_block:
                    continue
                
                # For now, just check if API reference seems deprecated
                if self._is_deprecated_api(ref, ref_type):
                    issues.append(ValidationIssue(
                        id=f"deprecated-api-{ref}",
                        type=ValidationType.TECHNICAL,
                        severity=ValidationSeverity.WARNING,
                        message=f"Potentially deprecated API reference: {ref}",
                        location="API reference",
                        context=f"...{ref}...",
                        suggestions=["Check if this API is still current", 
                                    "Update to the latest API version if needed"]
                    ))
        
        return issues
    
    def _is_deprecated_api(self, api_ref, ref_type):
        """Check if an API reference is deprecated"""
        # For now, this is a stub - in a real implementation, this would check
        # against a database of deprecated APIs
        
        # Example check
        if ref_type == "REST endpoint" and "v1" in str(api_ref):
            return True
            
        return False
    
    async def _validate_commands(self, document: Document) -> List[ValidationIssue]:
        """
        Validate commands in the document.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Look for command-line instructions (e.g., bash commands)
        # Pattern matches lines that start with $ or > followed by a command
        command_pattern = r"(?:^|\n)(?:\$|\>) ([^\n]+)"
        commands = re.findall(command_pattern, content)
        
        logger.info(f"Found {len(commands)} commands in document {document.id}")
        
        for i, command in enumerate(commands):
            command = command.strip()
            
            # Check for common command errors
            if command.startswith("git "):
                git_issues = self._check_git_command(command, i)
                issues.extend(git_issues)
            
            elif command.startswith("npm ") or command.startswith("yarn "):
                package_issues = self._check_package_command(command, i)
                issues.extend(package_issues)
            
            elif command.startswith("python ") or command.startswith("python3 "):
                python_issues = self._check_python_command(command, i)
                issues.extend(python_issues)
            
            # Check if command has missing quotes
            if (" -" in command or " --" in command) and (" '" not in command and ' "' not in command):
                # Some commands might need quotes but don't have them
                # This is a heuristic and might produce false positives
                words = command.split()
                for j, word in enumerate(words):
                    if j > 0 and (word.startswith("-") or word.startswith("--")) and len(words) > j + 1:
                        next_word = words[j+1]
                        if " " in next_word or ":" in next_word or "," in next_word:
                            issues.append(ValidationIssue(
                                id=f"command-missing-quotes-{i}",
                                type=ValidationType.TECHNICAL,
                                severity=ValidationSeverity.WARNING,
                                message="Command parameter might need quotes",
                                location=f"Command {i+1}",
                                context=f"$ {command}",
                                suggestions=[f"Consider adding quotes around '{next_word}'", 
                                            "Check if command will work as written"]
                            ))
                            break
        
        return issues
    
    def _check_git_command(self, command, index):
        """Check a git command for common errors"""
        issues = []
        
        # Check for common git command errors
        if command.startswith("git commit") and "-m" in command and not re.search(r'-m\s+["\']', command):
            issues.append(ValidationIssue(
                id=f"git-commit-message-quotes-{index}",
                type=ValidationType.TECHNICAL,
                severity=ValidationSeverity.WARNING,
                message="Git commit message missing quotes",
                location=f"Command {index+1}",
                context=f"$ {command}",
                suggestions=["Add quotes around commit message", 
                            "Example: git commit -m \"Your message here\""]
            ))
        
        if command == "git merge" or command == "git push" or command == "git pull":
            issues.append(ValidationIssue(
                id=f"git-command-missing-args-{index}",
                type=ValidationType.TECHNICAL,
                severity=ValidationSeverity.WARNING,
                message="Git command missing required arguments",
                location=f"Command {index+1}",
                context=f"$ {command}",
                suggestions=["Specify branch name or remote", 
                            "Example: git push origin main"]
            ))
        
        return issues
    
    def _check_package_command(self, command, index):
        """Check an npm/yarn command for common errors"""
        issues = []
        
        # Check for common npm/yarn command errors
        if ("npm install" in command or "yarn add" in command) and "--save" in command:
            issues.append(ValidationIssue(
                id=f"npm-save-redundant-{index}",
                type=ValidationType.TECHNICAL,
                severity=ValidationSeverity.INFO,
                message="--save flag is redundant in npm install",
                location=f"Command {index+1}",
                context=f"$ {command}",
                suggestions=["--save is the default in npm 5+", 
                            "Remove --save flag for more concise command"]
            ))
        
        return issues
    
    def _check_python_command(self, command, index):
        """Check a Python command for common errors"""
        issues = []
        
        # Check for common Python command errors
        if "python" in command and ".py" not in command and "-c" not in command:
            issues.append(ValidationIssue(
                id=f"python-missing-script-{index}",
                type=ValidationType.TECHNICAL,
                severity=ValidationSeverity.WARNING,
                message="Python command missing script name",
                location=f"Command {index+1}",
                context=f"$ {command}",
                suggestions=["Specify Python script file", 
                            "Example: python script.py"]
            ))
        
        return issues
    
    async def _validate_urls(self, document: Document) -> List[ValidationIssue]:
        """
        Validate URLs in the document.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Find URLs in content
        url_pattern = r"https?://[^\s)>]+"
        urls = re.findall(url_pattern, content)
        
        logger.info(f"Found {len(urls)} URLs in document {document.id}")
        
        for i, url in enumerate(urls):
            # Check for malformed URLs
            if url.endswith(".") or url.endswith(",") or url.endswith(":"):
                issues.append(ValidationIssue(
                    id=f"malformed-url-{i}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.WARNING,
                    message="Potentially malformed URL",
                    location="URL reference",
                    context=url,
                    suggestions=["Check for punctuation marks at the end of the URL", 
                                "Ensure URL is properly formatted"]
                ))
            
            # Check for URLs without proper markdown or HTML formatting
            if url in content and f"[" not in content[max(0, content.find(url) - 30):content.find(url)]:
                issues.append(ValidationIssue(
                    id=f"raw-url-{i}",
                    type=ValidationType.TECHNICAL,
                    severity=ValidationSeverity.INFO,
                    message="Raw URL without link text",
                    location="URL reference",
                    context=url,
                    suggestions=["Consider using markdown link format: [link text](URL)", 
                                "Using descriptive link text improves readability"]
                ))
            
            # Check for old GitHub URLs
            if "github.com" in url and "/wiki/" not in url and "/blob/" not in url and "/tree/" not in url:
                if re.search(r"github\.com/[^/]+/[^/]+$", url):
                    # URL points to repo root without path - likely OK
                    pass
                else:
                    issues.append(ValidationIssue(
                        id=f"github-url-format-{i}",
                        type=ValidationType.TECHNICAL,
                        severity=ValidationSeverity.INFO,
                        message="GitHub URL might be missing path qualifier",
                        location="URL reference",
                        context=url,
                        suggestions=["For code links use /blob/, for directories use /tree/", 
                                    "Example: https://github.com/user/repo/blob/main/file.py"]
                    ))
        
        return issues
    
    def _load_reference_data(self):
        """Load reference data for validation"""
        # In a real implementation, this would load data from files or database
        
        # Example reference data for API checking
        self.api_references = {
            "deprecated": [
                "v1", "beta", "legacy", "old"
            ]
        }
        
        # Language detection patterns
        self.code_language_patterns = {
            "python": [
                r"import\s+[a-zA-Z0-9_]+",
                r"from\s+[a-zA-Z0-9_]+\s+import",
                r"def\s+[a-zA-Z0-9_]+\s*\(",
                r"class\s+[a-zA-Z0-9_]+\s*:"
            ],
            "javascript": [
                r"function\s+[a-zA-Z0-9_]+\s*\(",
                r"const\s+[a-zA-Z0-9_]+\s*=",
                r"let\s+[a-zA-Z0-9_]+\s*=",
                r"var\s+[a-zA-Z0-9_]+\s*=",
                r"import\s+.*\s+from\s+['\"]"
            ]
        }