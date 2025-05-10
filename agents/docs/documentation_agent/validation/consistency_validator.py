"""
Consistency Validator - Checks document consistency

This module implements the ConsistencyValidator which ensures that
documents are internally consistent and aligned with related documents.
"""

import os
import re
import logging
from typing import Dict, List, Any, Optional, Set, Tuple
import string

# Import validation models
from ..models.document_model import Document, DocumentType
from ..models.validation_result import ValidationIssue, ValidationSeverity, ValidationType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConsistencyValidator:
    """
    Consistency validator for checking document consistency.
    
    Validates that document content is internally consistent and aligned
    with related documents in the knowledge graph.
    """
    
    def __init__(self, config: Dict[str, Any], knowledge_graph=None, vector_store=None):
        """
        Initialize the consistency validator.
        
        Args:
            config: Configuration dictionary
            knowledge_graph: Knowledge graph connector
            vector_store: Vector store connector
        """
        self.config = config
        self.kg = knowledge_graph
        self.vector_store = vector_store
        
        # Extract validator-specific configuration
        validator_config = config.get("validators", {}).get("consistency", {})
        
        # Configure validation options
        self.check_internal_consistency = validator_config.get("check_internal_consistency", True)
        self.check_terminology = validator_config.get("check_terminology", True)
        self.check_cross_references = validator_config.get("check_cross_references", True)
        self.check_version_alignment = validator_config.get("check_version_alignment", True)
        
        logger.info("Consistency validator initialized")
    
    def configure(self, config: Dict[str, Any]):
        """
        Update validator configuration.
        
        Args:
            config: Configuration dictionary
        """
        if "check_internal_consistency" in config:
            self.check_internal_consistency = config["check_internal_consistency"]
        if "check_terminology" in config:
            self.check_terminology = config["check_terminology"]
        if "check_cross_references" in config:
            self.check_cross_references = config["check_cross_references"]
        if "check_version_alignment" in config:
            self.check_version_alignment = config["check_version_alignment"]
        
        logger.info("Consistency validator configuration updated")
    
    async def validate(self, document: Document) -> List[ValidationIssue]:
        """
        Validate document consistency.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        logger.info(f"Validating consistency for document: {document.id}")
        
        issues = []
        
        # Check internal consistency
        if self.check_internal_consistency:
            internal_issues = await self._validate_internal_consistency(document)
            issues.extend(internal_issues)
        
        # Check terminology consistency
        if self.check_terminology:
            terminology_issues = await self._validate_terminology(document)
            issues.extend(terminology_issues)
        
        # Check cross-references
        if self.check_cross_references:
            reference_issues = await self._validate_cross_references(document)
            issues.extend(reference_issues)
        
        # Check version alignment
        if self.check_version_alignment:
            version_issues = await self._validate_version_alignment(document)
            issues.extend(version_issues)
        
        logger.info(f"Consistency validation completed for document {document.id}: {len(issues)} issues found")
        return issues
    
    async def _validate_internal_consistency(self, document: Document) -> List[ValidationIssue]:
        """
        Validate internal consistency of document.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Check heading structure consistency
        heading_issues = self._check_heading_hierarchy(content)
        issues.extend(heading_issues)
        
        # Check list style consistency
        list_issues = self._check_list_consistency(content)
        issues.extend(list_issues)
        
        # Check code block style consistency
        code_issues = self._check_code_block_consistency(content)
        issues.extend(code_issues)
        
        # Check link format consistency
        link_issues = self._check_link_format_consistency(content)
        issues.extend(link_issues)
        
        return issues
    
    def _check_heading_hierarchy(self, content: str) -> List[ValidationIssue]:
        """
        Check that heading hierarchy is consistent.
        
        Args:
            content: Document content
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Extract headings with their levels
        heading_pattern = r"^(#+)\s+(.+)$"
        headings = []
        
        for i, line in enumerate(content.splitlines()):
            match = re.match(heading_pattern, line)
            if match:
                level = len(match.group(1))
                text = match.group(2).strip()
                headings.append((i + 1, level, text))
        
        if len(headings) < 2:
            return issues  # Not enough headings to check hierarchy
        
        # Check for skipped levels
        current_level = headings[0][1]
        for i in range(1, len(headings)):
            line_num, level, text = headings[i]
            
            # Headings should not skip levels (e.g., H1 -> H3)
            if level > current_level + 1:
                issues.append(ValidationIssue(
                    id=f"skipped-heading-level-{line_num}",
                    type=ValidationType.CONSISTENCY,
                    severity=ValidationSeverity.WARNING,
                    message=f"Skipped heading level (H{current_level} to H{level})",
                    location=f"Line {line_num}",
                    context=f"{'#' * level} {text}",
                    suggestions=[f"Add intermediate H{current_level + 1} heading", 
                                f"Change to H{current_level + 1} if appropriate"]
                ))
            
            current_level = level
        
        # Check for inconsistent capitalization in headings
        capitalization_styles = {}
        
        for line_num, level, text in headings:
            # Skip short headings
            if len(text) < 3:
                continue
                
            # Detect capitalization style
            if text[0].isupper() and all(not c.isupper() for c in text[1:]):
                style = "sentence"
            elif all(w[0].isupper() for w in text.split() if w and w[0].isalpha()):
                style = "title"
            elif text.isupper():
                style = "uppercase"
            else:
                style = "mixed"
            
            if level not in capitalization_styles:
                capitalization_styles[level] = {"style": style, "count": 1}
            elif capitalization_styles[level]["style"] == style:
                capitalization_styles[level]["count"] += 1
            else:
                # Inconsistent style for this level
                capitalization_styles[level]["count"] += 1
                
                # If we've seen at least 3 headings at this level and less than 70% are consistent
                if (capitalization_styles[level]["count"] >= 3 and 
                    capitalization_styles[level]["style"] != style):
                    
                    issues.append(ValidationIssue(
                        id=f"inconsistent-heading-style-{line_num}",
                        type=ValidationType.CONSISTENCY,
                        severity=ValidationSeverity.INFO,
                        message=f"Inconsistent heading capitalization style for H{level}",
                        location=f"Line {line_num}",
                        context=f"{'#' * level} {text}",
                        suggestions=["Use consistent capitalization style for headings", 
                                    f"Consider using {capitalization_styles[level]['style']} case"]
                    ))
                    # Only report once per level
                    capitalization_styles[level]["style"] = "reported"
        
        return issues
    
    def _check_list_consistency(self, content: str) -> List[ValidationIssue]:
        """
        Check that list formatting is consistent.
        
        Args:
            content: Document content
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Extract bullet lists
        bullet_pattern = r"^(\s*)([-*+])\s"
        bullet_lists = re.findall(bullet_pattern, content, re.MULTILINE)
        
        # Extract numbered lists
        number_pattern = r"^(\s*)(\d+)([.):])\s"
        number_lists = re.findall(number_pattern, content, re.MULTILINE)
        
        # Check bullet list consistency
        if bullet_lists:
            bullet_types = {}
            for indent, bullet in bullet_lists:
                indent_level = len(indent)
                if indent_level not in bullet_types:
                    bullet_types[indent_level] = {"type": bullet, "count": 1}
                elif bullet_types[indent_level]["type"] == bullet:
                    bullet_types[indent_level]["count"] += 1
                else:
                    # Inconsistent bullet type
                    bullet_types[indent_level]["count"] += 1
                    
                    # If we've seen at least 3 bullets and less than 70% are consistent
                    if (bullet_types[indent_level]["count"] >= 3 and 
                        bullet_types[indent_level]["type"] != bullet and
                        "reported" not in bullet_types[indent_level]):
                        
                        issues.append(ValidationIssue(
                            id=f"inconsistent-bullet-style-{indent_level}",
                            type=ValidationType.CONSISTENCY,
                            severity=ValidationSeverity.INFO,
                            message=f"Inconsistent bullet point style at indent level {indent_level}",
                            location="List formatting",
                            context=f"Using both '{bullet_types[indent_level]['type']}' and '{bullet}' bullets",
                            suggestions=["Use consistent bullet point style", 
                                        f"Consider standardizing on '{bullet_types[indent_level]['type']}' bullets"]
                        ))
                        
                        # Mark as reported to avoid duplicate issues
                        bullet_types[indent_level]["reported"] = True
        
        # Check numbered list consistency
        if number_lists:
            number_separators = {}
            for indent, number, separator in number_lists:
                indent_level = len(indent)
                if indent_level not in number_separators:
                    number_separators[indent_level] = {"separator": separator, "count": 1}
                elif number_separators[indent_level]["separator"] == separator:
                    number_separators[indent_level]["count"] += 1
                else:
                    # Inconsistent separator
                    number_separators[indent_level]["count"] += 1
                    
                    # If we've seen at least 3 numbered lists and less than 70% are consistent
                    if (number_separators[indent_level]["count"] >= 3 and 
                        number_separators[indent_level]["separator"] != separator and
                        "reported" not in number_separators[indent_level]):
                        
                        issues.append(ValidationIssue(
                            id=f"inconsistent-number-separator-{indent_level}",
                            type=ValidationType.CONSISTENCY,
                            severity=ValidationSeverity.INFO,
                            message=f"Inconsistent numbered list separator at indent level {indent_level}",
                            location="List formatting",
                            context=f"Using both '{number_separators[indent_level]['separator']}' and '{separator}' separators",
                            suggestions=["Use consistent separators for numbered lists", 
                                        f"Consider standardizing on '{number_separators[indent_level]['separator']}' separator"]
                        ))
                        
                        # Mark as reported to avoid duplicate issues
                        number_separators[indent_level]["reported"] = True
        
        # Check mixed list types
        if bullet_lists and number_lists:
            # This is just an informational note, not necessarily an issue
            # since mixed list types are valid in many documents
            for indent_level in set(len(indent) for indent, _ in bullet_lists).intersection(
                               set(len(indent) for indent, _, _ in number_lists)):
                issues.append(ValidationIssue(
                    id=f"mixed-list-types-{indent_level}",
                    type=ValidationType.CONSISTENCY,
                    severity=ValidationSeverity.INFO,
                    message=f"Mixed bullet and numbered lists at indent level {indent_level}",
                    location="List formatting",
                    context="Document uses both bullet and numbered lists at the same indent level",
                    suggestions=["Consider using consistent list types at the same level", 
                                "This is acceptable if semantically appropriate"]
                ))
        
        return issues
    
    def _check_code_block_consistency(self, content: str) -> List[ValidationIssue]:
        """
        Check that code block formatting is consistent.
        
        Args:
            content: Document content
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Extract code blocks
        code_block_pattern = r"```(\w+)?\s*\n(.*?)\n```"
        code_blocks = re.findall(code_block_pattern, content, re.DOTALL)
        
        if len(code_blocks) < 2:
            return issues  # Not enough code blocks to check consistency
        
        # Check language specification consistency
        has_language = [bool(lang) for lang, _ in code_blocks]
        
        if any(has_language) and not all(has_language):
            # Some code blocks have language specified, others don't
            issues.append(ValidationIssue(
                id="inconsistent-language-specification",
                type=ValidationType.CONSISTENCY,
                severity=ValidationSeverity.INFO,
                message="Inconsistent language specification in code blocks",
                location="Code blocks",
                context="Some code blocks have language specified, others don't",
                suggestions=["Specify language for all code blocks", 
                            "Remove language specification from all blocks if not needed"]
            ))
        
        # Check language consistency for similar blocks
        languages = {}
        for lang, code in code_blocks:
            if not lang:
                continue
                
            # Determine code type based on simple heuristics
            code_type = self._determine_code_type(code)
            
            if code_type not in languages:
                languages[code_type] = {"language": lang, "count": 1}
            elif languages[code_type]["language"] == lang:
                languages[code_type]["count"] += 1
            else:
                # Inconsistent language for this code type
                languages[code_type]["count"] += 1
                
                if "reported" not in languages[code_type]:
                    issues.append(ValidationIssue(
                        id=f"inconsistent-language-{code_type}",
                        type=ValidationType.CONSISTENCY,
                        severity=ValidationSeverity.INFO,
                        message=f"Inconsistent language specification for {code_type} code",
                        location="Code blocks",
                        context=f"Using both '{languages[code_type]['language']}' and '{lang}' for {code_type} code",
                        suggestions=["Use consistent language specifications", 
                                    f"Consider standardizing on '{languages[code_type]['language']}' for {code_type} code"]
                    ))
                    
                    # Mark as reported to avoid duplicate issues
                    languages[code_type]["reported"] = True
        
        return issues
    
    def _determine_code_type(self, code: str) -> str:
        """Determine code type based on content patterns"""
        # Simple heuristics to categorize code blocks
        if re.search(r"import\s+|from\s+\w+\s+import", code):
            return "python"
        elif re.search(r"function\s+\w+\s*\(|const\s+\w+\s*=|let\s+\w+\s*=", code):
            return "javascript"
        elif re.search(r"<\w+>.*?</\w+>|<\w+.*?/>", code):
            return "markup"
        elif re.search(r"\{\s*\"", code):
            return "json"
        elif re.search(r"curl\s+-[X]", code):
            return "shell"
        else:
            return "generic"
    
    def _check_link_format_consistency(self, content: str) -> List[ValidationIssue]:
        """
        Check that link formatting is consistent.
        
        Args:
            content: Document content
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Extract markdown links [text](url)
        md_links = re.findall(r"\[(.+?)\]\((.+?)\)", content)
        
        # Extract HTML links <a href="url">text</a>
        html_links = re.findall(r"<a\s+href=[\"'](.+?)[\"'].*?>(.+?)</a>", content)
        
        # Extract raw URLs
        raw_urls = re.findall(r"(?<!\]\()https?://[^\s)>]+", content)
        
        # Count link types
        md_count = len(md_links)
        html_count = len(html_links)
        raw_count = len(raw_urls)
        
        total_links = md_count + html_count + raw_count
        if total_links < 3:
            return issues  # Not enough links to check consistency
        
        # Check for mixed link styles
        styles_used = []
        if md_count > 0:
            styles_used.append("Markdown")
        if html_count > 0:
            styles_used.append("HTML")
        if raw_count > 0:
            styles_used.append("raw URL")
        
        if len(styles_used) > 1:
            # There's a mix of link styles
            primary_style = "Markdown"  # Default recommended style
            if html_count > md_count and html_count > raw_count:
                primary_style = "HTML"
            
            # Don't flag if raw URLs are a small minority (could be in code blocks)
            if raw_count / total_links < 0.2 and len(styles_used) == 2 and "raw URL" in styles_used:
                return issues
            
            issues.append(ValidationIssue(
                id="mixed-link-styles",
                type=ValidationType.CONSISTENCY,
                severity=ValidationSeverity.INFO,
                message=f"Mixed link styles: {', '.join(styles_used)}",
                location="Link formatting",
                context=f"Document uses multiple link styles",
                suggestions=[f"Consider standardizing on {primary_style} links", 
                            "Convert raw URLs to formatted links"]
            ))
        
        return issues
    
    async def _validate_terminology(self, document: Document) -> List[ValidationIssue]:
        """
        Validate terminology consistency.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Extract potential term variants
        term_variants = self._find_term_variants(content)
        
        for base_term, variants in term_variants.items():
            if len(variants) > 1:
                # There are multiple variants of this term
                # Count occurrences of each variant
                variant_counts = {}
                for variant in variants:
                    pattern = r'\b' + re.escape(variant) + r'\b'
                    count = len(re.findall(pattern, content))
                    variant_counts[variant] = count
                
                # Determine the most common variant
                most_common = max(variant_counts.items(), key=lambda x: x[1])
                
                # If there's no clear winner, prefer the simplest form
                if len(variants) > 2 and len(set(variant_counts.values())) > 1:
                    issues.append(ValidationIssue(
                        id=f"inconsistent-terminology-{base_term}",
                        type=ValidationType.CONSISTENCY,
                        severity=ValidationSeverity.INFO,
                        message=f"Inconsistent terminology: multiple variants of '{base_term}'",
                        location="Terminology",
                        context=f"Variants found: {', '.join(variants)}",
                        suggestions=[f"Standardize on '{most_common[0]}'", 
                                    "Use consistent terminology throughout the document"]
                    ))
        
        # Check for inconsistent capitalization of technical terms
        cap_inconsistencies = self._find_capitalization_inconsistencies(content)
        
        for term, variants in cap_inconsistencies.items():
            if len(variants) > 1:
                issues.append(ValidationIssue(
                    id=f"inconsistent-capitalization-{term}",
                    type=ValidationType.CONSISTENCY,
                    severity=ValidationSeverity.INFO,
                    message=f"Inconsistent capitalization of technical term",
                    location="Terminology",
                    context=f"Variants found: {', '.join(variants)}",
                    suggestions=["Use consistent capitalization for technical terms", 
                                "Follow official capitalization if available"]
                ))
        
        return issues
    
    def _find_term_variants(self, content: str) -> Dict[str, Set[str]]:
        """
        Find variants of the same term in content.
        
        Args:
            content: Document content
            
        Returns:
            Dictionary mapping base terms to sets of variants
        """
        # Extract potential technical terms (words with specific patterns)
        tech_term_pattern = r'\b([A-Z][a-z]+[A-Z][a-zA-Z]*|[a-z]+[-_][a-z]+)\b'
        tech_terms = re.findall(tech_term_pattern, content)
        
        # Extract multi-word terms from headings
        heading_pattern = r'^#+\s+(.+)$'
        headings = re.findall(heading_pattern, content, re.MULTILINE)
        heading_terms = []
        for heading in headings:
            # Extract 2-3 word phrases that might be technical terms
            heading_terms.extend(re.findall(r'\b([A-Z][a-z]+(\s+[a-z]+){1,2})\b', heading))
        
        # Normalize terms and group variants
        term_variants = {}
        
        # Process tech terms
        for term in tech_terms:
            # Skip short terms
            if len(term) < 4:
                continue
                
            # Normalize: remove case, convert separators
            norm_term = term.lower().replace('-', '_')
            
            if norm_term not in term_variants:
                term_variants[norm_term] = {term}
            else:
                term_variants[norm_term].add(term)
        
        # Process heading terms
        for term_tuple in heading_terms:
            term = term_tuple[0]  # Extract the term from the tuple
            # Skip short terms
            if len(term) < 4:
                continue
                
            # Normalize: remove case
            norm_term = term.lower()
            
            if norm_term not in term_variants:
                term_variants[norm_term] = {term}
            else:
                term_variants[norm_term].add(term)
        
        # Filter out non-variants (terms that only appear in one form)
        return {k: v for k, v in term_variants.items() if len(v) > 1}
    
    def _find_capitalization_inconsistencies(self, content: str) -> Dict[str, Set[str]]:
        """
        Find technical terms with inconsistent capitalization.
        
        Args:
            content: Document content
            
        Returns:
            Dictionary mapping terms to sets of capitalization variants
        """
        # Common technical terms that often have capitalization issues
        tech_terms = [
            "javascript", "typescript", "python", "java", "api", "rest", "json", "xml", "html", 
            "css", "graphql", "http", "url", "uri", "npm", "webpack", "docker", "kubernetes",
            "devops", "github", "gitlab", "azure", "aws", "gcp", "sql", "nosql", "mongodb",
            "postgresql", "mysql", "redis", "kafka", "react", "angular", "vue", "node.js"
        ]
        
        # Find capitalization variants
        cap_variants = {}
        
        for term in tech_terms:
            variants = set()
            
            # Find all capitalization variants
            pattern = r'\b' + re.escape(term) + r'\b'
            matches = re.findall(pattern, content, re.IGNORECASE)
            
            for match in matches:
                variants.add(match)
            
            if len(variants) > 1:
                cap_variants[term] = variants
        
        return cap_variants
    
    async def _validate_cross_references(self, document: Document) -> List[ValidationIssue]:
        """
        Validate cross-references between documents.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Skip if no knowledge graph access
        if not self.kg:
            return issues
        
        # Get document relationships
        relationships = document.relationships
        
        # Check if references exist
        for rel in relationships:
            # Skip non-document references
            if rel.entity_type != "document":
                continue
            
            # Check if referenced document exists
            referenced_doc = await self.kg.get_document(rel.entity_id)
            if not referenced_doc:
                issues.append(ValidationIssue(
                    id=f"missing-reference-{rel.entity_id}",
                    type=ValidationType.CONSISTENCY,
                    severity=ValidationSeverity.WARNING,
                    message=f"Referenced document not found",
                    location="Document references",
                    context=f"Reference to non-existent document ID: {rel.entity_id}",
                    suggestions=["Update reference to point to an existing document", 
                                "Remove reference if document was deleted"]
                ))
                continue
            
            # Check if reference is bidirectional
            if rel.bidirectional:
                # Check if target document references back
                backward_reference = False
                for back_rel in referenced_doc.relationships:
                    if back_rel.entity_id == document.id:
                        backward_reference = True
                        break
                
                if not backward_reference:
                    issues.append(ValidationIssue(
                        id=f"missing-backward-reference-{rel.entity_id}",
                        type=ValidationType.CONSISTENCY,
                        severity=ValidationSeverity.INFO,
                        message=f"Missing backward reference",
                        location="Document references",
                        context=f"Bidirectional relationship with {referenced_doc.metadata.title} is not reciprocated",
                        suggestions=["Add backward reference from referenced document", 
                                    "Set bidirectional flag to false if one-way reference is intended"]
                    ))
        
        # Check for link consistency in content
        content = document.content
        
        # Extract markdown links
        link_pattern = r"\[(.+?)\]\((.+?)\)"
        links = re.findall(link_pattern, content)
        
        for link_text, link_url in links:
            # Check if link is internal (to another document)
            if link_url.startswith('/') or link_url.startswith('./') or link_url.startswith('../'):
                # This is a relative link to another document
                # In a real implementation, would resolve the link and verify the document exists
                # For now, just check if it has a file extension
                if not re.search(r"\.\w+$", link_url) and not link_url.endswith('/'):
                    issues.append(ValidationIssue(
                        id=f"malformed-internal-link-{link_url}",
                        type=ValidationType.CONSISTENCY,
                        severity=ValidationSeverity.WARNING,
                        message=f"Potentially malformed internal link",
                        location="Internal link",
                        context=f"[{link_text}]({link_url})",
                        suggestions=["Check if the link path is correct", 
                                    "Ensure linked document exists"]
                    ))
        
        return issues
    
    async def _validate_version_alignment(self, document: Document) -> List[ValidationIssue]:
        """
        Validate version alignment between documents.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Skip if no knowledge graph access
        if not self.kg:
            return issues
        
        # Get document version
        doc_version = document.metadata.version
        if not doc_version:
            return issues  # No version to check
        
        try:
            # Parse version using simple semantic versioning (major.minor.patch)
            version_parts = doc_version.split('.')
            if len(version_parts) < 2:
                return issues  # Not enough version components
                
            major_version = version_parts[0]
            minor_version = version_parts[1]
            
            # Get related documents (documents and extends relationships)
            related_docs = []
            for rel in document.relationships:
                if rel.entity_type == "document" and rel.relationship_type in ["documents", "extends"]:
                    rel_doc = await self.kg.get_document(rel.entity_id)
                    if rel_doc:
                        related_docs.append(rel_doc)
            
            # Check version alignment with related documents
            for rel_doc in related_docs:
                rel_version = rel_doc.metadata.version
                if not rel_version:
                    continue
                    
                # Parse related document version
                rel_version_parts = rel_version.split('.')
                if len(rel_version_parts) < 2:
                    continue
                    
                rel_major = rel_version_parts[0]
                rel_minor = rel_version_parts[1]
                
                # Check for version mismatches
                if rel_major != major_version:
                    issues.append(ValidationIssue(
                        id=f"major-version-mismatch-{rel_doc.id}",
                        type=ValidationType.CONSISTENCY,
                        severity=ValidationSeverity.WARNING,
                        message=f"Major version mismatch with related document",
                        location="Document versions",
                        context=f"This document (v{doc_version}) relates to {rel_doc.metadata.title} (v{rel_version})",
                        suggestions=["Update versions to ensure consistency", 
                                    "Review if documents still correctly relate to each other"]
                    ))
                elif rel_minor != minor_version:
                    issues.append(ValidationIssue(
                        id=f"minor-version-mismatch-{rel_doc.id}",
                        type=ValidationType.CONSISTENCY,
                        severity=ValidationSeverity.INFO,
                        message=f"Minor version mismatch with related document",
                        location="Document versions",
                        context=f"This document (v{doc_version}) relates to {rel_doc.metadata.title} (v{rel_version})",
                        suggestions=["Consider updating versions for consistency", 
                                    "Check if minor changes affect document relationships"]
                    ))
        
        except Exception as e:
            logger.error(f"Error validating version alignment: {e}")
        
        return issues