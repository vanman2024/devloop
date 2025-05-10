"""
Validation Manager - Coordinating document validation

This module implements the ValidationManager which coordinates different
validation agents to ensure document quality and correctness.
"""

import os
import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Union

# Import validation models
from ..models.document_model import Document
from ..models.validation_result import ValidationResult, ValidationIssue, ValidationSeverity, ValidationType

# Import validation agents (will be implemented separately)
from .technical_validator import TechnicalValidator
from .completeness_validator import CompletenessValidator
from .consistency_validator import ConsistencyValidator
from .readability_validator import ReadabilityValidator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ValidationManager:
    """
    Manager for document validation, following OpenAI's Manager Pattern.
    
    Coordinates specialized validation agents to validate documents and
    ensures validation results are properly aggregated and reported.
    """
    
    def __init__(self, config: Dict[str, Any], knowledge_graph=None, vector_store=None):
        """
        Initialize the validation manager.
        
        Args:
            config: Configuration dictionary
            knowledge_graph: Knowledge graph connector
            vector_store: Vector store connector
        """
        self.config = config
        self.kg = knowledge_graph
        self.vector_store = vector_store
        
        # Configure validation thresholds
        self.error_threshold = config.get("validation", {}).get("error_threshold", 0)
        self.warning_threshold = config.get("validation", {}).get("warning_threshold", 5)
        self.critical_fails = config.get("validation", {}).get("critical_fails", True)
        
        # Initialize validators
        self.technical_validator = TechnicalValidator(config, knowledge_graph, vector_store)
        self.completeness_validator = CompletenessValidator(config, knowledge_graph, vector_store)
        self.consistency_validator = ConsistencyValidator(config, knowledge_graph, vector_store)
        self.readability_validator = ReadabilityValidator(config)
        
        # Track which validators to run
        self.validators = {
            "technical": self.technical_validator,
            "completeness": self.completeness_validator,
            "consistency": self.consistency_validator,
            "readability": self.readability_validator
        }
        
        logger.info("Validation manager initialized")
    
    async def validate_document(self, document: Document, 
                              validators: List[str] = None,
                              validate_related: bool = False) -> ValidationResult:
        """
        Validate a document using configured validators.
        
        Args:
            document: Document to validate
            validators: List of validators to run (None for all)
            validate_related: Whether to validate related documents
            
        Returns:
            ValidationResult with aggregated results
        """
        logger.info(f"Validating document: {document.id}")
        
        # Create empty validation result
        result = ValidationResult(
            document_id=document.id
        )
        
        # Determine which validators to run
        validators_to_run = {}
        if validators:
            # Run only specified validators
            for validator_name in validators:
                if validator_name in self.validators:
                    validators_to_run[validator_name] = self.validators[validator_name]
                else:
                    logger.warning(f"Unknown validator: {validator_name}")
        else:
            # Run all validators
            validators_to_run = self.validators
        
        # Record which validators were run
        result.validators_run = list(validators_to_run.keys())
        
        # Run validators in parallel
        validation_tasks = []
        for name, validator in validators_to_run.items():
            task = asyncio.create_task(self._run_validator(name, validator, document))
            validation_tasks.append(task)
        
        # Wait for all validation tasks to complete
        validator_results = await asyncio.gather(*validation_tasks, return_exceptions=True)
        
        # Process results
        for validator_result in validator_results:
            if isinstance(validator_result, Exception):
                logger.error(f"Validator error: {validator_result}")
                continue
            
            # Add issues from this validator
            result.issues.extend(validator_result)
        
        # Determine overall validation status
        error_count = len([issue for issue in result.issues 
                          if issue.severity in (ValidationSeverity.ERROR, ValidationSeverity.CRITICAL)])
        warning_count = len([issue for issue in result.issues 
                            if issue.severity == ValidationSeverity.WARNING])
        
        # Check if document is valid based on thresholds
        has_critical = any(issue.severity == ValidationSeverity.CRITICAL for issue in result.issues)
        
        result.is_valid = (
            (not has_critical or not self.critical_fails) and
            error_count <= self.error_threshold and
            warning_count <= self.warning_threshold
        )
        
        # If validating related documents, do that recursively
        if validate_related and self.kg:
            # Only validate immediate relationships to avoid cycles
            related_validation_pending = []
            
            for rel in document.relationships:
                # Skip already-validated documents
                if rel.metadata.get("validation_status") == "valid":
                    continue
                
                # Get related document
                related_doc = await self.kg.get_document(rel.entity_id)
                if related_doc:
                    # Queue for validation
                    related_validation_pending.append(related_doc)
            
            # Validate related documents (without recursion to avoid cycles)
            for related_doc in related_validation_pending:
                await self.validate_document(related_doc, validators, validate_related=False)
        
        logger.info(f"Document validation completed: {document.id}, " +
                   f"valid: {result.is_valid}, issues: {len(result.issues)}")
        
        return result
    
    async def _run_validator(self, validator_name: str, validator: Any, 
                          document: Document) -> List[ValidationIssue]:
        """
        Run a specific validator on a document.
        
        Args:
            validator_name: Name of the validator
            validator: Validator instance
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        try:
            logger.info(f"Running {validator_name} validator on document: {document.id}")
            
            # Run validator
            issues = await validator.validate(document)
            
            logger.info(f"{validator_name} validation completed: {len(issues)} issues found")
            return issues
            
        except Exception as e:
            logger.error(f"Error running {validator_name} validator: {e}")
            
            # Create an error issue
            error_issue = ValidationIssue(
                id=f"validator-error-{validator_name}",
                type=ValidationType.TECHNICAL,
                severity=ValidationSeverity.ERROR,
                message=f"Validator error: {str(e)}",
                context="Validation process",
                suggestions=["Check validator implementation", "Review document format"]
            )
            
            return [error_issue]
    
    async def validate_multiple_documents(self, documents: List[Document], 
                                      validators: List[str] = None) -> Dict[str, ValidationResult]:
        """
        Validate multiple documents.
        
        Args:
            documents: List of documents to validate
            validators: List of validators to run (None for all)
            
        Returns:
            Dictionary mapping document IDs to validation results
        """
        logger.info(f"Validating {len(documents)} documents")
        
        results = {}
        validation_tasks = []
        
        # Create validation tasks
        for document in documents:
            task = asyncio.create_task(
                self.validate_document(document, validators)
            )
            validation_tasks.append((document.id, task))
        
        # Wait for all tasks to complete
        for doc_id, task in validation_tasks:
            try:
                results[doc_id] = await task
            except Exception as e:
                logger.error(f"Error validating document {doc_id}: {e}")
                
                # Create error validation result
                results[doc_id] = ValidationResult(
                    document_id=doc_id,
                    is_valid=False,
                    issues=[
                        ValidationIssue(
                            id=f"validation-error-{doc_id}",
                            type=ValidationType.TECHNICAL,
                            severity=ValidationSeverity.ERROR,
                            message=f"Validation process error: {str(e)}",
                            context="Validation process",
                            suggestions=["Check validation system", "Review document format"]
                        )
                    ],
                    validators_run=validators or []
                )
        
        logger.info(f"Completed validation for {len(results)} documents")
        return results
    
    async def validate_document_batch(self, document_ids: List[str], 
                                   validators: List[str] = None) -> Dict[str, ValidationResult]:
        """
        Validate a batch of documents by their IDs.
        
        Args:
            document_ids: List of document IDs to validate
            validators: List of validators to run (None for all)
            
        Returns:
            Dictionary mapping document IDs to validation results
        """
        logger.info(f"Validating batch of {len(document_ids)} documents")
        
        # Load documents
        documents = []
        for doc_id in document_ids:
            if self.kg:
                document = await self.kg.get_document(doc_id)
                if document:
                    documents.append(document)
                else:
                    logger.warning(f"Document not found: {doc_id}")
            else:
                logger.warning("Knowledge graph not available, cannot load documents")
        
        # Validate documents
        return await self.validate_multiple_documents(documents, validators)
    
    async def get_document_validation_status(self, document_id: str) -> Dict[str, Any]:
        """
        Get the validation status of a document.
        
        Args:
            document_id: ID of the document
            
        Returns:
            Dictionary with validation information
        """
        if not self.kg:
            return {"error": "Knowledge graph not available"}
        
        # Get validation result from knowledge graph
        validation_result = await self.kg.get_document_validation(document_id)
        if not validation_result:
            return {"status": "unknown", "message": "No validation result found"}
        
        # Create status summary
        status = {
            "document_id": document_id,
            "is_valid": validation_result.is_valid,
            "timestamp": validation_result.timestamp.isoformat(),
            "validators_run": validation_result.validators_run,
            "issues_summary": {
                "total": len(validation_result.issues),
                "error_count": validation_result.error_count,
                "warning_count": validation_result.warning_count,
                "info_count": validation_result.info_count,
                "has_critical_issues": validation_result.has_critical_issues,
                "technical_issues": len(validation_result.technical_issues),
                "completeness_issues": len(validation_result.completeness_issues),
                "consistency_issues": len(validation_result.consistency_issues),
                "readability_issues": len(validation_result.readability_issues)
            }
        }
        
        return status
    
    def configure_validator(self, validator_name: str, config: Dict[str, Any]) -> bool:
        """
        Configure a specific validator.
        
        Args:
            validator_name: Name of the validator to configure
            config: Configuration dictionary
            
        Returns:
            Success status
        """
        if validator_name not in self.validators:
            logger.warning(f"Unknown validator: {validator_name}")
            return False
        
        try:
            validator = self.validators[validator_name]
            validator.configure(config)
            return True
        except Exception as e:
            logger.error(f"Error configuring validator {validator_name}: {e}")
            return False