"""
Completeness Validator - Checks document completeness

This module implements the CompletenessValidator which verifies that
documents cover all required sections and contents based on document type.
"""

import os
import re
import logging
from typing import Dict, List, Any, Optional, Set

# Import validation models
from ..models.document_model import Document, DocumentType
from ..models.validation_result import ValidationIssue, ValidationSeverity, ValidationType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CompletenessValidator:
    """
    Completeness validator for checking document content coverage.
    
    Ensures documents include all required sections, examples, and explanations
    based on document type and purpose.
    """
    
    def __init__(self, config: Dict[str, Any], knowledge_graph=None, vector_store=None):
        """
        Initialize the completeness validator.
        
        Args:
            config: Configuration dictionary
            knowledge_graph: Knowledge graph connector
            vector_store: Vector store connector
        """
        self.config = config
        self.kg = knowledge_graph
        self.vector_store = vector_store
        
        # Extract validator-specific configuration
        validator_config = config.get("validators", {}).get("completeness", {})
        
        # Configure validation options
        self.check_mandatory_sections = validator_config.get("check_mandatory_sections", True)
        self.check_examples = validator_config.get("check_examples", True)
        self.check_api_docs = validator_config.get("check_api_docs", True)
        self.check_related_content = validator_config.get("check_related_content", True)
        
        # Define document type requirements
        self._init_document_requirements()
        
        logger.info("Completeness validator initialized")
    
    def configure(self, config: Dict[str, Any]):
        """
        Update validator configuration.
        
        Args:
            config: Configuration dictionary
        """
        if "check_mandatory_sections" in config:
            self.check_mandatory_sections = config["check_mandatory_sections"]
        if "check_examples" in config:
            self.check_examples = config["check_examples"]
        if "check_api_docs" in config:
            self.check_api_docs = config["check_api_docs"]
        if "check_related_content" in config:
            self.check_related_content = config["check_related_content"]
        
        logger.info("Completeness validator configuration updated")
    
    async def validate(self, document: Document) -> List[ValidationIssue]:
        """
        Validate document completeness.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        logger.info(f"Validating completeness for document: {document.id}")
        
        issues = []
        
        # Check mandatory sections
        if self.check_mandatory_sections:
            section_issues = await self._validate_mandatory_sections(document)
            issues.extend(section_issues)
        
        # Check for examples
        if self.check_examples:
            example_issues = await self._validate_examples(document)
            issues.extend(example_issues)
        
        # Check API documentation
        if self.check_api_docs:
            api_issues = await self._validate_api_documentation(document)
            issues.extend(api_issues)
        
        # Check related content
        if self.check_related_content:
            relation_issues = await self._validate_related_content(document)
            issues.extend(relation_issues)
        
        logger.info(f"Completeness validation completed for document {document.id}: {len(issues)} issues found")
        return issues
    
    async def _validate_mandatory_sections(self, document: Document) -> List[ValidationIssue]:
        """
        Validate that document contains all mandatory sections.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Get document type
        doc_type = document.metadata.document_type
        
        # Get required sections for document type
        required_sections = self.required_sections.get(doc_type.value, [])
        if not required_sections:
            return issues  # No required sections for this document type
        
        # Extract headings from document
        heading_pattern = r"^(#+)\s+(.+)$"
        headings = []
        
        for line in content.splitlines():
            match = re.match(heading_pattern, line)
            if match:
                level = len(match.group(1))
                text = match.group(2).strip()
                headings.append((level, text))
        
        # Check for each required section
        for section_info in required_sections:
            section_name = section_info["name"]
            section_level = section_info.get("level", 0)  # 0 means any level
            is_optional = section_info.get("optional", False)
            alternatives = section_info.get("alternatives", [])
            
            # Check if section exists
            section_found = False
            for level, text in headings:
                if (section_level == 0 or level == section_level) and self._is_matching_heading(text, section_name, alternatives):
                    section_found = True
                    break
            
            if not section_found and not is_optional:
                severity = ValidationSeverity.WARNING
                
                issues.append(ValidationIssue(
                    id=f"missing-section-{section_name.lower().replace(' ', '-')}",
                    type=ValidationType.COMPLETENESS,
                    severity=severity,
                    message=f"Missing required section: {section_name}",
                    location="Document structure",
                    context="Document is missing a required section",
                    suggestions=[f"Add a '{section_name}' section", 
                                 f"Alternative section names: {', '.join(alternatives)}" if alternatives else ""]
                ))
        
        return issues
    
    def _is_matching_heading(self, text, section_name, alternatives):
        """Check if a heading matches a section name or any of its alternatives"""
        # Normalize for comparison
        text_norm = text.lower().strip()
        section_norm = section_name.lower().strip()
        
        if text_norm == section_norm:
            return True
        
        # Check for alternative names
        for alt in alternatives:
            alt_norm = alt.lower().strip()
            if text_norm == alt_norm:
                return True
        
        # Check for fuzzy matches (e.g., "Introduction" vs "Intro")
        if section_norm in text_norm or any(alt.lower() in text_norm for alt in alternatives):
            return True
        
        return False
    
    async def _validate_examples(self, document: Document) -> List[ValidationIssue]:
        """
        Validate that document contains appropriate examples.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Get document type
        doc_type = document.metadata.document_type
        
        # Check if examples are required for this document type
        example_requirements = self.example_requirements.get(doc_type.value, None)
        if not example_requirements:
            return issues  # No example requirements for this document type
        
        # Look for code blocks (examples)
        code_block_pattern = r"```(\w+)?\s*\n(.*?)\n```"
        code_blocks = re.findall(code_block_pattern, content, re.DOTALL)
        
        # Look for example sections
        example_section_pattern = r"^#+\s+(Example|Examples|Usage).*$"
        has_example_section = bool(re.search(example_section_pattern, content, re.MULTILINE))
        
        # Check code block requirements
        min_blocks = example_requirements.get("min_blocks", 0)
        if len(code_blocks) < min_blocks:
            issues.append(ValidationIssue(
                id="insufficient-code-examples",
                type=ValidationType.COMPLETENESS,
                severity=ValidationSeverity.WARNING,
                message=f"Insufficient code examples (found {len(code_blocks)}, expected {min_blocks})",
                location="Document content",
                context="Document does not have enough code examples",
                suggestions=["Add more code examples to demonstrate usage", 
                            "Include examples for different use cases"]
            ))
        
        # Check example section requirement
        needs_section = example_requirements.get("needs_section", False)
        if needs_section and not has_example_section:
            issues.append(ValidationIssue(
                id="missing-example-section",
                type=ValidationType.COMPLETENESS,
                severity=ValidationSeverity.INFO,
                message="Missing dedicated examples section",
                location="Document structure",
                context="Document should have a dedicated Examples or Usage section",
                suggestions=["Add an 'Examples' or 'Usage' section", 
                            "Group examples under a clear heading"]
            ))
        
        # Check if example types match document type
        required_languages = example_requirements.get("languages", [])
        if required_languages:
            found_languages = [lang.lower() for lang, _ in code_blocks if lang]
            missing_languages = [lang for lang in required_languages if lang.lower() not in found_languages]
            
            if missing_languages:
                issues.append(ValidationIssue(
                    id="missing-language-examples",
                    type=ValidationType.COMPLETENESS,
                    severity=ValidationSeverity.INFO,
                    message=f"Missing examples for languages: {', '.join(missing_languages)}",
                    location="Code examples",
                    context="Document should include examples for specific languages",
                    suggestions=[f"Add code examples for {lang}" for lang in missing_languages]
                ))
        
        return issues
    
    async def _validate_api_documentation(self, document: Document) -> List[ValidationIssue]:
        """
        Validate API documentation completeness.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        issues = []
        content = document.content
        
        # Check if document is API documentation
        api_doc_indicators = [
            "API Reference", "API Documentation", "Endpoints", 
            "REST API", "API Specification", "API Usage"
        ]
        
        is_api_doc = False
        for indicator in api_doc_indicators:
            if indicator in document.metadata.title or indicator in content[:1000]:
                is_api_doc = True
                break
        
        # If not API documentation, return no issues
        if not is_api_doc:
            return issues
        
        # Check for API endpoint documentation
        endpoint_pattern = r"(GET|POST|PUT|DELETE|PATCH)\s+(/[a-zA-Z0-9_/-]+)"
        endpoints = re.findall(endpoint_pattern, content)
        
        # Check for request/response examples
        has_request_example = bool(re.search(r"request.*?example|example.*?request", content, re.IGNORECASE))
        has_response_example = bool(re.search(r"response.*?example|example.*?response", content, re.IGNORECASE))
        
        # Check for parameter documentation
        parameter_section = bool(re.search(r"^#+\s+Parameters", content, re.MULTILINE))
        
        # Check for JSON blocks (likely request/response examples)
        json_blocks = re.findall(r"```(json|javascript)\s*\n.*?\n```", content, re.DOTALL)
        
        # Validate API documentation completeness
        if endpoints and not has_request_example:
            issues.append(ValidationIssue(
                id="missing-request-examples",
                type=ValidationType.COMPLETENESS,
                severity=ValidationSeverity.WARNING,
                message="Missing request examples in API documentation",
                location="API documentation",
                context="API documentation should include request examples",
                suggestions=["Add example requests for each endpoint", 
                            "Include sample request bodies where applicable"]
            ))
        
        if endpoints and not has_response_example:
            issues.append(ValidationIssue(
                id="missing-response-examples",
                type=ValidationType.COMPLETENESS,
                severity=ValidationSeverity.WARNING,
                message="Missing response examples in API documentation",
                location="API documentation",
                context="API documentation should include response examples",
                suggestions=["Add example responses for each endpoint", 
                            "Include both success and error responses"]
            ))
        
        if endpoints and not parameter_section:
            issues.append(ValidationIssue(
                id="missing-parameter-documentation",
                type=ValidationType.COMPLETENESS,
                severity=ValidationSeverity.INFO,
                message="Missing parameter documentation in API reference",
                location="API documentation",
                context="API documentation should include parameter descriptions",
                suggestions=["Add a Parameters section", 
                            "Document each parameter with type and description"]
            ))
        
        if endpoints and not json_blocks:
            issues.append(ValidationIssue(
                id="missing-json-examples",
                type=ValidationType.COMPLETENESS,
                severity=ValidationSeverity.INFO,
                message="Missing JSON examples in API documentation",
                location="API documentation",
                context="API documentation should include JSON examples",
                suggestions=["Add JSON examples for requests and responses", 
                            "Include JSON code blocks with proper syntax highlighting"]
            ))
        
        return issues
    
    async def _validate_related_content(self, document: Document) -> List[ValidationIssue]:
        """
        Validate that document references related content appropriately.
        
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
        
        # Get document metadata
        title = document.metadata.title
        doc_type = document.metadata.document_type.value
        
        # Check for missing relationships
        if doc_type in self.relationship_requirements:
            required_relationships = self.relationship_requirements[doc_type]
            
            for rel_type in required_relationships:
                # Check if any relationship of this type exists
                if not any(rel.relationship_type == rel_type for rel in relationships):
                    issues.append(ValidationIssue(
                        id=f"missing-{rel_type}-relationships",
                        type=ValidationType.COMPLETENESS,
                        severity=ValidationSeverity.INFO,
                        message=f"Missing {rel_type} relationships",
                        location="Document relationships",
                        context=f"Document should reference related content via {rel_type} relationships",
                        suggestions=[f"Add references to related {rel_type}", 
                                    "Link to relevant documents or entities"]
                    ))
        
        # Check for "See Also" or "Related" section
        has_related_section = bool(re.search(r"^#+\s+(See Also|Related|Further Reading)", document.content, re.MULTILINE))
        
        if relationships and not has_related_section:
            issues.append(ValidationIssue(
                id="missing-related-section",
                type=ValidationType.COMPLETENESS,
                severity=ValidationSeverity.INFO,
                message="Missing 'See Also' or 'Related' section",
                location="Document structure",
                context="Document has relationships but no section pointing to related content",
                suggestions=["Add a 'See Also' or 'Related' section", 
                            "List related documents with links in this section"]
            ))
        
        return issues
    
    def _init_document_requirements(self):
        """Initialize document type requirements"""
        # Define required sections by document type
        self.required_sections = {
            DocumentType.MARKDOWN.value: [
                {"name": "Introduction", "level": 1, "optional": False, 
                 "alternatives": ["Overview", "Summary", "About"]},
                {"name": "Getting Started", "level": 0, "optional": True, 
                 "alternatives": ["Installation", "Setup", "Quick Start"]},
                {"name": "Usage", "level": 0, "optional": True, 
                 "alternatives": ["Examples", "How to Use", "Using This"]},
                {"name": "API", "level": 0, "optional": True, 
                 "alternatives": ["API Reference", "Methods", "Functions", "Endpoints"]},
                {"name": "Conclusion", "level": 0, "optional": True, 
                 "alternatives": ["Summary", "Wrapping Up"]}
            ],
            DocumentType.API_SPEC.value: [
                {"name": "Overview", "level": 1, "optional": False, 
                 "alternatives": ["Introduction", "About"]},
                {"name": "Authentication", "level": 0, "optional": False, 
                 "alternatives": ["Auth", "Authorization"]},
                {"name": "Endpoints", "level": 0, "optional": False, 
                 "alternatives": ["API Reference", "Resources", "Routes"]},
                {"name": "Parameters", "level": 0, "optional": False, 
                 "alternatives": ["Request Parameters", "Query Parameters"]},
                {"name": "Responses", "level": 0, "optional": False, 
                 "alternatives": ["Response Format", "Return Values"]},
                {"name": "Errors", "level": 0, "optional": False, 
                 "alternatives": ["Error Handling", "Error Codes"]},
                {"name": "Examples", "level": 0, "optional": False, 
                 "alternatives": ["Usage Examples", "Sample Requests"]}
            ],
            DocumentType.CODE.value: [
                {"name": "Purpose", "level": 0, "optional": False, 
                 "alternatives": ["Overview", "About", "Description"]},
                {"name": "Usage", "level": 0, "optional": False, 
                 "alternatives": ["Examples", "How to Use"]},
                {"name": "API", "level": 0, "optional": True, 
                 "alternatives": ["Interface", "Methods", "Functions"]},
                {"name": "Notes", "level": 0, "optional": True, 
                 "alternatives": ["Additional Information", "Implementation Details"]}
            ]
        }
        
        # Define example requirements by document type
        self.example_requirements = {
            DocumentType.MARKDOWN.value: {
                "min_blocks": 1,
                "needs_section": False,
                "languages": []
            },
            DocumentType.API_SPEC.value: {
                "min_blocks": 2,
                "needs_section": True,
                "languages": ["json", "curl", "javascript"]
            },
            DocumentType.CODE.value: {
                "min_blocks": 2,
                "needs_section": True,
                "languages": []
            }
        }
        
        # Define relationship requirements by document type
        self.relationship_requirements = {
            DocumentType.MARKDOWN.value: ["references"],
            DocumentType.API_SPEC.value: ["documents", "references"],
            DocumentType.CODE.value: ["documents"]
        }