#!/usr/bin/env python3
"""
Unit tests for Enhanced Feature Creation Agent
"""

import unittest
import sys
import os
import json
from unittest.mock import patch, MagicMock

# Add parent directory to path to import agent modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from enhanced_core import EnhancedFeatureCreationAgent


class TestEnhancedFeatureCreationAgent(unittest.TestCase):
    """Test the Enhanced Feature Creation Agent"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Create agent with all enhancements disabled for easier testing
        self.agent = EnhancedFeatureCreationAgent(
            use_rag=False, 
            use_langchain=False, 
            use_cache=False
        )
    
    @patch('enhanced_core._analyze_feature')
    @patch('enhanced_core._query_knowledge_graph')
    @patch('enhanced_core._query_structure')
    @patch('enhanced_core._suggest_placement')
    @patch('enhanced_core.IDGenerator.generate')
    def test_process_feature_request_basic(
        self, 
        mock_generate, 
        mock_suggest, 
        mock_structure_query,
        mock_kg_query,
        mock_analyze
    ):
        """Test the basic feature processing workflow with mocks"""
        # Configure mocks
        mock_analyze.return_value = {
            'concepts': ['dashboard', 'widget'],
            'domain': 'ui',
            'purpose': 'new_feature'
        }
        
        mock_kg_query.return_value = {
            'suggested_tags': ['ui', 'dashboard', 'widget'],
            'potential_dependencies': [
                {'id': 'feature-2101', 'name': 'Dynamic Tree View', 'type': 'feature'}
            ]
        }
        
        mock_structure_query.return_value = {
            'milestones': [
                {
                    'id': 'milestone-ui-dashboard',
                    'phases': [{'id': 'phase-04', 'modules': [{'id': 'ui-enhancements'}]}]
                }
            ]
        }
        
        mock_suggest.return_value = {
            'milestone': 'milestone-ui-dashboard',
            'phase': 'phase-04',
            'module': 'ui-enhancements',
            'confidence': 0.8
        }
        
        mock_generate.return_value = 'feature-1234-dashboard-widget'
        
        # Process a feature request
        request = {
            'name': 'Dashboard Widget',
            'description': 'A UI component for displaying metrics'
        }
        
        # Mock the agent's analyze and query methods
        self.agent._analyze_feature = mock_analyze
        self.agent._query_knowledge_graph = mock_kg_query
        self.agent._query_structure = mock_structure_query
        self.agent._suggest_placement = mock_suggest
        
        # Execute the method
        result = self.agent.process_feature_request(request)
        
        # Verify result
        self.assertTrue(result['success'])
        self.assertEqual(result['feature']['id'], 'feature-1234-dashboard-widget')
        self.assertEqual(result['feature']['suggestedMilestone'], 'milestone-ui-dashboard')
        self.assertEqual(result['feature']['suggestedPhase'], 'phase-04')
        self.assertEqual(result['feature']['suggestedModule'], 'ui-enhancements')


class TestEnhancedFeatureCreationAgentWithRAG(unittest.TestCase):
    """Test the Enhanced Feature Creation Agent with RAG enabled"""
    
    @patch('rag_engine.RAGEngine.suggest_placement')
    def test_process_feature_request_with_rag(self, mock_rag_suggest):
        """Test feature processing with RAG engine"""
        # Configure mock
        mock_rag_suggest.return_value = {
            'suggested_milestone': 'milestone-ui-dashboard',
            'suggested_phase': 'phase-04',
            'suggested_module': 'ui-enhancements',
            'suggested_tags': ['ui', 'dashboard', 'widget'],
            'potential_dependencies': [
                {'id': 'feature-2101', 'name': 'Dynamic Tree View', 'type': 'feature'}
            ],
            'confidence': 0.85,
            'analysis': {
                'concepts': ['dashboard', 'widget'],
                'domain': 'ui',
                'purpose': 'new_feature'
            }
        }
        
        # Create agent with RAG enabled
        agent = EnhancedFeatureCreationAgent(
            use_rag=True, 
            use_langchain=False, 
            use_cache=False
        )
        
        # Replace actual RAG engine with mock
        agent.rag_engine = MagicMock()
        agent.rag_engine.suggest_placement = mock_rag_suggest
        
        # Mock ID generator
        agent.id_generator = MagicMock()
        agent.id_generator.generate.return_value = 'feature-1234-dashboard-widget'
        
        # Process a feature request
        request = {
            'name': 'Dashboard Widget',
            'description': 'A UI component for displaying metrics'
        }
        
        # Execute the method
        result = agent.process_feature_request(request)
        
        # Verify result
        self.assertTrue(result['success'])
        self.assertEqual(result['feature']['id'], 'feature-1234-dashboard-widget')
        self.assertEqual(result['feature']['suggestedMilestone'], 'milestone-ui-dashboard')
        self.assertEqual(result['feature']['suggestedPhase'], 'phase-04')
        self.assertEqual(result['feature']['suggestedModule'], 'ui-enhancements')
        
        # Verify RAG was called
        mock_rag_suggest.assert_called_once_with('Dashboard Widget', 'A UI component for displaying metrics')


class TestEnhancedFeatureCreationAgentWithLangChain(unittest.TestCase):
    """Test the Enhanced Feature Creation Agent with LangChain enabled"""
    
    @patch('langchain_integration.LangChainFeatureAnalyzer.analyze_feature')
    @patch('langchain_integration.LangChainRAG.query')
    @patch('langchain_integration.LangChainPlacementSuggester.suggest')
    def test_process_feature_request_with_langchain(
        self, 
        mock_lc_suggest, 
        mock_lc_query,
        mock_lc_analyze
    ):
        """Test feature processing with LangChain components"""
        # Configure mocks
        mock_lc_analyze.return_value = {
            'concepts': ['dashboard', 'widget'],
            'domain': 'ui',
            'purpose': 'new_feature'
        }
        
        mock_lc_query.return_value = {
            'suggested_tags': ['ui', 'dashboard', 'widget'],
            'potential_dependencies': [
                {'id': 'feature-2101', 'name': 'Dynamic Tree View', 'type': 'feature'}
            ]
        }
        
        mock_lc_suggest.return_value = {
            'milestone': 'milestone-ui-dashboard',
            'phase': 'phase-04',
            'module': 'ui-enhancements',
            'confidence': 0.8
        }
        
        # Create agent with LangChain enabled
        agent = EnhancedFeatureCreationAgent(
            use_rag=False, 
            use_langchain=True, 
            use_cache=False
        )
        
        # Replace actual LangChain components with mocks
        agent.feature_analyzer = MagicMock()
        agent.feature_analyzer.analyze_feature = mock_lc_analyze
        
        agent.rag_system = MagicMock()
        agent.rag_system.query = mock_lc_query
        
        agent.placement_suggester = MagicMock()
        agent.placement_suggester.suggest = mock_lc_suggest
        
        # Mock structure query
        agent._query_structure = MagicMock()
        agent._query_structure.return_value = {
            'milestones': [
                {
                    'id': 'milestone-ui-dashboard',
                    'phases': [{'id': 'phase-04', 'modules': [{'id': 'ui-enhancements'}]}]
                }
            ]
        }
        
        # Mock ID generator
        agent.id_generator = MagicMock()
        agent.id_generator.generate.return_value = 'feature-1234-dashboard-widget'
        
        # Process a feature request
        request = {
            'name': 'Dashboard Widget',
            'description': 'A UI component for displaying metrics'
        }
        
        # Execute the method
        result = agent.process_feature_request(request)
        
        # Verify result
        self.assertTrue(result['success'])
        self.assertEqual(result['feature']['id'], 'feature-1234-dashboard-widget')
        self.assertEqual(result['feature']['suggestedMilestone'], 'milestone-ui-dashboard')
        self.assertEqual(result['feature']['suggestedPhase'], 'phase-04')
        self.assertEqual(result['feature']['suggestedModule'], 'ui-enhancements')
        
        # Verify LangChain components were called
        mock_lc_analyze.assert_called_once()
        mock_lc_query.assert_called_once()
        mock_lc_suggest.assert_called_once()


if __name__ == '__main__':
    unittest.main()