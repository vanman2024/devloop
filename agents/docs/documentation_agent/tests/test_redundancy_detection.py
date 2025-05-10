"""
Tests for the redundancy detection system.

This module tests the functionality of the redundancy detection
and management system, ensuring it correctly identifies redundancy
and initiates appropriate handoffs.
"""

import unittest
import asyncio
import os
from unittest.mock import MagicMock, patch
from datetime import datetime

from ..core.redundancy_detection import (
    RedundancyDetector, 
    RedundancyManager,
    RedundancyDetectionResult
)
from ..models.document_model import Document
from ..connectors.vector_store_connector import DocumentVectorStoreConnector
from ..connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from ..core.inter_agent_handoff import HandoffManager, HandoffRegistry, HandoffStatus


class TestRedundancyDetection(unittest.TestCase):
    """Test cases for redundancy detection functionality."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create mock connectors
        self.vector_store = MagicMock(spec=DocumentVectorStoreConnector)
        self.knowledge_graph = MagicMock(spec=DocumentKnowledgeGraphConnector)
        
        # Create mock handoff manager
        self.handoff_registry = MagicMock(spec=HandoffRegistry)
        self.handoff_manager = MagicMock(spec=HandoffManager)
        
        # Configure vector store mock
        self.vector_store.find_similar_documents.return_value = asyncio.Future()
        self.vector_store.find_similar_documents.return_value.set_result([
            {"id": "doc2", "similarity": 0.85},
            {"id": "doc3", "similarity": 0.72}
        ])
        
        self.vector_store.find_candidate_documents.return_value = asyncio.Future()
        self.vector_store.find_candidate_documents.return_value.set_result(["doc2", "doc3"])
        
        # Configure knowledge graph mock
        self.knowledge_graph.get_document_relationships.return_value = asyncio.Future()
        self.knowledge_graph.get_document_relationships.return_value.set_result([
            {"target_id": "doc2", "relationship_type": "related_to", "properties": {}, "strength": 0.9}
        ])
        
        self.knowledge_graph.find_related_documents.return_value = asyncio.Future()
        self.knowledge_graph.find_related_documents.return_value.set_result(["doc2", "doc3"])
        
        self.knowledge_graph.get_document.return_value = asyncio.Future()
        self.knowledge_graph.get_document.return_value.set_result({
            "id": "doc2",
            "title": "Related Document",
            "content": "This is related content with some overlap to the source document.",
            "document_type": "markdown"
        })
        
        # Configure handoff manager mock
        self.handoff_manager.initiate_handoff.return_value = asyncio.Future()
        self.handoff_manager.initiate_handoff.return_value.set_result("handoff123")
        
        # Create detector and manager
        self.detector = RedundancyDetector(
            vector_store=self.vector_store,
            knowledge_graph=self.knowledge_graph,
            config={"similarity_threshold": 0.7}
        )
        
        self.manager = RedundancyManager(
            detector=self.detector,
            handoff_manager=self.handoff_manager,
            config={
                "consolidation_agent_id": "consolidation_agent",
                "refactoring_agent_id": "refactoring_agent"
            }
        )
        
        # Create test document
        self.document = Document(
            id="doc1",
            title="Test Document",
            content="This is a test document with some content for redundancy detection testing.",
            document_type="markdown"
        )
    
    def test_redundancy_detection_result_init(self):
        """Test RedundancyDetectionResult initialization."""
        result = RedundancyDetectionResult(
            source_doc_id="doc1",
            source_doc_title="Test Document"
        )
        
        self.assertEqual(result.source_doc_id, "doc1")
        self.assertEqual(result.source_doc_title, "Test Document")
        self.assertEqual(len(result.duplicate_segments), 0)
        self.assertEqual(len(result.similar_docs), 0)
        self.assertEqual(len(result.consolidation_candidates), 0)
        self.assertEqual(len(result.recommended_actions), 0)
    
    def test_compute_jaccard_similarity(self):
        """Test Jaccard similarity computation."""
        segment1 = "This is a test document"
        segment2 = "This is a similar document"
        
        similarity = self.detector._compute_jaccard_similarity(segment1, segment2)
        
        # 3 common words out of 5 unique words
        self.assertAlmostEqual(similarity, 3/5, places=2)
    
    def test_split_into_segments(self):
        """Test document segmentation."""
        content = "This is paragraph 1.\n\nThis is paragraph 2.\n\nThis is paragraph 3."
        segments = self.detector._split_into_segments(content)
        
        self.assertEqual(len(segments), 1)  # Small paragraphs combined into one segment
        
        # Test with longer content
        long_content = "A" * 300 + "\n\n" + "B" * 300 + "\n\n" + "C" * 300
        segments = self.detector._split_into_segments(long_content)
        
        self.assertEqual(len(segments), 3)  # Each paragraph should be its own segment
    
    @patch('sklearn.feature_extraction.text.TfidfVectorizer')
    @patch('sklearn.metrics.pairwise.cosine_similarity')
    def test_compute_segment_similarity(self, mock_cosine, mock_tfidf):
        """Test segment similarity computation."""
        # Mock TF-IDF and cosine similarity
        mock_tfidf_instance = MagicMock()
        mock_tfidf.return_value = mock_tfidf_instance
        mock_tfidf_instance.fit_transform.return_value = "transformed"
        mock_cosine.return_value = [[0.75]]
        
        segment1 = "This is a test segment"
        segment2 = "This is a similar segment"
        
        similarity = self.detector._compute_segment_similarity(segment1, segment2)
        
        self.assertEqual(similarity, 0.75)
        mock_tfidf_instance.fit_transform.assert_called_once()
        mock_cosine.assert_called_once()
    
    @patch('asyncio.gather')
    async def test_detect_redundancy(self, mock_gather):
        """Test redundancy detection integration."""
        # Mock gather to return predefined results
        mock_gather.return_value = [
            {"doc2": 0.85, "doc3": 0.72},  # vector results
            {"doc2": {"similarity": 0.8, "duplicate_segments": [{"text": "overlap", "similarity": 0.9}]}},  # content results
            {"doc2": {"relationship_type": "related_to"}},  # kg results
            {"doc2": [{"source_section": "Introduction", "related_section": "Overview"}]}  # section results
        ]
        
        result = await self.detector.detect_redundancy(self.document)
        
        self.assertEqual(result.source_doc_id, "doc1")
        self.assertEqual(result.source_doc_title, "Test Document")
        
        # Check if at least one similar doc was found
        self.assertTrue(len(result.similar_docs) > 0)
        
        # Ensure mock_gather was called
        mock_gather.assert_called_once()
    
    async def test_process_document(self):
        """Test the document processing workflow."""
        # Mock detector to return predefined result
        mock_result = RedundancyDetectionResult(
            source_doc_id="doc1",
            source_doc_title="Test Document"
        )
        mock_result.similar_docs = [{"id": "doc2", "title": "Related Doc", "similarity_score": 0.85}]
        mock_result.recommended_actions = [
            {"action_type": "merge_documents", "priority": "high", "description": "Merge with similar document"}
        ]
        
        self.detector.detect_redundancy = MagicMock(return_value=asyncio.Future())
        self.detector.detect_redundancy.return_value.set_result(mock_result)
        
        result = await self.manager.process_document(self.document)
        
        # Verify detector was called
        self.detector.detect_redundancy.assert_called_once_with(self.document)
        
        # Verify handoff was initiated
        self.handoff_manager.initiate_handoff.assert_called_once()
        
        # Verify result was returned
        self.assertEqual(result.source_doc_id, "doc1")
        self.assertEqual(len(result.similar_docs), 1)
        self.assertEqual(len(result.recommended_actions), 1)
    
    def test_get_agent_for_action(self):
        """Test agent selection for different action types."""
        consolidation_agent = self.manager._get_agent_for_action("merge_documents")
        refactoring_agent = self.manager._get_agent_for_action("refactor_segments")
        
        self.assertEqual(consolidation_agent, "consolidation_agent")
        self.assertEqual(refactoring_agent, "refactoring_agent")
        
        # Test with custom mapping
        self.manager.config["agent_mappings"] = {"merge_documents": "custom_agent"}
        custom_agent = self.manager._get_agent_for_action("merge_documents")
        self.assertEqual(custom_agent, "custom_agent")


if __name__ == '__main__':
    unittest.main()