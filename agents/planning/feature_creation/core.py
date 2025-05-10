#!/usr/bin/env python3
"""
Feature Creation Agent

This agent analyzes feature descriptions and suggests optimal placement
within project structure by integrating with knowledge graph and project
structure data.
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

# Add project root to path to allow importing common modules
PROJECT_ROOT = '/mnt/c/Users/angel/Devloop'
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'feature_creation_agent.log'))
    ]
)
logger = logging.getLogger('feature_creation_agent')

class FeatureCreationAgent:
    """
    Agent responsible for analyzing feature descriptions and suggesting
    optimal placement within project structure.
    """
    
    def __init__(self):
        self.agent_id = "agent-feature-creation"
        self.agent_name = "Feature Creation Agent"
        self.version = "1.0.0"
        self.working_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Initialize tools
        self.feature_analyzer = FeatureAnalyzer()
        self.placement_suggester = PlacementSuggester()
        self.id_generator = IDGenerator()
        self.knowledge_graph_querier = KnowledgeGraphQuerier()
        self.structure_querier = StructureQuerier()
        
        logger.info(f"Initialized {self.agent_name} v{self.version}")
    
    def process_feature_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a feature creation request and return suggested feature details
        
        Args:
            request: Dictionary containing feature request data
                     Required keys: 'name', 'description'
                     Optional keys: 'projectId', 'milestone', 'phase', 'module', 'tags'
        
        Returns:
            Dictionary containing suggested feature details
        """
        logger.info(f"Processing feature request: {request['name']}")
        
        try:
            # Extract feature description and name
            feature_name = request.get('name', '')
            feature_description = request.get('description', '')
            project_id = request.get('projectId')
            
            # Get user-provided values to respect them in suggestions
            user_milestone = request.get('milestone')
            user_phase = request.get('phase')
            user_module = request.get('module')
            user_tags = request.get('tags', [])
            
            # Step 1: Analyze feature description to extract key concepts
            logger.info("Analyzing feature description")
            analysis_result = self.feature_analyzer.analyze(
                feature_name=feature_name,
                feature_description=feature_description
            )
            
            # Step 2: Query knowledge graph for related concepts
            logger.info("Querying knowledge graph")
            knowledge_result = self.knowledge_graph_querier.query(
                concepts=analysis_result['concepts'],
                domain=analysis_result['domain'],
                purpose=analysis_result['purpose']
            )
            
            # Step 3: Query project structure
            logger.info(f"Querying project structure for project {project_id}")
            structure_result = self.structure_querier.query(project_id)
            
            # Step 4: Determine optimal placement
            logger.info("Determining optimal placement")
            placement_result = self.placement_suggester.suggest(
                analysis_result=analysis_result,
                knowledge_result=knowledge_result,
                structure_result=structure_result,
                user_milestone=user_milestone,
                user_phase=user_phase,
                user_module=user_module
            )
            
            # Step 5: Generate feature ID
            logger.info("Generating feature ID")
            feature_id = self.id_generator.generate(
                feature_name=feature_name,
                milestone=placement_result['milestone'],
                project_id=project_id
            )
            
            # Combine user-provided tags with suggested tags
            suggested_tags = knowledge_result.get('suggested_tags', [])
            combined_tags = list(set(user_tags + suggested_tags))
            
            # Create comprehensive feature definition
            feature_result = {
                'id': feature_id,
                'name': feature_name,
                'description': feature_description,
                'suggestedMilestone': placement_result['milestone'],
                'suggestedPhase': placement_result['phase'],
                'suggestedModule': placement_result['module'],
                'suggestedTags': combined_tags,
                'potentialDependencies': knowledge_result.get('potential_dependencies', []),
                'analysisDetails': {
                    'concepts': analysis_result['concepts'],
                    'domain': analysis_result['domain'],
                    'purpose': analysis_result['purpose'],
                    'confidence': placement_result['confidence']
                }
            }
            
            logger.info(f"Feature processing complete: {feature_id}")
            return {
                'success': True,
                'feature': feature_result
            }
            
        except Exception as e:
            logger.error(f"Error processing feature request: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }
    
    def spawn(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initialize the agent with context
        
        Args:
            context: Dictionary containing initialization context
        
        Returns:
            Status response
        """
        logger.info(f"Spawning {self.agent_name} with context")
        
        # Create status file
        status = {
            'agent_id': self.agent_id,
            'name': self.agent_name,
            'status': 'active',
            'spawned_at': datetime.now().isoformat(),
            'context': context
        }
        
        with open(os.path.join(self.working_dir, 'status.json'), 'w') as f:
            json.dump(status, f, indent=2)
        
        return {
            'success': True,
            'message': f"{self.agent_name} spawned successfully",
            'status': status
        }
    
    def retire(self, reason: str = 'API request') -> Dict[str, Any]:
        """
        Retire this agent
        
        Args:
            reason: Reason for retirement
        
        Returns:
            Status response
        """
        logger.info(f"Retiring {self.agent_name}: {reason}")
        
        # Update status file
        status_path = os.path.join(self.working_dir, 'status.json')
        if os.path.exists(status_path):
            with open(status_path, 'r') as f:
                status = json.load(f)
            
            status['status'] = 'retired'
            status['retired_at'] = datetime.now().isoformat()
            status['retire_reason'] = reason
            
            with open(status_path, 'w') as f:
                json.dump(status, f, indent=2)
        
        return {
            'success': True,
            'message': f"{self.agent_name} retired successfully",
            'reason': reason
        }
    
    def status(self) -> Dict[str, Any]:
        """
        Get the current status of this agent
        
        Returns:
            Status information
        """
        logger.info(f"Getting status for {self.agent_name}")
        
        # Read status file
        status_path = os.path.join(self.working_dir, 'status.json')
        if os.path.exists(status_path):
            with open(status_path, 'r') as f:
                status = json.load(f)
        else:
            status = {
                'agent_id': self.agent_id,
                'name': self.agent_name,
                'status': 'inactive',
                'updated_at': datetime.now().isoformat()
            }
        
        return {
            'success': True,
            'status': status
        }
    
    def execute_operation(self, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a specific operation
        
        Args:
            operation: Name of the operation to execute
            params: Parameters for the operation
        
        Returns:
            Result of the operation
        """
        logger.info(f"Executing operation {operation} with params: {params}")
        
        # Define custom operation adapters to handle different parameter naming conventions
        def analyze_feature_adapter(params):
            # Handle both feature_name/feature_description and name/description parameter styles
            name = params.get('feature_name', params.get('name', ''))
            description = params.get('feature_description', params.get('description', ''))
            return self.feature_analyzer.analyze(feature_name=name, feature_description=description)
        
        def generate_id_adapter(params):
            # Handle different parameter styles
            name = params.get('feature_name', params.get('name', ''))
            milestone = params.get('milestone', '')
            project_id = params.get('project_id', None)
            return self.id_generator.generate(feature_name=name, milestone=milestone, project_id=project_id)
        
        operations = {
            'process_feature': self.process_feature_request,
            'analyze_feature': analyze_feature_adapter,
            'suggest_placement': self.placement_suggester.suggest,
            'generate_id': generate_id_adapter,
            'query_knowledge': self.knowledge_graph_querier.query,
            'query_structure': self.structure_querier.query
        }
        
        if operation not in operations:
            return {
                'success': False,
                'error': f"Unknown operation: {operation}"
            }
        
        try:
            result = operations[operation](params)
            return {
                'success': True,
                'result': result
            }
        except Exception as e:
            logger.error(f"Error executing operation {operation}: {str(e)}", exc_info=True)
            return {
                'success': False,
                'error': str(e)
            }


class FeatureAnalyzer:
    """Tool for analyzing feature descriptions to extract key concepts"""
    
    def analyze(self, feature_name: str, feature_description: str) -> Dict[str, Any]:
        """
        Analyze feature description to extract key concepts
        
        Args:
            feature_name: Name of the feature
            feature_description: Description of the feature
        
        Returns:
            Dictionary containing extracted concepts, domain, and purpose
        """
        logger.info(f"Analyzing feature: {feature_name}")
        
        # This is a simplified mock implementation
        # In a real implementation, this would use NLP techniques for concept extraction
        
        # Extract concepts from name and description
        text = (feature_name + " " + feature_description).lower()
        
        # Determine domain based on keywords
        domain = "unknown"
        purpose = "enhancement"
        
        # Simple keyword matching for domain
        if any(kw in text for kw in ['test', 'validation', 'verify', 'assert']):
            domain = "testing"
        elif any(kw in text for kw in ['ui', 'interface', 'dashboard', 'display', 'view']):
            domain = "ui"
        elif any(kw in text for kw in ['data', 'database', 'storage', 'model']):
            domain = "data"
        elif any(kw in text for kw in ['api', 'endpoint', 'service', 'request']):
            domain = "api"
        elif any(kw in text for kw in ['agent', 'ai', 'model', 'intelligence']):
            domain = "agent"
        
        # Simple keyword matching for purpose
        if any(kw in text for kw in ['fix', 'bug', 'issue', 'problem', 'crash']):
            purpose = "bugfix"
        elif any(kw in text for kw in ['new', 'create', 'implement', 'introduce']):
            purpose = "new_feature"
        elif any(kw in text for kw in ['enhance', 'improve', 'upgrade', 'better']):
            purpose = "enhancement"
        elif any(kw in text for kw in ['refactor', 'clean', 'reorganize', 'restructure']):
            purpose = "refactoring"
        
        # Extract simple concepts (words that might be important)
        # In a real implementation, this would use more sophisticated NLP
        words = text.split()
        concepts = [w for w in words if len(w) > 4 and w not in [
            'feature', 'implement', 'implementation', 'should', 'would', 
            'could', 'provides', 'system', 'enable', 'allows'
        ]]
        concepts = list(set(concepts))[:5]  # Limit to 5 unique concepts
        
        return {
            'concepts': concepts,
            'domain': domain,
            'purpose': purpose
        }


class PlacementSuggester:
    """Tool for suggesting optimal placement in project structure"""
    
    def suggest(self, 
                analysis_result: Dict[str, Any],
                knowledge_result: Dict[str, Any],
                structure_result: Dict[str, Any],
                user_milestone: Optional[str] = None,
                user_phase: Optional[str] = None,
                user_module: Optional[str] = None) -> Dict[str, Any]:
        """
        Suggest optimal placement for a feature
        
        Args:
            analysis_result: Result from feature analyzer
            knowledge_result: Result from knowledge graph querier
            structure_result: Result from structure querier
            user_milestone: User-provided milestone ID (optional)
            user_phase: User-provided phase ID (optional)
            user_module: User-provided module ID (optional)
        
        Returns:
            Dictionary containing suggested milestone, phase, and module
        """
        logger.info("Suggesting placement for feature")
        
        # This is a simplified mock implementation
        
        # Respect user-provided values when available
        if user_milestone and user_phase and user_module:
            return {
                'milestone': user_milestone,
                'phase': user_phase,
                'module': user_module,
                'confidence': 1.0  # High confidence because user provided all values
            }
        
        # Get domain and purpose from analysis
        domain = analysis_result.get('domain', 'unknown')
        purpose = analysis_result.get('purpose', 'enhancement')
        
        # Get suggested placement from knowledge graph
        kg_milestone = knowledge_result.get('suggested_milestone')
        kg_phase = knowledge_result.get('suggested_phase')
        kg_module = knowledge_result.get('suggested_module')
        
        # Default values from structure (first available options)
        default_milestone = None
        default_phase = None
        default_module = None
        
        # Extract available options from structure
        if structure_result and 'milestones' in structure_result:
            if structure_result['milestones']:
                default_milestone = structure_result['milestones'][0]['id']
                
                if 'phases' in structure_result['milestones'][0]:
                    if structure_result['milestones'][0]['phases']:
                        default_phase = structure_result['milestones'][0]['phases'][0]['id']
                        
                        if 'modules' in structure_result['milestones'][0]['phases'][0]:
                            if structure_result['milestones'][0]['phases'][0]['modules']:
                                default_module = structure_result['milestones'][0]['phases'][0]['modules'][0]['id']
        
        # Domain-specific default suggestions (simplified rules)
        domain_suggestions = {
            'testing': {
                'milestone': 'milestone-integrated-testing',
                'phase': 'phase-01',
                'module': 'test-core'
            },
            'ui': {
                'milestone': 'milestone-ui-dashboard',
                'phase': 'phase-04',
                'module': 'ui-enhancements'
            },
            'data': {
                'milestone': 'milestone-core-foundation',
                'phase': 'phase-01',
                'module': 'core-infrastructure'
            },
            'api': {
                'milestone': 'milestone-github-integration',
                'phase': 'phase-04',
                'module': 'github-lifecycle'
            },
            'agent': {
                'milestone': 'milestone-agent-ecosystem',
                'phase': 'phase-03',
                'module': 'agent-foundations'
            }
        }
        
        # Determine best suggestion with priority order:
        # 1. User-provided values
        # 2. Knowledge graph suggestions
        # 3. Domain-specific defaults
        # 4. Structure defaults
        
        suggested_milestone = user_milestone or kg_milestone or \
                             domain_suggestions.get(domain, {}).get('milestone') or \
                             default_milestone or 'milestone-core-foundation'
        
        suggested_phase = user_phase or kg_phase or \
                         domain_suggestions.get(domain, {}).get('phase') or \
                         default_phase or 'phase-01'
                         
        suggested_module = user_module or kg_module or \
                          domain_suggestions.get(domain, {}).get('module') or \
                          default_module or 'core-infrastructure'
        
        # Calculate confidence score (simplified)
        confidence = 0.7  # Base confidence
        
        # Adjust based on available information
        if user_milestone:
            confidence += 0.1
        if user_phase:
            confidence += 0.1
        if user_module:
            confidence += 0.1
        if kg_milestone:
            confidence += 0.05
        
        # Cap at 1.0
        confidence = min(confidence, 1.0)
        
        return {
            'milestone': suggested_milestone,
            'phase': suggested_phase,
            'module': suggested_module,
            'confidence': confidence
        }


class IDGenerator:
    """Tool for generating feature IDs following project conventions"""
    
    def generate(self, feature_name: str, milestone: str, project_id: Optional[str] = None) -> str:
        """
        Generate a feature ID based on the feature name and conventions
        
        Args:
            feature_name: Name of the feature
            milestone: Milestone ID
            project_id: Project ID (optional)
        
        Returns:
            Generated feature ID
        """
        logger.info(f"Generating ID for feature: {feature_name}")
        
        # This is a simplified mock implementation
        
        # Generate a 4-digit feature number
        # In a real implementation, this would query the database for the next available number
        import random
        feature_number = random.randint(1000, 9999)
        
        # Clean up feature name for ID portion
        import re
        name_part = feature_name.lower()
        name_part = re.sub(r'[^a-z0-9\s]', '', name_part)  # Remove non-alphanumeric
        name_part = re.sub(r'\s+', '-', name_part)  # Replace spaces with hyphens
        name_part = name_part.strip('-')  # Remove leading/trailing hyphens
        
        # Truncate to keep ID reasonably short
        name_part = name_part[:30]
        
        # Create ID in format: feature-XXXX-name
        feature_id = f"feature-{feature_number}-{name_part}"
        
        return feature_id


class KnowledgeGraphQuerier:
    """Tool for querying the knowledge graph for related concepts"""
    
    def query(self, concepts: List[str], domain: str, purpose: str) -> Dict[str, Any]:
        """
        Query the knowledge graph for related concepts and suggestions
        
        Args:
            concepts: List of extracted concepts
            domain: Identified domain
            purpose: Identified purpose
        
        Returns:
            Dictionary containing query results
        """
        logger.info(f"Querying knowledge graph for domain: {domain}, purpose: {purpose}")
        
        # This is a simplified mock implementation
        # In a real implementation, this would query a knowledge graph API
        
        # Mock knowledge graph data
        kg_data = {
            'testing': {
                'suggested_milestone': 'milestone-integrated-testing',
                'suggested_phase': 'phase-02',
                'suggested_module': 'test-progression',
                'suggested_tags': ['test', 'automation', 'validation'],
                'potential_dependencies': [
                    {'id': 'feature-1001', 'name': 'Database Schema', 'type': 'feature'},
                    {'id': 'feature-1103', 'name': 'Template Parser', 'type': 'feature'}
                ]
            },
            'ui': {
                'suggested_milestone': 'milestone-ui-dashboard',
                'suggested_phase': 'phase-04',
                'suggested_module': 'feature-improvements',
                'suggested_tags': ['ui', 'interface', 'ux', 'frontend'],
                'potential_dependencies': [
                    {'id': 'feature-2101', 'name': 'Dynamic Tree View', 'type': 'feature'},
                    {'id': 'feature-2102', 'name': 'Network Visualization', 'type': 'feature'}
                ]
            },
            'data': {
                'suggested_milestone': 'milestone-core-foundation',
                'suggested_phase': 'phase-01',
                'suggested_module': 'core-infrastructure',
                'suggested_tags': ['data', 'storage', 'persistence'],
                'potential_dependencies': [
                    {'id': 'feature-1001', 'name': 'Database Schema', 'type': 'feature'}
                ]
            },
            'api': {
                'suggested_milestone': 'milestone-github-integration',
                'suggested_phase': 'phase-04',
                'suggested_module': 'github-lifecycle',
                'suggested_tags': ['api', 'integration', 'endpoint'],
                'potential_dependencies': [
                    {'id': 'feature-3001', 'name': 'REST API Framework', 'type': 'feature'}
                ]
            },
            'agent': {
                'suggested_milestone': 'milestone-agent-ecosystem',
                'suggested_phase': 'phase-03',
                'suggested_module': 'knowledge-graph-agents',
                'suggested_tags': ['agent', 'ai', 'ml', 'intelligence'],
                'potential_dependencies': [
                    {'id': 'feature-3101', 'name': 'Relationship Agent', 'type': 'agent'}
                ]
            }
        }
        
        # Get domain-specific suggestions
        result = kg_data.get(domain, {
            'suggested_tags': ['feature'],
            'potential_dependencies': []
        })
        
        # Add concepts as tags
        result['suggested_tags'] = list(set(result.get('suggested_tags', []) + concepts))
        
        # Add purpose-specific tag
        if purpose == 'bugfix':
            result['suggested_tags'].append('bug-fix')
        elif purpose == 'new_feature':
            result['suggested_tags'].append('new-feature')
        elif purpose == 'enhancement':
            result['suggested_tags'].append('enhancement')
        elif purpose == 'refactoring':
            result['suggested_tags'].append('refactoring')
        
        return result


class StructureQuerier:
    """Tool for querying the project structure"""
    
    def query(self, project_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Query the project structure
        
        Args:
            project_id: Project ID to query
        
        Returns:
            Dictionary containing project structure
        """
        logger.info(f"Querying project structure for project: {project_id}")
        
        # This is a simplified mock implementation
        # In a real implementation, this would call the project structure API
        
        # Mock project structure data
        structure = {
            'milestones': [
                {
                    'id': 'milestone-integrated-testing',
                    'name': 'Integrated Testing',
                    'phases': [
                        {
                            'id': 'phase-01',
                            'name': 'Core Testing Framework',
                            'modules': [
                                {'id': 'test-core', 'name': 'Test Core'},
                                {'id': 'test-infrastructure', 'name': 'Test Infrastructure'}
                            ]
                        },
                        {
                            'id': 'phase-02',
                            'name': 'Testing Progression',
                            'modules': [
                                {'id': 'test-progression', 'name': 'Test Progression'},
                                {'id': 'test-automation', 'name': 'Test Automation'}
                            ]
                        }
                    ]
                },
                {
                    'id': 'milestone-ui-dashboard',
                    'name': 'UI Dashboard',
                    'phases': [
                        {
                            'id': 'phase-04',
                            'name': 'Feature Improvements',
                            'modules': [
                                {'id': 'feature-improvements', 'name': 'Feature Improvements'},
                                {'id': 'ui-enhancements', 'name': 'UI Enhancements'}
                            ]
                        },
                        {
                            'id': 'phase-05',
                            'name': 'Dashboard & Status',
                            'modules': [
                                {'id': 'status-display', 'name': 'Status Display'},
                                {'id': 'dashboard-metrics', 'name': 'Dashboard Metrics'}
                            ]
                        }
                    ]
                },
                {
                    'id': 'milestone-core-foundation',
                    'name': 'Core Foundation',
                    'phases': [
                        {
                            'id': 'phase-01',
                            'name': 'Foundation Infrastructure',
                            'modules': [
                                {'id': 'core-infrastructure', 'name': 'Core Infrastructure'},
                                {'id': 'agent-foundations', 'name': 'Agent Foundations'}
                            ]
                        }
                    ]
                },
                {
                    'id': 'milestone-github-integration',
                    'name': 'Github Integration',
                    'phases': [
                        {
                            'id': 'phase-04',
                            'name': 'Github Integration',
                            'modules': [
                                {'id': 'github-lifecycle', 'name': 'Github Lifecycle'},
                                {'id': 'github-sync', 'name': 'Github Sync'}
                            ]
                        }
                    ]
                }
            ]
        }
        
        return structure


def main():
    """Main entry point for the Feature Creation Agent"""
    parser = argparse.ArgumentParser(description='Feature Creation Agent')
    
    # Core command line arguments
    parser.add_argument('--spawn', action='store_true', help='Spawn the agent')
    parser.add_argument('--retire', action='store_true', help='Retire the agent')
    parser.add_argument('--status', action='store_true', help='Get agent status')
    parser.add_argument('--operation', type=str, help='Operation to execute')
    parser.add_argument('--context', type=str, help='Path to context file')
    parser.add_argument('--params', type=str, help='Path to params file')
    parser.add_argument('--reason', type=str, default='API request', help='Reason for retirement')
    
    args = parser.parse_args()
    
    # Create agent instance
    agent = FeatureCreationAgent()
    
    # Process command
    result = None
    
    if args.spawn:
        context = {}
        if args.context and os.path.exists(args.context):
            with open(args.context, 'r') as f:
                context = json.load(f)
        result = agent.spawn(context)
    
    elif args.retire:
        result = agent.retire(args.reason)
    
    elif args.status:
        result = agent.status()
    
    elif args.operation:
        params = {}
        if args.params and os.path.exists(args.params):
            with open(args.params, 'r') as f:
                params = json.load(f)
        result = agent.execute_operation(args.operation, params)
    
    else:
        result = {
            'success': False,
            'error': 'No valid command specified. Use --spawn, --retire, --status, or --operation'
        }
    
    # Print result as JSON
    print(json.dumps(result, indent=2))
    
    # Return success/failure
    return 0 if result.get('success', False) else 1


if __name__ == '__main__':
    sys.exit(main())