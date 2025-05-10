"""
Readability Validator - Checks document readability

This module implements the ReadabilityValidator which assesses document
readability based on established metrics and best practices.
"""

import os
import re
import logging
import math
from typing import Dict, List, Any, Optional, Tuple

# Import validation models
from ..models.document_model import Document
from ..models.validation_result import ValidationIssue, ValidationSeverity, ValidationType

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ReadabilityValidator:
    """
    Readability validator for assessing document readability.
    
    Uses established readability metrics and checks for readability
    best practices to ensure documents are accessible to the target audience.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize the readability validator.
        
        Args:
            config: Configuration dictionary
        """
        self.config = config
        
        # Extract validator-specific configuration
        validator_config = config.get("validators", {}).get("readability", {})
        
        # Configure validation options
        self.check_readability_score = validator_config.get("check_readability_score", True)
        self.check_sentence_length = validator_config.get("check_sentence_length", True)
        self.check_paragraph_length = validator_config.get("check_paragraph_length", True)
        self.check_passive_voice = validator_config.get("check_passive_voice", True)
        
        # Readability thresholds
        self.flesch_kincaid_threshold = validator_config.get("flesch_kincaid_threshold", 50)
        self.max_sentence_length = validator_config.get("max_sentence_length", 40)
        self.max_paragraph_length = validator_config.get("max_paragraph_length", 6)  # sentences
        self.max_passive_voice_percentage = validator_config.get("max_passive_voice_percentage", 20)
        
        logger.info("Readability validator initialized")
    
    def configure(self, config: Dict[str, Any]):
        """
        Update validator configuration.
        
        Args:
            config: Configuration dictionary
        """
        if "check_readability_score" in config:
            self.check_readability_score = config["check_readability_score"]
        if "check_sentence_length" in config:
            self.check_sentence_length = config["check_sentence_length"]
        if "check_paragraph_length" in config:
            self.check_paragraph_length = config["check_paragraph_length"]
        if "check_passive_voice" in config:
            self.check_passive_voice = config["check_passive_voice"]
        
        if "flesch_kincaid_threshold" in config:
            self.flesch_kincaid_threshold = config["flesch_kincaid_threshold"]
        if "max_sentence_length" in config:
            self.max_sentence_length = config["max_sentence_length"]
        if "max_paragraph_length" in config:
            self.max_paragraph_length = config["max_paragraph_length"]
        if "max_passive_voice_percentage" in config:
            self.max_passive_voice_percentage = config["max_passive_voice_percentage"]
        
        logger.info("Readability validator configuration updated")
    
    async def validate(self, document: Document) -> List[ValidationIssue]:
        """
        Validate document readability.
        
        Args:
            document: Document to validate
            
        Returns:
            List of validation issues
        """
        logger.info(f"Validating readability for document: {document.id}")
        
        issues = []
        
        # Clean content (remove code blocks, URLs, etc.)
        content = document.content
        clean_content = self._clean_content_for_readability(content)
        
        # Split into paragraphs and sentences
        paragraphs = self._split_paragraphs(clean_content)
        sentences = self._split_sentences(clean_content)
        
        # Check readability score
        if self.check_readability_score:
            score_issues = self._check_readability_scores(clean_content)
            issues.extend(score_issues)
        
        # Check sentence length
        if self.check_sentence_length:
            sentence_issues = self._check_sentence_length(sentences)
            issues.extend(sentence_issues)
        
        # Check paragraph length
        if self.check_paragraph_length:
            paragraph_issues = self._check_paragraph_length(paragraphs)
            issues.extend(paragraph_issues)
        
        # Check passive voice
        if self.check_passive_voice:
            passive_issues = self._check_passive_voice(sentences)
            issues.extend(passive_issues)
        
        logger.info(f"Readability validation completed for document {document.id}: {len(issues)} issues found")
        return issues
    
    def _clean_content_for_readability(self, content: str) -> str:
        """
        Clean content for readability analysis by removing code blocks, URLs, etc.
        
        Args:
            content: Document content
            
        Returns:
            Cleaned content
        """
        # Remove code blocks
        content = re.sub(r"```.*?```", "", content, flags=re.DOTALL)
        
        # Remove inline code
        content = re.sub(r"`[^`]+`", "", content)
        
        # Remove URLs
        content = re.sub(r"https?://\S+", "", content)
        
        # Remove image references
        content = re.sub(r"!\[.*?\]\(.*?\)", "", content)
        
        # Remove HTML tags
        content = re.sub(r"<[^>]+>", "", content)
        
        # Remove heading markup
        content = re.sub(r"^#+\s+", "", content, flags=re.MULTILINE)
        
        # Remove list markers
        content = re.sub(r"^[\*\-+]\s+", "", content, flags=re.MULTILINE)
        content = re.sub(r"^\d+\.\s+", "", content, flags=re.MULTILINE)
        
        return content
    
    def _split_paragraphs(self, content: str) -> List[str]:
        """
        Split content into paragraphs.
        
        Args:
            content: Document content
            
        Returns:
            List of paragraphs
        """
        # Split on double newlines
        paragraphs = re.split(r"\n\s*\n", content)
        
        # Filter out empty paragraphs
        return [p.strip() for p in paragraphs if p.strip()]
    
    def _split_sentences(self, content: str) -> List[str]:
        """
        Split content into sentences.
        
        Args:
            content: Document content
            
        Returns:
            List of sentences
        """
        # This is a simplified approach. A proper implementation would use
        # a more sophisticated sentence tokenizer.
        
        # Replace common abbreviations to avoid splitting on their periods
        content = content.replace("e.g.", "e_g_")
        content = content.replace("i.e.", "i_e_")
        content = content.replace("vs.", "vs_")
        content = content.replace("etc.", "etc_")
        content = content.replace("Dr.", "Dr_")
        content = content.replace("Mr.", "Mr_")
        content = content.replace("Ms.", "Ms_")
        content = content.replace("St.", "St_")
        
        # Split on sentence boundaries
        sentence_pattern = r"[.!?]\s+"
        sentences = re.split(sentence_pattern, content)
        
        # Filter out empty sentences and restore abbreviations
        clean_sentences = []
        for sentence in sentences:
            if not sentence.strip():
                continue
            
            # Restore abbreviations
            sentence = sentence.replace("e_g_", "e.g.")
            sentence = sentence.replace("i_e_", "i.e.")
            sentence = sentence.replace("vs_", "vs.")
            sentence = sentence.replace("etc_", "etc.")
            sentence = sentence.replace("Dr_", "Dr.")
            sentence = sentence.replace("Mr_", "Mr.")
            sentence = sentence.replace("Ms_", "Ms.")
            sentence = sentence.replace("St_", "St.")
            
            clean_sentences.append(sentence.strip())
        
        return clean_sentences
    
    def _check_readability_scores(self, content: str) -> List[ValidationIssue]:
        """
        Check readability scores of content.
        
        Args:
            content: Document content
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Calculate Flesch-Kincaid Reading Ease score
        try:
            score = self._calculate_flesch_reading_ease(content)
            
            # Interpret the score
            if score < self.flesch_kincaid_threshold:
                severity = ValidationSeverity.INFO
                if score < 30:  # Very difficult
                    severity = ValidationSeverity.WARNING
                
                issues.append(ValidationIssue(
                    id="low-readability-score",
                    type=ValidationType.READABILITY,
                    severity=severity,
                    message=f"Low readability score: {score:.1f}",
                    location="Overall document",
                    context="Document may be difficult to read for the target audience",
                    suggestions=["Use shorter sentences and simpler words", 
                                "Break up long paragraphs", 
                                "Use active voice instead of passive voice"]
                ))
        except Exception as e:
            logger.error(f"Error calculating readability score: {e}")
        
        return issues
    
    def _calculate_flesch_reading_ease(self, text: str) -> float:
        """
        Calculate Flesch Reading Ease score.
        
        Args:
            text: Text to analyze
            
        Returns:
            Flesch Reading Ease score (0-100)
        """
        # Count words, sentences, and syllables
        sentences = self._split_sentences(text)
        words = text.split()
        
        sentence_count = len(sentences)
        word_count = len(words)
        
        if sentence_count == 0 or word_count == 0:
            return 100.0  # Empty text is easy to read
        
        # Count syllables (simplified approach)
        syllable_count = 0
        for word in words:
            syllable_count += self._count_syllables(word)
        
        # Calculate score
        # Flesch Reading Ease = 206.835 - (1.015 × ASL) - (84.6 × ASW)
        # ASL = Average Sentence Length (words per sentence)
        # ASW = Average Syllables per Word
        asl = word_count / sentence_count
        asw = syllable_count / word_count
        
        score = 206.835 - (1.015 * asl) - (84.6 * asw)
        
        # Clamp score to 0-100 range
        return max(0, min(100, score))
    
    def _count_syllables(self, word: str) -> int:
        """
        Count syllables in a word (simplified approach).
        
        Args:
            word: Word to count syllables for
            
        Returns:
            Number of syllables
        """
        # Remove punctuation and lower case
        word = re.sub(r'[^\w\s]', '', word).lower()
        
        # Special cases
        if not word:
            return 0
        
        # Count vowel groups
        vowels = "aeiouy"
        count = 0
        prev_is_vowel = False
        
        for char in word:
            is_vowel = char in vowels
            if is_vowel and not prev_is_vowel:
                count += 1
            prev_is_vowel = is_vowel
        
        # Adjust for silent 'e' at the end
        if word.endswith('e') and len(word) > 2 and word[-2] not in vowels:
            count -= 1
        
        # Ensure at least one syllable
        return max(1, count)
    
    def _check_sentence_length(self, sentences: List[str]) -> List[ValidationIssue]:
        """
        Check sentence length for readability.
        
        Args:
            sentences: List of sentences
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Count words in each sentence
        long_sentences = []
        for i, sentence in enumerate(sentences):
            words = sentence.split()
            if len(words) > self.max_sentence_length:
                long_sentences.append((i, sentence, len(words)))
        
        # Report issues for long sentences
        if long_sentences:
            # Group long sentences if there are too many
            if len(long_sentences) > 3:
                issues.append(ValidationIssue(
                    id="excessive-long-sentences",
                    type=ValidationType.READABILITY,
                    severity=ValidationSeverity.WARNING,
                    message=f"Document contains {len(long_sentences)} sentences longer than {self.max_sentence_length} words",
                    location="Overall document",
                    context=f"Long sentences reduce readability",
                    suggestions=["Break up long sentences into shorter ones", 
                                "Aim for an average of 20-25 words per sentence"]
                ))
            else:
                # Report individual long sentences
                for i, sentence, word_count in long_sentences:
                    issues.append(ValidationIssue(
                        id=f"long-sentence-{i}",
                        type=ValidationType.READABILITY,
                        severity=ValidationSeverity.INFO,
                        message=f"Long sentence: {word_count} words",
                        location=f"Sentence {i+1}",
                        context=f"{sentence[:100]}{'...' if len(sentence) > 100 else ''}",
                        suggestions=["Break this sentence into shorter ones", 
                                    "Remove unnecessary words"]
                    ))
        
        return issues
    
    def _check_paragraph_length(self, paragraphs: List[str]) -> List[ValidationIssue]:
        """
        Check paragraph length for readability.
        
        Args:
            paragraphs: List of paragraphs
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Count sentences in each paragraph
        long_paragraphs = []
        for i, paragraph in enumerate(paragraphs):
            sentences = self._split_sentences(paragraph)
            if len(sentences) > self.max_paragraph_length:
                long_paragraphs.append((i, paragraph, len(sentences)))
        
        # Report issues for long paragraphs
        if long_paragraphs:
            # Group long paragraphs if there are too many
            if len(long_paragraphs) > 3:
                issues.append(ValidationIssue(
                    id="excessive-long-paragraphs",
                    type=ValidationType.READABILITY,
                    severity=ValidationSeverity.WARNING,
                    message=f"Document contains {len(long_paragraphs)} paragraphs longer than {self.max_paragraph_length} sentences",
                    location="Overall document",
                    context=f"Long paragraphs reduce readability",
                    suggestions=["Break up long paragraphs into shorter ones", 
                                "Aim for 3-4 sentences per paragraph for better readability"]
                ))
            else:
                # Report individual long paragraphs
                for i, paragraph, sentence_count in long_paragraphs:
                    issues.append(ValidationIssue(
                        id=f"long-paragraph-{i}",
                        type=ValidationType.READABILITY,
                        severity=ValidationSeverity.INFO,
                        message=f"Long paragraph: {sentence_count} sentences",
                        location=f"Paragraph {i+1}",
                        context=f"{paragraph[:100]}{'...' if len(paragraph) > 100 else ''}",
                        suggestions=["Break this paragraph into shorter ones", 
                                    "Group related ideas into separate paragraphs"]
                    ))
        
        return issues
    
    def _check_passive_voice(self, sentences: List[str]) -> List[ValidationIssue]:
        """
        Check for excessive passive voice usage.
        
        Args:
            sentences: List of sentences
            
        Returns:
            List of validation issues
        """
        issues = []
        
        # Simple passive voice detection patterns
        passive_patterns = [
            r"\b(am|is|are|was|were|be|being|been)\s+(\w+ed)\b",
            r"\b(am|is|are|was|were|be|being|been)\s+(\w+en)\b",
            r"\b(have|has|had)\s+been\s+(\w+ed)\b",
            r"\b(have|has|had)\s+been\s+(\w+en)\b"
        ]
        
        # Count passive voice sentences
        passive_sentences = []
        for i, sentence in enumerate(sentences):
            for pattern in passive_patterns:
                if re.search(pattern, sentence, re.IGNORECASE):
                    passive_sentences.append((i, sentence))
                    break
        
        # Calculate percentage of passive voice sentences
        if sentences:
            passive_percentage = (len(passive_sentences) / len(sentences)) * 100
            
            # Report issue if passive voice usage is excessive
            if passive_percentage > self.max_passive_voice_percentage:
                issues.append(ValidationIssue(
                    id="excessive-passive-voice",
                    type=ValidationType.READABILITY,
                    severity=ValidationSeverity.INFO,
                    message=f"Excessive passive voice usage: {passive_percentage:.1f}%",
                    location="Overall document",
                    context=f"Active voice improves readability and clarity",
                    suggestions=["Use active voice instead of passive voice", 
                                "Identify who is performing actions in sentences"]
                ))
                
                # Include examples of passive voice sentences
                if len(passive_sentences) > 0:
                    for i, (_, sentence) in enumerate(passive_sentences[:3]):
                        issues.append(ValidationIssue(
                            id=f"passive-voice-example-{i}",
                            type=ValidationType.READABILITY,
                            severity=ValidationSeverity.INFO,
                            message=f"Example of passive voice",
                            location=f"Sentence {_+1}",
                            context=f"{sentence[:100]}{'...' if len(sentence) > 100 else ''}",
                            suggestions=["Rewrite in active voice by identifying who is performing the action"]
                        ))
        
        return issues