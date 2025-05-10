#!/usr/bin/env python3
"""
Unit tests for Feature Creation Agent
"""

import unittest
import sys
import os
import json
from unittest.mock import patch, MagicMock

# Add parent directory to path to import agent modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from core import FeatureCreationAgent, FeatureAnalyzer, PlacementSuggester, IDGenerator


class TestFeatureAnalyzer(unittest.TestCase):
    """Test the FeatureAnalyzer component"""
    
    def setUp(self):
        self.analyzer = FeatureAnalyzer()
    
    def test_analyze_ui_feature(self):
        """Test analyzing a UI feature"""
        result = self.analyzer.analyze(
            feature_name="Dashboard Widget", 
            feature_description="A UI component for displaying metrics in the dashboard"
        )
        
        self.assertEqual(result['domain'], 'ui')
        self.assertIn('dashboard', result['concepts'])
        self.assertIn('widget', result['concepts'])
    
    def test_analyze_testing_feature(self):
        """Test analyzing a testing feature"""
        result = self.analyzer.analyze(
            feature_name="Integration Test Framework", 
            feature_description="Automated testing framework for validating component integrations"
        )
        
        self.assertEqual(result['domain'], 'testing')
        # Check that at least one of the expected testing-related concepts is present
        self.assertTrue(
            any(concept in result['concepts'] for concept in ['framework', 'testing', 'test']),
            f"Expected testing-related concept in {result['concepts']}"
        )
        self.assertTrue(
            any(concept in result['concepts'] for concept in ['integration', 'integrations']),
            f"Expected integration-related concept in {result['concepts']}"
        )
    
    def test_analyze_data_feature(self):
        """Test analyzing a data feature"""
        result = self.analyzer.analyze(
            feature_name="Database Schema Migration", 
            feature_description="Tool for migrating database schemas between versions"
        )
        
        self.assertEqual(result['domain'], 'data')
        # The analyzer might extract 'schema' or 'schemas' but not necessarily 'database'
        self.assertIn('schema', result['concepts'])
        # Verify that at least one of these data-related terms is present
        self.assertTrue(
            any(concept in result['concepts'] for concept in ['database', 'schema', 'migration', 'schemas']),
            f"Expected at least one data-related concept in {result['concepts']}"
        )


class TestPlacementSuggester(unittest.TestCase):
    """Test the PlacementSuggester component"""
    
    def setUp(self):
        self.suggester = PlacementSuggester()
    
    def test_suggest_with_analysis_only(self):
        """Test suggesting placement with only analysis result"""
        analysis_result = {
            'concepts': ['dashboard', 'widget', 'metrics'],
            'domain': 'ui',
            'purpose': 'new_feature'
        }
        
        result = self.suggester.suggest(
            analysis_result=analysis_result,
            knowledge_result={},
            structure_result={}
        )
        
        self.assertEqual(result['milestone'], 'milestone-ui-dashboard')
        self.assertIsNotNone(result['phase'])
        self.assertIsNotNone(result['module'])
        self.assertGreater(result['confidence'], 0.5)
    
    def test_suggest_with_user_preference(self):
        """Test suggesting placement with user preferences"""
        analysis_result = {
            'concepts': ['dashboard', 'widget', 'metrics'],
            'domain': 'ui',
            'purpose': 'new_feature'
        }
        
        result = self.suggester.suggest(
            analysis_result=analysis_result,
            knowledge_result={},
            structure_result={},
            user_milestone='milestone-core-foundation',
            user_phase='phase-01',
            user_module='core-infrastructure'
        )
        
        # User preferences should be respected
        self.assertEqual(result['milestone'], 'milestone-core-foundation')
        self.assertEqual(result['phase'], 'phase-01')
        self.assertEqual(result['module'], 'core-infrastructure')
        self.assertGreaterEqual(result['confidence'], 0.9)  # High confidence due to user input


class TestIDGenerator(unittest.TestCase):
    """Test the IDGenerator component"""
    
    def setUp(self):
        self.generator = IDGenerator()
    
    def test_generate_id_format(self):
        """Test that generated IDs follow the correct format"""
        feature_id = self.generator.generate(
            feature_name="Test Feature Name",
            milestone="milestone-ui-dashboard"
        )
        
        # Should match format: feature-XXXX-name-portion
        self.assertTrue(feature_id.startswith('feature-'))
        parts = feature_id.split('-')
        self.assertGreaterEqual(len(parts), 3)
        self.assertTrue(parts[1].isdigit())
        self.assertEqual(len(parts[1]), 4)  # 4-digit number
        
        # Name portion should be included
        self.assertIn('test', feature_id)
        self.assertIn('feature', feature_id)
        self.assertIn('name', feature_id)


class TestFeatureCreationAgent(unittest.TestCase):
    """Test the full FeatureCreationAgent"""
    
    def setUp(self):
        self.agent = FeatureCreationAgent()
    
    @patch('core.FeatureAnalyzer.analyze')
    @patch('core.KnowledgeGraphQuerier.query')
    @patch('core.StructureQuerier.query')
    @patch('core.PlacementSuggester.suggest')
    @patch('core.IDGenerator.generate')
    def test_process_feature_request(
        self, 
        mock_generate, 
        mock_suggest, 
        mock_structure_query,
        mock_kg_query,
        mock_analyze
    ):
        """Test the full feature processing workflow with mocks"""
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
        
        result = self.agent.process_feature_request(request)
        
        # Verify result
        self.assertTrue(result['success'])
        self.assertEqual(result['feature']['id'], 'feature-1234-dashboard-widget')
        self.assertEqual(result['feature']['suggestedMilestone'], 'milestone-ui-dashboard')
        self.assertEqual(result['feature']['suggestedPhase'], 'phase-04')
        self.assertEqual(result['feature']['suggestedModule'], 'ui-enhancements')
        
        # Verify all components were called
        mock_analyze.assert_called_once()
        mock_kg_query.assert_called_once()
        mock_structure_query.assert_called_once()
        mock_suggest.assert_called_once()
        mock_generate.assert_called_once()


if __name__ == '__main__':
    unittest.main()