"""
Redundancy Detection System for Documentation Agent.

This module implements algorithms and workflows to identify content overlap 
and redundancy in documentation, enabling agents to collaborate on reducing
duplication and improving overall documentation quality.
"""

import logging
import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Tuple, Set, Union
from datetime import datetime
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ..models.document_model import Document
from ..connectors.vector_store_connector import DocumentVectorStoreConnector
from ..connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from .inter_agent_handoff import HandoffContext, HandoffManager, HandoffPriority

# Set up logging
logger = logging.getLogger(__name__)


@dataclass
class RedundancyDetectionResult:
    """Result of redundancy detection between documents."""
    
    source_doc_id: str
    source_doc_title: str
    
    # Redundancy info
    duplicate_segments: List[Dict[str, Any]] = field(default_factory=list)
    similar_docs: List[Dict[str, Any]] = field(default_factory=list)
    similarity_scores: Dict[str, float] = field(default_factory=dict)
    overlap_percentage: Dict[str, float] = field(default_factory=dict)
    
    # Content sections with highest similarity
    content_matches: List[Dict[str, Any]] = field(default_factory=list)
    
    # Analysis timestamp
    analyzed_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # Recommendations
    consolidation_candidates: List[str] = field(default_factory=list)
    recommended_actions: List[Dict[str, Any]] = field(default_factory=list)


class RedundancyDetector:
    """
    Detects redundancy and overlap in documentation.
    
    Uses multiple methods including:
    1. Vector similarity comparison
    2. TF-IDF analysis of content
    3. Section-by-section comparison
    4. Knowledge graph relationship analysis
    5. Topic and entity overlap detection
    """
    
    def __init__(self, vector_store: DocumentVectorStoreConnector, 
                 knowledge_graph: DocumentKnowledgeGraphConnector,
                 config: Dict[str, Any] = None):
        """Initialize the redundancy detector."""
        self.vector_store = vector_store
        self.knowledge_graph = knowledge_graph
        self.config = config or {}
        
        # Default configurations
        self.similarity_threshold = self.config.get("similarity_threshold", 0.75)
        self.min_segment_length = self.config.get("min_segment_length", 100)
        self.significant_overlap_threshold = self.config.get("significant_overlap_threshold", 0.3)
        
        # TF-IDF vectorizer
        self.vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words='english',
            min_df=2,
            max_df=0.85
        )
        
        logger.info("RedundancyDetector initialized")
    
    async def detect_redundancy(self, document: Document) -> RedundancyDetectionResult:
        """
        Detect redundancy between this document and others in the system.
        
        Args:
            document: The document to check for redundancy
            
        Returns:
            RedundancyDetectionResult containing detected overlaps and recommendations
        """
        # Initialize result
        result = RedundancyDetectionResult(
            source_doc_id=document.id,
            source_doc_title=document.title
        )
        
        # Run detection methods in parallel
        vector_similarity_task = asyncio.create_task(
            self._detect_vector_similarity(document)
        )
        
        content_comparison_task = asyncio.create_task(
            self._detect_content_similarity(document)
        )
        
        kg_relationship_task = asyncio.create_task(
            self._analyze_kg_relationships(document)
        )
        
        section_comparison_task = asyncio.create_task(
            self._compare_document_sections(document)
        )
        
        # Await all tasks
        vector_results, content_results, kg_results, section_results = await asyncio.gather(
            vector_similarity_task,
            content_comparison_task,
            kg_relationship_task,
            section_comparison_task
        )
        
        # Combine results
        similar_docs = {}
        
        # Process vector similarity results
        for doc_id, score in vector_results.items():
            if doc_id not in similar_docs:
                similar_docs[doc_id] = {"similarity_score": 0, "overlapping_sections": []}
            similar_docs[doc_id]["similarity_score"] = max(
                similar_docs[doc_id].get("similarity_score", 0), 
                score
            )
        
        # Process content similarity results
        for doc_id, data in content_results.items():
            if doc_id not in similar_docs:
                similar_docs[doc_id] = {"similarity_score": 0, "overlapping_sections": []}
            
            similar_docs[doc_id]["content_similarity"] = data["similarity"]
            similar_docs[doc_id]["similarity_score"] = max(
                similar_docs[doc_id].get("similarity_score", 0), 
                data["similarity"]
            )
            similar_docs[doc_id]["duplicate_segments"] = data.get("duplicate_segments", [])
        
        # Process section comparison results
        for doc_id, sections in section_results.items():
            if doc_id not in similar_docs:
                similar_docs[doc_id] = {"similarity_score": 0, "overlapping_sections": []}
            
            similar_docs[doc_id]["overlapping_sections"] = sections
        
        # Process knowledge graph results
        for doc_id, relationship in kg_results.items():
            if doc_id not in similar_docs:
                similar_docs[doc_id] = {"similarity_score": 0, "overlapping_sections": []}
            
            similar_docs[doc_id]["relationship"] = relationship
            
            # Boost similarity score for directly related documents
            if relationship.get("relationship_type") in ["extends", "supersedes", "related_to"]:
                similar_docs[doc_id]["similarity_score"] = max(
                    similar_docs[doc_id].get("similarity_score", 0),
                    0.5  # Base relationship score
                )
        
        # Filter documents with significant similarity
        significant_similar_docs = {
            doc_id: data for doc_id, data in similar_docs.items()
            if data["similarity_score"] >= self.similarity_threshold or
               len(data.get("overlapping_sections", [])) > 0 or
               data.get("relationship", {}).get("relationship_type") in ["extends", "supersedes"]
        }
        
        # Prepare result
        result.similarity_scores = {
            doc_id: data["similarity_score"] 
            for doc_id, data in significant_similar_docs.items()
        }
        
        # Format similar docs list
        for doc_id, data in significant_similar_docs.items():
            # Get document details
            doc_details = await self._get_document_details(doc_id)
            
            similar_doc = {
                "id": doc_id,
                "title": doc_details.get("title", "Unknown"),
                "similarity_score": data["similarity_score"],
                "relationship": data.get("relationship", {}).get("relationship_type", "none"),
                "overlapping_sections": data.get("overlapping_sections", []),
                "duplicate_segments_count": len(data.get("duplicate_segments", [])),
            }
            
            result.similar_docs.append(similar_doc)
            
            # Add duplicate segments
            if "duplicate_segments" in data:
                for segment in data["duplicate_segments"]:
                    segment["compared_doc_id"] = doc_id
                    segment["compared_doc_title"] = doc_details.get("title", "Unknown")
                    result.duplicate_segments.append(segment)
        
        # Calculate overlap percentages
        for doc_id, data in significant_similar_docs.items():
            doc_details = await self._get_document_details(doc_id)
            
            # Skip if we couldn't get document details
            if not doc_details:
                continue
                
            # Calculate content overlap percentage
            source_content_length = len(document.content)
            target_content_length = len(doc_details.get("content", ""))
            
            total_duplicate_length = sum(
                len(segment["text"]) 
                for segment in data.get("duplicate_segments", [])
            )
            
            # Calculate overlap percentage relative to source document
            if source_content_length > 0:
                source_overlap = total_duplicate_length / source_content_length
                result.overlap_percentage[doc_id] = source_overlap
        
        # Determine consolidation candidates
        # Documents with high similarity and significant overlap are candidates for consolidation
        consolidation_threshold = self.config.get("consolidation_threshold", 0.8)
        significant_overlap = self.config.get("significant_overlap", 0.4)
        
        for doc_id, data in significant_similar_docs.items():
            if (data["similarity_score"] >= consolidation_threshold or
                result.overlap_percentage.get(doc_id, 0) >= significant_overlap):
                result.consolidation_candidates.append(doc_id)
        
        # Generate recommended actions
        await self._generate_recommendations(document, result)
        
        return result
    
    async def _detect_vector_similarity(self, document: Document) -> Dict[str, float]:
        """
        Detect similar documents using vector similarity.
        
        Args:
            document: The document to check
            
        Returns:
            Dictionary mapping document IDs to similarity scores
        """
        # Get vector for the document
        vector = await self.vector_store.get_document_vector(document.id)
        
        # If document isn't in vector store yet, compute and store it
        if vector is None:
            vector = await self.vector_store.compute_document_vector(document)
        
        # Get similar documents
        similar_docs = await self.vector_store.find_similar_documents(
            vector=vector,
            limit=10,
            min_similarity=self.similarity_threshold
        )
        
        # Return as dictionary of document ID to similarity score
        return {doc["id"]: doc["similarity"] for doc in similar_docs}
    
    async def _detect_content_similarity(self, document: Document) -> Dict[str, Dict[str, Any]]:
        """
        Detect content similarity using TF-IDF and segment comparison.
        
        Args:
            document: The document to check
            
        Returns:
            Dictionary mapping document IDs to similarity data
        """
        # Get potentially similar documents first (faster check)
        similar_doc_ids = await self.vector_store.find_candidate_documents(document)
        
        results = {}
        
        # Get document contents
        docs_content = {}
        docs_content[document.id] = document.content
        
        for doc_id in similar_doc_ids:
            if doc_id == document.id:
                continue
                
            doc_details = await self._get_document_details(doc_id)
            if doc_details and "content" in doc_details:
                docs_content[doc_id] = doc_details["content"]
        
        # Skip if no other documents to compare
        if len(docs_content) <= 1:
            return {}
        
        # Compute TF-IDF similarity
        content_list = [docs_content[doc_id] for doc_id in docs_content]
        try:
            tfidf_matrix = self.vectorizer.fit_transform(content_list)
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # First document is our target document
            doc_ids = list(docs_content.keys())
            source_idx = doc_ids.index(document.id)
            
            # Get similarity scores
            for i, doc_id in enumerate(doc_ids):
                if doc_id == document.id:
                    continue
                    
                similarity = similarity_matrix[source_idx, i]
                
                results[doc_id] = {
                    "similarity": float(similarity),
                    "duplicate_segments": []
                }
                
        except Exception as e:
            logger.error(f"Error computing TF-IDF similarity: {e}")
            # Fallback to segment comparison only
        
        # Perform segment comparison to find duplicate content
        await self._detect_duplicate_segments(document, docs_content, results)
        
        return results
    
    async def _detect_duplicate_segments(self, document: Document, 
                                       docs_content: Dict[str, str],
                                       results: Dict[str, Dict[str, Any]]) -> None:
        """
        Detect duplicate segments between documents.
        
        Args:
            document: Source document
            docs_content: Dictionary of document contents
            results: Results dictionary to update
        """
        source_segments = self._split_into_segments(document.content)
        
        for doc_id, content in docs_content.items():
            if doc_id == document.id:
                continue
                
            target_segments = self._split_into_segments(content)
            duplicate_segments = []
            
            # Compare segments
            for src_idx, src_segment in enumerate(source_segments):
                if len(src_segment) < self.min_segment_length:
                    continue
                    
                for tgt_idx, tgt_segment in enumerate(target_segments):
                    if len(tgt_segment) < self.min_segment_length:
                        continue
                        
                    # Compute similarity for more substantial segments
                    similarity = self._compute_segment_similarity(src_segment, tgt_segment)
                    
                    if similarity > self.similarity_threshold:
                        duplicate_segments.append({
                            "text": src_segment,
                            "source_position": src_idx,
                            "target_position": tgt_idx,
                            "similarity": similarity
                        })
            
            # Update results
            if doc_id in results:
                results[doc_id]["duplicate_segments"] = duplicate_segments
            else:
                # If TF-IDF failed, create new entry
                results[doc_id] = {
                    "similarity": 0.0,
                    "duplicate_segments": duplicate_segments
                }
                
                # Calculate simple similarity based on duplicate segment count
                if duplicate_segments:
                    segment_similarity = len(duplicate_segments) / len(source_segments)
                    results[doc_id]["similarity"] = min(segment_similarity, 0.99)
    
    def _split_into_segments(self, content: str) -> List[str]:
        """Split content into meaningful segments for comparison."""
        # Simple split by paragraphs
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        
        segments = []
        current_segment = ""
        
        for paragraph in paragraphs:
            if len(current_segment) + len(paragraph) < 500:
                current_segment += "\n\n" + paragraph if current_segment else paragraph
            else:
                if current_segment:
                    segments.append(current_segment)
                current_segment = paragraph
                
        if current_segment:
            segments.append(current_segment)
            
        return segments
    
    def _compute_segment_similarity(self, segment1: str, segment2: str) -> float:
        """Compute similarity between two segments."""
        try:
            vectorizer = TfidfVectorizer()
            tfidf_matrix = vectorizer.fit_transform([segment1, segment2])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
            return float(similarity[0][0])
        except Exception as e:
            logger.warning(f"Error computing segment similarity: {e}")
            # Fallback to simpler method
            return self._compute_jaccard_similarity(segment1, segment2)
    
    def _compute_jaccard_similarity(self, segment1: str, segment2: str) -> float:
        """Compute Jaccard similarity between two segments."""
        tokens1 = set(segment1.lower().split())
        tokens2 = set(segment2.lower().split())
        
        intersection = tokens1.intersection(tokens2)
        union = tokens1.union(tokens2)
        
        if not union:
            return 0.0
            
        return len(intersection) / len(union)
    
    async def _analyze_kg_relationships(self, document: Document) -> Dict[str, Dict[str, Any]]:
        """
        Analyze document relationships in the knowledge graph.
        
        Args:
            document: The document to analyze
            
        Returns:
            Dictionary mapping document IDs to relationship data
        """
        related_docs = await self.knowledge_graph.get_document_relationships(document.id)
        
        results = {}
        for relation in related_docs:
            target_doc_id = relation["target_id"]
            
            results[target_doc_id] = {
                "relationship_type": relation["relationship_type"],
                "relationship_properties": relation.get("properties", {}),
                "relationship_strength": relation.get("strength", 1.0)
            }
            
        return results
    
    async def _compare_document_sections(self, document: Document) -> Dict[str, List[Dict[str, Any]]]:
        """
        Compare document sections with related documents.
        
        Args:
            document: The document to check
            
        Returns:
            Dictionary mapping document IDs to lists of overlapping sections
        """
        # Extract sections from source document
        source_sections = await self._extract_document_sections(document)
        
        # Get potentially related documents
        related_doc_ids = await self.knowledge_graph.find_related_documents(document.id)
        
        results = {}
        
        # Compare with each related document
        for doc_id in related_doc_ids:
            if doc_id == document.id:
                continue
                
            doc_details = await self._get_document_details(doc_id)
            if not doc_details:
                continue
                
            # Create temporary document object
            related_doc = Document(
                id=doc_id,
                title=doc_details.get("title", ""),
                content=doc_details.get("content", ""),
                document_type=doc_details.get("document_type", "")
            )
            
            # Extract sections
            related_sections = await self._extract_document_sections(related_doc)
            
            # Compare sections
            overlapping_sections = []
            
            for src_section in source_sections:
                for rel_section in related_sections:
                    # Check if sections have similar headings
                    heading_similarity = self._compute_jaccard_similarity(
                        src_section["heading"], 
                        rel_section["heading"]
                    )
                    
                    # Check content similarity for sections with similar headings
                    if heading_similarity > 0.7:
                        content_similarity = self._compute_segment_similarity(
                            src_section["content"],
                            rel_section["content"]
                        )
                        
                        if content_similarity > self.similarity_threshold:
                            overlapping_sections.append({
                                "source_section": src_section["heading"],
                                "related_section": rel_section["heading"],
                                "content_similarity": content_similarity,
                                "heading_similarity": heading_similarity
                            })
            
            if overlapping_sections:
                results[doc_id] = overlapping_sections
                
        return results
    
    async def _extract_document_sections(self, document: Document) -> List[Dict[str, Any]]:
        """
        Extract sections from a document.
        
        Args:
            document: The document to process
            
        Returns:
            List of section dictionaries with headings and content
        """
        sections = []
        
        # Simple markdown section extraction based on headings
        lines = document.content.split("\n")
        
        current_heading = "Introduction"
        current_content = []
        
        for line in lines:
            if line.startswith("#"):
                # Save previous section
                if current_content:
                    sections.append({
                        "heading": current_heading,
                        "content": "\n".join(current_content)
                    })
                
                # Start new section
                current_heading = line.strip("# ")
                current_content = []
            else:
                current_content.append(line)
        
        # Add the last section
        if current_content:
            sections.append({
                "heading": current_heading,
                "content": "\n".join(current_content)
            })
            
        return sections
    
    async def _get_document_details(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """
        Get document details from the knowledge graph.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Document details or None if not found
        """
        try:
            return await self.knowledge_graph.get_document(doc_id)
        except Exception as e:
            logger.error(f"Error getting document details for {doc_id}: {e}")
            return None
    
    async def _generate_recommendations(self, document: Document,
                                      result: RedundancyDetectionResult) -> None:
        """
        Generate recommendations based on redundancy analysis.
        
        Args:
            document: Source document
            result: Redundancy detection result to update
        """
        # Clear existing recommendations
        result.recommended_actions = []
        
        # Case 1: High similarity with another document - consider merging
        for doc_id, similarity in result.similarity_scores.items():
            if similarity > 0.85:
                doc_details = await self._get_document_details(doc_id)
                if not doc_details:
                    continue
                    
                result.recommended_actions.append({
                    "action_type": "merge_documents",
                    "priority": "high",
                    "description": f"Merge with highly similar document '{doc_details.get('title', 'Unknown')}'",
                    "target_document_id": doc_id,
                    "similarity_score": similarity
                })
                
        # Case 2: Multiple sections overlap with different documents - consider reorganizing
        section_overlaps = {}
        for doc in result.similar_docs:
            for section in doc.get("overlapping_sections", []):
                source_section = section.get("source_section")
                if source_section:
                    if source_section not in section_overlaps:
                        section_overlaps[source_section] = []
                    section_overlaps[source_section].append({
                        "doc_id": doc["id"],
                        "doc_title": doc["title"],
                        "similarity": section.get("content_similarity", 0)
                    })
        
        # Identify sections with multiple overlaps
        for section, overlaps in section_overlaps.items():
            if len(overlaps) > 1:
                result.recommended_actions.append({
                    "action_type": "reorganize_section",
                    "priority": "medium",
                    "description": f"Reorganize section '{section}' which overlaps with {len(overlaps)} other documents",
                    "overlapping_documents": overlaps
                })
                
        # Case 3: High overall duplication - consider consolidation strategy
        if len(result.consolidation_candidates) > 0:
            # Get document titles
            candidate_titles = []
            for doc_id in result.consolidation_candidates:
                doc_details = await self._get_document_details(doc_id)
                if doc_details:
                    candidate_titles.append(doc_details.get("title", f"Document {doc_id}"))
            
            if candidate_titles:
                result.recommended_actions.append({
                    "action_type": "consolidation_strategy",
                    "priority": "high",
                    "description": "Develop consolidation strategy for overlapping documentation",
                    "candidate_documents": result.consolidation_candidates,
                    "candidate_titles": candidate_titles
                })
                
        # Case 4: Some duplicate segments but otherwise distinct - consider refactoring
        if (len(result.duplicate_segments) > 0 and 
            not any(action["action_type"] == "merge_documents" for action in result.recommended_actions)):
            result.recommended_actions.append({
                "action_type": "refactor_segments",
                "priority": "medium",
                "description": f"Refactor {len(result.duplicate_segments)} duplicate segments",
                "duplicate_segments": result.duplicate_segments
            })
            
        # Case 5: No significant duplication but related content - consider cross-references
        if (not result.duplicate_segments and 
            not result.consolidation_candidates and
            len(result.similar_docs) > 0):
            result.recommended_actions.append({
                "action_type": "add_cross_references",
                "priority": "low",
                "description": "Add cross-references to related documents",
                "related_documents": [
                    {"id": doc["id"], "title": doc["title"]} 
                    for doc in result.similar_docs
                ]
            })


class RedundancyManager:
    """
    Manager for handling document redundancy workflow.
    
    Coordinates the detection of redundancy and orchestrates the appropriate
    handoffs to other agents for consolidation, merging, or refactoring.
    """
    
    def __init__(self, detector: RedundancyDetector, 
                 handoff_manager: HandoffManager, 
                 config: Dict[str, Any] = None):
        """Initialize the redundancy manager."""
        self.detector = detector
        self.handoff_manager = handoff_manager
        self.config = config or {}
        
        # Agents responsible for different actions
        self.consolidation_agent_id = self.config.get("consolidation_agent_id", "doc_consolidation_agent")
        self.refactoring_agent_id = self.config.get("refactoring_agent_id", "doc_refactoring_agent")
        self.review_agent_id = self.config.get("review_agent_id", "doc_review_agent")
        
        logger.info("RedundancyManager initialized")
    
    async def process_document(self, document: Document) -> RedundancyDetectionResult:
        """
        Process a document for redundancy detection and management.
        
        Args:
            document: The document to process
            
        Returns:
            RedundancyDetectionResult with analysis and actions taken
        """
        # Detect redundancy
        result = await self.detector.detect_redundancy(document)
        
        # Log findings
        logger.info(f"Redundancy detection for '{document.title}' found:")
        logger.info(f" - {len(result.similar_docs)} similar documents")
        logger.info(f" - {len(result.duplicate_segments)} duplicate segments")
        logger.info(f" - {len(result.consolidation_candidates)} consolidation candidates")
        logger.info(f" - {len(result.recommended_actions)} recommended actions")
        
        # Initiate handoffs based on findings
        await self._initiate_action_handoffs(document, result)
        
        return result
    
    async def _initiate_action_handoffs(self, document: Document, 
                                      result: RedundancyDetectionResult) -> None:
        """
        Initiate handoffs for recommended actions.
        
        Args:
            document: Source document
            result: Redundancy detection result
        """
        # Group actions by type and priority
        action_groups = {}
        
        for action in result.recommended_actions:
            action_type = action["action_type"]
            priority = action["priority"]
            
            key = f"{action_type}_{priority}"
            if key not in action_groups:
                action_groups[key] = []
                
            action_groups[key].append(action)
        
        # Process action groups
        for key, actions in action_groups.items():
            action_type = key.split("_")[0]
            priority_str = key.split("_")[1]
            
            # Map priority string to handoff priority
            priority_map = {
                "high": HandoffPriority.HIGH,
                "medium": HandoffPriority.MEDIUM,
                "low": HandoffPriority.LOW
            }
            priority = priority_map.get(priority_str, HandoffPriority.MEDIUM)
            
            # Determine target agent
            target_agent_id = self._get_agent_for_action(action_type)
            
            # Skip if no agent is configured
            if not target_agent_id:
                logger.warning(f"No agent configured for action type {action_type}")
                continue
                
            # Create context
            context = HandoffContext(
                document_id=document.id,
                document_type=document.document_type,
                document_version=getattr(document, "version", "1.0"),
                metadata={
                    "document_title": document.title,
                    "redundancy_detection_timestamp": result.analyzed_at,
                    "similar_docs_count": len(result.similar_docs),
                    "duplicate_segments_count": len(result.duplicate_segments),
                    "consolidation_candidates_count": len(result.consolidation_candidates)
                }
            )
            
            # Add reasoning step
            context.add_reasoning_step(
                description="Redundancy detection analysis",
                input_data={"document_id": document.id, "title": document.title},
                output={"similar_docs": len(result.similar_docs), 
                        "duplicate_segments": len(result.duplicate_segments)},
                confidence=0.9
            )
            
            # Create task description based on action type
            task_descriptions = {
                "merge_documents": f"Merge document '{document.title}' with similar documents",
                "reorganize_section": f"Reorganize overlapping sections in document '{document.title}'",
                "consolidation_strategy": f"Develop consolidation strategy for document '{document.title}' and related documents",
                "refactor_segments": f"Refactor duplicate segments in document '{document.title}'",
                "add_cross_references": f"Add cross-references to document '{document.title}'"
            }
            
            task = task_descriptions.get(action_type, f"Process redundancy in document '{document.title}'")
            
            # Add actions to context
            if "metadata" not in context.__dict__:
                context.metadata = {}
                
            context.metadata["actions"] = actions
            
            # Initiate handoff
            try:
                handoff_id = await self.handoff_manager.initiate_handoff(
                    recipient_id=target_agent_id,
                    task=task,
                    context=context,
                    priority=priority
                )
                
                logger.info(f"Initiated {action_type} handoff to {target_agent_id} with ID {handoff_id}")
                
            except Exception as e:
                logger.error(f"Error initiating handoff for {action_type}: {e}")
    
    def _get_agent_for_action(self, action_type: str) -> Optional[str]:
        """
        Determine which agent should handle an action type.
        
        Args:
            action_type: Type of action to handle
            
        Returns:
            Agent ID or None if not configured
        """
        # Default agent mappings
        agent_mappings = {
            "merge_documents": self.consolidation_agent_id,
            "reorganize_section": self.refactoring_agent_id,
            "consolidation_strategy": self.consolidation_agent_id,
            "refactor_segments": self.refactoring_agent_id,
            "add_cross_references": self.review_agent_id
        }
        
        # Override with config if provided
        if "agent_mappings" in self.config:
            agent_mappings.update(self.config["agent_mappings"])
            
        return agent_mappings.get(action_type)
    
    async def handle_consolidation_result(self, handoff_id: str, 
                                       result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle the result of a consolidation handoff.
        
        Args:
            handoff_id: Handoff ID
            result: Consolidation result
            
        Returns:
            Processing result
        """
        # Process consolidation result
        # This would typically involve updating the knowledge graph,
        # initiating document updates, etc.
        
        logger.info(f"Processing consolidation result for handoff {handoff_id}")
        
        # Example implementation
        response = {
            "handoff_id": handoff_id,
            "status": "completed",
            "processed_at": datetime.now().isoformat(),
            "actions_taken": []
        }
        
        # Process different result types
        if "consolidated_document_id" in result:
            response["actions_taken"].append({
                "action": "document_consolidated",
                "document_id": result["consolidated_document_id"]
            })
            
        if "updated_documents" in result:
            for doc_id in result["updated_documents"]:
                response["actions_taken"].append({
                    "action": "document_updated",
                    "document_id": doc_id
                })
        
        return response