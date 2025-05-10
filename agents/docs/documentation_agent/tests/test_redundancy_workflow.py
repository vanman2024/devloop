"""
Integration tests for the redundancy detection and management workflow.

This module tests the end-to-end flow of the redundancy detection system,
ensuring that the redundancy detection, handoffs, and consolidation
components work together properly.
"""

import unittest
import asyncio
import os
from datetime import datetime
from unittest.mock import MagicMock, patch

from ..core.redundancy_detection import (
    RedundancyDetector, 
    RedundancyManager,
    RedundancyDetectionResult
)
from ..models.document_model import Document
from ..connectors.vector_store_connector import DocumentVectorStoreConnector
from ..connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from ..core.inter_agent_handoff import (
    HandoffManager, 
    HandoffRegistry, 
    HandoffStatus,
    HandoffContext,
    HandoffRequest,
    HandoffCompletion
)
from ..agents.document_consolidation_agent import DocumentConsolidationAgent


class TestRedundancyWorkflow(unittest.TestCase):
    """Test cases for redundancy workflow."""
    
    def setUp(self):
        """Set up test fixtures."""
        # Create mock connectors
        self.vector_store = MagicMock(spec=DocumentVectorStoreConnector)
        self.knowledge_graph = MagicMock(spec=DocumentKnowledgeGraphConnector)
        
        # Create mock handoff registry and manager
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
        
        self.handoff_manager.accept_handoff.return_value = asyncio.Future()
        self.handoff_manager.accept_handoff.return_value.set_result(True)
        
        self.handoff_manager.complete_handoff.return_value = asyncio.Future()
        self.handoff_manager.complete_handoff.return_value.set_result(True)
        
        # Create components
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
        
        self.consolidation_agent = DocumentConsolidationAgent(
            agent_id="consolidation_agent",
            knowledge_graph=self.knowledge_graph,
            vector_store=self.vector_store,
            handoff_manager=self.handoff_manager
        )
        
        # Create test documents
        self.document = Document(
            id="doc1",
            title="Test Document",
            content="This is a test document with some content for redundancy detection testing.",
            document_type="markdown"
        )
        
        self.related_doc = Document(
            id="doc2",
            title="Related Document",
            content="This is related content with some overlap to the source document.",
            document_type="markdown"
        )
    
    async def test_end_to_end_workflow(self):
        """Test end-to-end workflow from detection to consolidation."""
        # Mock the redundancy detection result
        result = RedundancyDetectionResult(
            source_doc_id=self.document.id,
            source_doc_title=self.document.title
        )
        result.similar_docs = [
            {
                "id": "doc2",
                "title": "Related Document",
                "similarity_score": 0.85,
                "overlapping_sections": []
            }
        ]
        result.recommended_actions = [
            {
                "action_type": "merge_documents",
                "priority": "high",
                "description": "Merge with similar document",
                "target_document_id": "doc2"
            }
        ]
        
        # Patch the detector to return our mock result
        self.detector.detect_redundancy = MagicMock(return_value=asyncio.Future())
        self.detector.detect_redundancy.return_value.set_result(result)
        
        # Process the document through RedundancyManager
        manager_result = await self.manager.process_document(self.document)
        
        # Verify detector was called
        self.detector.detect_redundancy.assert_called_once_with(self.document)
        
        # Verify handoff was initiated to the consolidation agent
        self.handoff_manager.initiate_handoff.assert_called_once()
        call_args = self.handoff_manager.initiate_handoff.call_args[1]
        self.assertEqual(call_args["recipient_id"], "consolidation_agent")
        
        # Now create a mock handoff context for the consolidation agent
        handoff_context = HandoffContext(
            document_id=self.document.id,
            document_type="markdown",
            metadata={
                "actions": [
                    {
                        "action_type": "merge_documents",
                        "priority": "high",
                        "description": "Merge with similar document",
                        "target_document_id": "doc2"
                    }
                ]
            }
        )
        
        # Mock document retrieval
        async def mock_get_document(doc_id):
            if doc_id == "doc1":
                return self.document
            elif doc_id == "doc2":
                return self.related_doc
            return None
        
        self.consolidation_agent._get_document = mock_get_document
        
        # Mock merge and store functions
        merged_doc = Document(
            id="merged_doc1_20250101000000",
            title="Merged: Test Document",
            content="This is a merged document combining content from multiple sources.",
            document_type="markdown"
        )
        
        self.consolidation_agent._merge_documents = MagicMock(return_value=asyncio.Future())
        self.consolidation_agent._merge_documents.return_value.set_result(merged_doc)
        
        self.consolidation_agent._store_merged_document = MagicMock(return_value=asyncio.Future())
        self.consolidation_agent._store_merged_document.return_value.set_result(merged_doc.id)
        
        self.consolidation_agent._update_relationships = MagicMock(return_value=asyncio.Future())
        self.consolidation_agent._update_relationships.return_value.set_result(None)
        
        self.consolidation_agent._request_human_review = MagicMock(return_value=asyncio.Future())
        self.consolidation_agent._request_human_review.return_value.set_result(None)
        
        # Process the handoff in the consolidation agent
        consolidation_result = await self.consolidation_agent.process_handoff(
            handoff_id="handoff123",
            handoff_context=handoff_context,
            task="Merge with similar document"
        )
        
        # Verify consolidation agent accepted the handoff
        self.handoff_manager.accept_handoff.assert_called_once_with("handoff123")
        
        # Verify document merge was attempted
        self.consolidation_agent._merge_documents.assert_called_once()
        self.consolidation_agent._store_merged_document.assert_called_once()
        self.consolidation_agent._update_relationships.assert_called_once()
        
        # Verify handoff was completed
        self.handoff_manager.complete_handoff.assert_called_once()
        
        # Verify the consolidation result
        self.assertEqual(consolidation_result["status"], "success")
        self.assertEqual(consolidation_result["consolidated_document_id"], merged_doc.id)
        self.assertEqual(consolidation_result["source_document_id"], self.document.id)
        self.assertEqual(consolidation_result["merged_document_ids"], [self.related_doc.id])
    
    @patch('asyncio.gather')
    async def test_detect_redundancy_integration(self, mock_gather):
        """Test redundancy detection integration with all components."""
        # Restore the original detect_redundancy method
        self.detector.detect_redundancy = RedundancyDetector.detect_redundancy.__get__(
            self.detector, RedundancyDetector
        )
        
        # Mock gather to return predefined results
        mock_gather.return_value = [
            {"doc2": 0.85, "doc3": 0.72},  # vector results
            {"doc2": {"similarity": 0.8, "duplicate_segments": [{"text": "overlap", "similarity": 0.9}]}},  # content results
            {"doc2": {"relationship_type": "related_to"}},  # kg results
            {"doc2": [{"source_section": "Introduction", "related_section": "Overview"}]}  # section results
        ]
        
        # Mock _generate_recommendations to avoid complex LLM interactions
        async def mock_generate_recommendations(document, result):
            result.recommended_actions = [
                {
                    "action_type": "merge_documents",
                    "priority": "high",
                    "description": f"Merge document '{document.title}' with similar document 'Related Document'",
                    "target_document_id": "doc2",
                    "similarity_score": 0.85
                }
            ]
        
        self.detector._generate_recommendations = mock_generate_recommendations
        
        # Mock _get_document_details to avoid knowledge graph calls
        async def mock_get_document_details(doc_id):
            return {
                "id": doc_id,
                "title": "Related Document" if doc_id == "doc2" else "Other Document",
                "content": "This is related content." if doc_id == "doc2" else "This is other content.",
                "document_type": "markdown"
            }
        
        self.detector._get_document_details = mock_get_document_details
        
        # Run redundancy detection
        result = await self.detector.detect_redundancy(self.document)
        
        # Verify detection worked
        self.assertEqual(result.source_doc_id, self.document.id)
        self.assertEqual(result.source_doc_title, self.document.title)
        
        # Check recommended actions
        self.assertGreaterEqual(len(result.recommended_actions), 1)
        
        # Check that at least one of the actions is a merge action
        merge_actions = [a for a in result.recommended_actions if a["action_type"] == "merge_documents"]
        self.assertGreaterEqual(len(merge_actions), 1)
        
        # Check similar docs were found
        self.assertGreaterEqual(len(result.similar_docs), 1)
    
    async def test_consolidation_agent_merge_documents(self):
        """Test document merging in consolidation agent."""
        # Mock document retrieval
        async def mock_get_document(doc_id):
            if doc_id == "doc1":
                return self.document
            elif doc_id == "doc2":
                return self.related_doc
            return None
        
        self.consolidation_agent._get_document = mock_get_document
        
        # Mock _store_merged_document to avoid knowledge graph calls
        self.consolidation_agent._store_merged_document = MagicMock(return_value=asyncio.Future())
        self.consolidation_agent._store_merged_document.return_value.set_result("merged_doc1")
        
        # Mock other methods we don't need to test
        self.consolidation_agent._update_relationships = MagicMock(return_value=asyncio.Future())
        self.consolidation_agent._update_relationships.return_value.set_result(None)
        
        self.consolidation_agent._request_human_review = MagicMock(return_value=asyncio.Future())
        self.consolidation_agent._request_human_review.return_value.set_result(None)
        
        # Call merge_documents directly
        merged_doc = await self.consolidation_agent._merge_documents_rule_based(
            self.document, [self.related_doc]
        )
        
        # Verify result
        self.assertIsNotNone(merged_doc)
        self.assertTrue(merged_doc.id.startswith("merged_"))
        self.assertTrue(merged_doc.title.startswith("Merged:"))
        
        # Verify content merging
        self.assertIn(self.document.content, merged_doc.content)
        self.assertIn("From Related Document", merged_doc.content)  # Content attribution
    
    async def test_consolidation_strategy_development(self):
        """Test consolidation strategy development."""
        # Mock document retrieval
        async def mock_get_document(doc_id):
            if doc_id == "doc1":
                return self.document
            elif doc_id == "doc2":
                return self.related_doc
            return None
        
        self.consolidation_agent._get_document = mock_get_document
        
        # Mock analysis methods
        async def mock_analyze_documents(source_doc, related_docs):
            return {
                "merge_candidates": [
                    [
                        {"id": source_doc.id, "title": source_doc.title, "document": source_doc},
                        {"id": related_docs[0].id, "title": related_docs[0].title, "document": related_docs[0]}
                    ]
                ],
                "section_consolidation": [
                    {
                        "section_name": "Introduction",
                        "normalized_name": "introduction",
                        "documents": [
                            {"id": source_doc.id, "title": source_doc.title},
                            {"id": related_docs[0].id, "title": related_docs[0].title}
                        ],
                        "document_count": 2
                    }
                ],
                "cross_reference_candidates": [],
                "needs_documentation_hub": False
            }
        
        self.consolidation_agent._analyze_documents_for_strategy = mock_analyze_documents
        
        # Mock _store_consolidation_strategy to avoid knowledge graph calls
        self.consolidation_agent._store_consolidation_strategy = MagicMock(return_value=asyncio.Future())
        self.consolidation_agent._store_consolidation_strategy.return_value.set_result("strategy_123")
        
        # Develop strategy
        strategy = await self.consolidation_agent._develop_consolidation_strategy(
            self.document, [self.related_doc]
        )
        
        # Verify strategy creation
        self.assertIsNotNone(strategy)
        self.assertTrue("strategy_id" in strategy)
        self.assertTrue("tasks" in strategy)
        self.assertGreaterEqual(len(strategy["tasks"]), 1)
        
        # Verify tasks were created
        merge_tasks = [t for t in strategy["tasks"] if t["task_type"] == "merge_documents"]
        self.assertGreaterEqual(len(merge_tasks), 1)
        
        # Verify sections consolidation tasks
        section_tasks = [t for t in strategy["tasks"] if t["task_type"] == "consolidate_sections"]
        self.assertGreaterEqual(len(section_tasks), 1)


if __name__ == '__main__':
    # Set up asyncio event loop for tests
    loop = asyncio.get_event_loop()
    
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestRedundancyWorkflow)
    
    # Run tests
    runner = unittest.TextTestRunner()
    result = runner.run(suite)