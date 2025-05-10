"""
Validation Result Model - Data structures for document validation

This module defines data models for representing validation results
for documents in the documentation management system.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Any, Optional

class ValidationSeverity(str, Enum):
    """Severity levels for validation issues"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class ValidationType(str, Enum):
    """Types of validation checks"""
    TECHNICAL = "technical"
    COMPLETENESS = "completeness"
    CONSISTENCY = "consistency"
    READABILITY = "readability"
    SECURITY = "security"
    CUSTOM = "custom"

@dataclass
class ValidationIssue:
    """Represents a single validation issue found in a document"""
    id: str
    type: ValidationType
    severity: ValidationSeverity
    message: str
    location: Optional[str] = None  # Section or position in document
    context: Optional[str] = None  # Surrounding content for reference
    suggestions: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "id": self.id,
            "type": self.type.value,
            "severity": self.severity.value,
            "message": self.message,
            "location": self.location,
            "context": self.context,
            "suggestions": self.suggestions,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValidationIssue':
        """Create from dictionary"""
        return cls(
            id=data["id"],
            type=ValidationType(data["type"]),
            severity=ValidationSeverity(data["severity"]),
            message=data["message"],
            location=data.get("location"),
            context=data.get("context"),
            suggestions=data.get("suggestions", []),
            metadata=data.get("metadata", {})
        )

@dataclass
class ValidationResult:
    """
    Represents the results of validating a document.
    
    Includes overall validation status, issues grouped by validation type,
    and statistics about the validation.
    """
    document_id: str
    timestamp: datetime = field(default_factory=datetime.now)
    is_valid: bool = True
    issues: List[ValidationIssue] = field(default_factory=list)
    validators_run: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def technical_issues(self) -> List[ValidationIssue]:
        """Get all technical validation issues"""
        return [issue for issue in self.issues if issue.type == ValidationType.TECHNICAL]
    
    @property
    def completeness_issues(self) -> List[ValidationIssue]:
        """Get all completeness validation issues"""
        return [issue for issue in self.issues if issue.type == ValidationType.COMPLETENESS]
    
    @property
    def consistency_issues(self) -> List[ValidationIssue]:
        """Get all consistency validation issues"""
        return [issue for issue in self.issues if issue.type == ValidationType.CONSISTENCY]
    
    @property
    def readability_issues(self) -> List[ValidationIssue]:
        """Get all readability validation issues"""
        return [issue for issue in self.issues if issue.type == ValidationType.READABILITY]
    
    @property
    def security_issues(self) -> List[ValidationIssue]:
        """Get all security validation issues"""
        return [issue for issue in self.issues if issue.type == ValidationType.SECURITY]
    
    @property
    def error_count(self) -> int:
        """Count of error and critical issues"""
        return len([
            issue for issue in self.issues 
            if issue.severity in (ValidationSeverity.ERROR, ValidationSeverity.CRITICAL)
        ])
    
    @property
    def warning_count(self) -> int:
        """Count of warning issues"""
        return len([
            issue for issue in self.issues 
            if issue.severity == ValidationSeverity.WARNING
        ])
    
    @property
    def info_count(self) -> int:
        """Count of info issues"""
        return len([
            issue for issue in self.issues 
            if issue.severity == ValidationSeverity.INFO
        ])
    
    @property
    def has_critical_issues(self) -> bool:
        """Check if there are any critical issues"""
        return any(issue.severity == ValidationSeverity.CRITICAL for issue in self.issues)
    
    def get_issues_by_severity(self, severity: ValidationSeverity) -> List[ValidationIssue]:
        """Get issues filtered by severity"""
        return [issue for issue in self.issues if issue.severity == severity]
    
    def get_issues_by_type(self, type_: ValidationType) -> List[ValidationIssue]:
        """Get issues filtered by type"""
        return [issue for issue in self.issues if issue.type == type_]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            "document_id": self.document_id,
            "timestamp": self.timestamp.isoformat(),
            "is_valid": self.is_valid,
            "issues": [issue.to_dict() for issue in self.issues],
            "validators_run": self.validators_run,
            "metadata": self.metadata,
            "summary": {
                "total_issues": len(self.issues),
                "error_count": self.error_count,
                "warning_count": self.warning_count,
                "info_count": self.info_count,
                "has_critical_issues": self.has_critical_issues,
                "technical_issues_count": len(self.technical_issues),
                "completeness_issues_count": len(self.completeness_issues),
                "consistency_issues_count": len(self.consistency_issues),
                "readability_issues_count": len(self.readability_issues),
                "security_issues_count": len(self.security_issues)
            }
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ValidationResult':
        """Create from dictionary"""
        issues = [
            ValidationIssue.from_dict(issue_data)
            for issue_data in data.get("issues", [])
        ]
        
        result = cls(
            document_id=data["document_id"],
            is_valid=data.get("is_valid", True),
            issues=issues,
            validators_run=data.get("validators_run", []),
            metadata=data.get("metadata", {})
        )
        
        if "timestamp" in data:
            result.timestamp = datetime.fromisoformat(data["timestamp"])
            
        return result
            
    def merge(self, other: 'ValidationResult') -> 'ValidationResult':
        """Merge with another validation result"""
        if self.document_id != other.document_id:
            raise ValueError("Cannot merge validation results for different documents")
        
        result = ValidationResult(
            document_id=self.document_id,
            timestamp=max(self.timestamp, other.timestamp),
            is_valid=self.is_valid and other.is_valid,
            issues=self.issues + other.issues,
            validators_run=list(set(self.validators_run + other.validators_run)),
            metadata={**self.metadata, **other.metadata}
        )
        
        return result