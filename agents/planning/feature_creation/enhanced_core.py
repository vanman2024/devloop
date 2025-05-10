#!/usr/bin/env python3
"""
Enhanced Feature Creation Agent with Vector Store, LangChain, Knowledge Graph, and Redis

This agent analyzes feature descriptions and suggests optimal placement
within project structure by integrating with knowledge graph, vector storage,
Redis caching, and LangChain-based RAG capabilities.
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

# Determine project root directory dynamically
current_dir = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.normpath(os.path.join(current_dir, '..', '..', '..'))
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

# Import config and LLM connector
try:
    from config import get_config, is_llm_available
    from llm_connector import get_llm_connector
    
    # Check if LLM is available
    LLM_AVAILABLE = is_llm_available()
    
    if LLM_AVAILABLE:
        logger.info("LLM is available and will be used")
    else:
        logger.warning("LLM is not available - using fallback mechanisms")
except ImportError as e:
    logger.warning(f"Could not import config or LLM connector: {e}")
    LLM_AVAILABLE = False

# Import local modules
try:
    from vector_store import get_vector_store
    from knowledge_graph_connector import get_knowledge_graph_connector
    from mongo_connector import get_mongo_connector
    from redis_cache import get_redis_cache, cached
    from langchain_integration import get_feature_analyzer, get_placement_suggester, get_rag_system
    from rag_engine import get_rag_engine
except ImportError:
    from agents.planning.feature_creation.vector_store import get_vector_store
    from agents.planning.feature_creation.knowledge_graph_connector import get_knowledge_graph_connector
    from agents.planning.feature_creation.mongo_connector import get_mongo_connector
    from agents.planning.feature_creation.redis_cache import get_redis_cache, cached
    from agents.planning.feature_creation.langchain_integration import get_feature_analyzer, get_placement_suggester, get_rag_system
    from agents.planning.feature_creation.rag_engine import get_rag_engine
    
# Try to import tag manager
try:
    from tag_management import get_tag_manager
    TAG_MANAGER_AVAILABLE = True
except ImportError:
    try:
        from agents.planning.feature_creation.tag_management import get_tag_manager
        TAG_MANAGER_AVAILABLE = True
    except ImportError:
        TAG_MANAGER_AVAILABLE = False

class EnhancedFeatureCreationAgent:
    """
    Enhanced Feature Creation Agent with Vector Store, LangChain, Knowledge Graph, and Redis
    
    This agent analyzes feature descriptions and suggests optimal placement
    within project structure using advanced NLP and graph-based techniques.
    """
    
    def __init__(self, use_rag: bool = True, use_langchain: bool = True, use_cache: bool = True):
        """
        Initialize the enhanced feature creation agent
        
        Args:
            use_rag: Whether to use the RAG engine
            use_langchain: Whether to use LangChain components
            use_cache: Whether to use Redis caching
        """
        self.agent_id = "agent-feature-creation"
        self.agent_name = "Enhanced Feature Creation Agent"
        self.version = "2.0.0"
        self.working_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Configuration
        self.use_rag = use_rag
        self.use_langchain = use_langchain
        self.use_cache = use_cache
        
        # Initialize integrations
        self._init_integrations()
        
        logger.info(f"Initialized {self.agent_name} v{self.version}")
        logger.info(f"Using RAG: {self.use_rag}, LangChain: {self.use_langchain}, Cache: {self.use_cache}")
    
    def _init_integrations(self):
        """Initialize all integrations"""
        try:
            # Initialize vector store
            self.vector_store = get_vector_store()
            
            # Initialize knowledge graph connector
            self.kg_connector = get_knowledge_graph_connector()
            
            # Initialize MongoDB connector
            self.mongo_connector = get_mongo_connector()
            
            # Initialize Redis cache
            if self.use_cache:
                self.redis_cache = get_redis_cache()
            
            # Initialize tag manager if available
            if 'TAG_MANAGER_AVAILABLE' in globals() and TAG_MANAGER_AVAILABLE:
                self.tag_manager = get_tag_manager()
                logger.info("Tag manager initialized")
            else:
                self.tag_manager = None
                logger.info("Tag manager not available")
            
            # Initialize LangChain components if enabled
            if self.use_langchain:
                self.feature_analyzer = get_feature_analyzer()
                self.placement_suggester = get_placement_suggester()
                self.rag_system = get_rag_system()
            else:
                # Use basic implementations
                from core import FeatureAnalyzer, PlacementSuggester
                self.feature_analyzer = FeatureAnalyzer()
                self.placement_suggester = PlacementSuggester()
            
            # Initialize RAG engine if enabled
            if self.use_rag:
                self.rag_engine = get_rag_engine()
            
            # Initialize ID generator
            from core import IDGenerator
            self.id_generator = IDGenerator()
            
        except Exception as e:
            logger.error(f"Error initializing integrations: {str(e)}", exc_info=True)
            # Fall back to basic implementations
            from core import FeatureAnalyzer, PlacementSuggester, IDGenerator
            self.feature_analyzer = FeatureAnalyzer()
            self.placement_suggester = PlacementSuggester()
            self.id_generator = IDGenerator()
            self.use_rag = False
            self.use_langchain = False
    
    @cached("analyze_feature", ttl=3600)
    def _analyze_feature(self, feature_name: str, feature_description: str) -> Dict[str, Any]:
        """
        Analyze a feature description using the appropriate analyzer
        
        Args:
            feature_name: Name of the feature
            feature_description: Description of the feature
            
        Returns:
            Analysis results
        """
        if self.use_langchain:
            return self.feature_analyzer.analyze_feature(feature_name, feature_description)
        else:
            return self.feature_analyzer.analyze(feature_name, feature_description)
    
    @cached("query_knowledge_graph", ttl=3600)
    def _query_knowledge_graph(self, concepts: List[str], domain: str, purpose: str) -> Dict[str, Any]:
        """
        Query the knowledge graph using the appropriate method
        
        Args:
            concepts: Extracted concepts
            domain: Feature domain
            purpose: Feature purpose
            
        Returns:
            Knowledge graph query results
        """
        if self.use_langchain:
            return self.rag_system.query(
                " ".join(concepts),
                domain,
                purpose
            )
        else:
            return self.kg_connector.query_by_concepts(concepts, domain, purpose)
    
    @cached("query_structure", ttl=3600)
    def _query_structure(self, project_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Query the project structure
        
        Args:
            project_id: Optional project ID
            
        Returns:
            Project structure
        """
        return self.mongo_connector.get_project_structure(project_id)
    
    def _suggest_placement(self, analysis_result: Dict[str, Any], knowledge_result: Dict[str, Any],
                          structure_result: Dict[str, Any], user_milestone: Optional[str] = None,
                          user_phase: Optional[str] = None, user_module: Optional[str] = None) -> Dict[str, Any]:
        """
        Suggest optimal placement using the appropriate method
        
        Args:
            analysis_result: Analysis results
            knowledge_result: Knowledge graph query results
            structure_result: Project structure
            user_milestone: User-provided milestone
            user_phase: User-provided phase
            user_module: User-provided module
            
        Returns:
            Placement suggestion
        """
        if self.use_rag:
            # Use RAG engine to suggest placement
            feature_description = analysis_result.get("feature_description", "")
            domain = analysis_result.get("domain", "unknown")
            purpose = analysis_result.get("purpose", "enhancement")
            
            rag_results = self.rag_engine.suggest_placement(
                analysis_result.get("feature_name", ""),
                feature_description
            )
            
            # Respect user preferences
            if user_milestone:
                rag_results["suggested_milestone"] = user_milestone
            if user_phase:
                rag_results["suggested_phase"] = user_phase
            if user_module:
                rag_results["suggested_module"] = user_module
                
            # Ensure confidence is high if user provided values
            if user_milestone and user_phase and user_module:
                rag_results["confidence"] = 1.0
                
            return {
                "milestone": rag_results.get("suggested_milestone"),
                "phase": rag_results.get("suggested_phase"),
                "module": rag_results.get("suggested_module"),
                "confidence": rag_results.get("confidence", 0.7)
            }
            
        elif self.use_langchain:
            return self.placement_suggester.suggest(
                analysis_result,
                knowledge_result,
                structure_result,
                user_milestone,
                user_phase,
                user_module
            )
        else:
            return self.placement_suggester.suggest(
                analysis_result,
                knowledge_result,
                structure_result,
                user_milestone,
                user_phase,
                user_module
            )
    
    @cached("process_feature_request", ttl=60)  # Short cache for feature requests
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
        logger.info(f"Processing feature request: {request.get('name', '')}")
        
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
            
            if self.use_rag:
                # Use RAG engine for the whole process
                logger.info("Using RAG engine for feature processing")
                
                # Create a feature object for RAG processing
                feature_data = {
                    "name": feature_name,
                    "description": feature_description,
                    "user_milestone": user_milestone,
                    "user_phase": user_phase,
                    "user_module": user_module,
                    "user_tags": user_tags
                }
                
                # Process with RAG engine
                rag_results = self.rag_engine.suggest_placement(feature_name, feature_description)
                
                # Respect user preferences
                if user_milestone:
                    rag_results["suggested_milestone"] = user_milestone
                if user_phase:
                    rag_results["suggested_phase"] = user_phase
                if user_module:
                    rag_results["suggested_module"] = user_module
                
                # Generate ID
                feature_id = self.id_generator.generate(
                    feature_name=feature_name,
                    milestone=rag_results.get("suggested_milestone", ""),
                    project_id=project_id
                )
                
                # Combine and process tags
                combined_tags = list(set(user_tags + rag_results.get("suggested_tags", [])))
                
                # Process tags if tag manager is available
                if hasattr(self, 'tag_manager') and self.tag_manager:
                    try:
                        domain = rag_results.get("analysis", {}).get("domain", "unknown")
                        combined_tags = self.tag_manager.process_tags(combined_tags, domain=domain)
                        logger.info(f"Processed {len(combined_tags)} tags using tag manager")
                    except Exception as e:
                        logger.error(f"Error processing tags with tag manager: {e}")
                
                # Create feature result
                feature_result = {
                    'id': feature_id,
                    'name': feature_name,
                    'description': feature_description,
                    'suggestedMilestone': rag_results.get("suggested_milestone"),
                    'suggestedPhase': rag_results.get("suggested_phase"),
                    'suggestedModule': rag_results.get("suggested_module"),
                    'suggestedTags': combined_tags,
                    'potentialDependencies': rag_results.get("potential_dependencies", []),
                    'analysisDetails': {
                        'concepts': rag_results.get("analysis", {}).get("concepts", []),
                        'domain': rag_results.get("analysis", {}).get("domain", "unknown"),
                        'purpose': rag_results.get("analysis", {}).get("purpose", "enhancement"),
                        'confidence': rag_results.get("confidence", 0.7)
                    }
                }
                
            else:
                # Use the standard pipeline
                logger.info("Using standard pipeline for feature processing")
                
                # Step 1: Analyze feature description to extract key concepts
                logger.info("Analyzing feature description")
                analysis_result = self._analyze_feature(
                    feature_name=feature_name,
                    feature_description=feature_description
                )
                
                # Add feature name and description to analysis result for caching
                analysis_result["feature_name"] = feature_name
                analysis_result["feature_description"] = feature_description
                
                # Step 2: Query knowledge graph for related concepts
                logger.info("Querying knowledge graph")
                knowledge_result = self._query_knowledge_graph(
                    concepts=analysis_result['concepts'],
                    domain=analysis_result['domain'],
                    purpose=analysis_result['purpose']
                )
                
                # Step 3: Query project structure
                logger.info(f"Querying project structure for project {project_id}")
                structure_result = self._query_structure(project_id)
                
                # Step 4: Determine optimal placement
                logger.info("Determining optimal placement")
                placement_result = self._suggest_placement(
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
                
                # Process tags if tag manager is available
                if hasattr(self, 'tag_manager') and self.tag_manager:
                    try:
                        combined_tags = self.tag_manager.process_tags(combined_tags, domain=analysis_result['domain'])
                        logger.info(f"Processed {len(combined_tags)} tags using tag manager")
                    except Exception as e:
                        logger.error(f"Error processing tags with tag manager: {e}")
                
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
            
            # Update knowledge base with the new feature if confirmed by user
            if request.get('confirmed', False):
                logger.info(f"Updating knowledge base with feature: {feature_id}")
                
                # Store in MongoDB
                self.mongo_connector.store_feature({
                    'id': feature_id,
                    'name': feature_name,
                    'description': feature_description,
                    'milestone': feature_result['suggestedMilestone'],
                    'phase': feature_result['suggestedPhase'],
                    'module': feature_result['suggestedModule'],
                    'tags': feature_result['suggestedTags'],
                    'dependencies': feature_result['potentialDependencies'],
                    'domain': feature_result['analysisDetails']['domain'],
                    'purpose': feature_result['analysisDetails']['purpose'],
                    'created_at': datetime.now().isoformat()
                })
                
                # Update vector store with semantic information
                vector_result = self.vector_store.add_feature(feature_id, {
                    'name': feature_name,
                    'description': feature_description,
                    'tags': feature_result['suggestedTags'],
                    'domain': feature_result['analysisDetails']['domain'],
                    'purpose': feature_result['analysisDetails']['purpose'],
                    'milestone': feature_result['suggestedMilestone'],
                    'phase': feature_result['suggestedPhase'],
                    'module': feature_result['suggestedModule'],
                    'created_at': datetime.now().isoformat(),
                    'concepts': feature_result['analysisDetails'].get('concepts', []),
                    'confidence': feature_result['analysisDetails'].get('confidence', 0.7)
                })
                
                if vector_result:
                    logger.info(f"Successfully added feature to vector store: {feature_id}")
                else:
                    logger.warning(f"Issue adding feature to vector store: {feature_id}")
                
                # Analyze description for requirements
                requirements = []
                if feature_description:
                    # Simple extraction of sentences as requirements
                    sentences = [s.strip() for s in feature_description.split('.') if s.strip()]
                    requirements = [s for s in sentences if len(s) > 10]  # Filter out very short sentences
                
                # Generate a simple user story based on domain
                domain = feature_result['analysisDetails']['domain']
                name = feature_name.lower()
                user_stories = []
                
                if domain == 'ui':
                    user_stories.append(f"As a user, I want to {name}, so that I can interact with the system more effectively")
                elif domain == 'testing':
                    user_stories.append(f"As a tester, I want to {name}, so that I can validate system functionality")
                elif domain == 'data':
                    user_stories.append(f"As a data analyst, I want to {name}, so that I can manage data more effectively")
                elif domain == 'api':
                    user_stories.append(f"As a developer, I want to {name}, so that I can integrate with other systems")
                elif domain == 'agent':
                    user_stories.append(f"As a system, I want to {name}, so that I can automate processes")
                
                # Determine priority based on purpose
                purpose = feature_result['analysisDetails']['purpose']
                if purpose == 'bugfix':
                    priority = 'high'
                elif purpose == 'new_feature':
                    priority = 'medium'
                elif purpose == 'enhancement':
                    priority = 'medium'
                else:
                    priority = 'low'
                
                # Create a complete feature data object
                feature_data = {
                    'id': feature_id,
                    'name': feature_name,
                    'description': feature_description,
                    'milestone': feature_result['suggestedMilestone'],
                    'phase': feature_result['suggestedPhase'],
                    'module': feature_result['suggestedModule'],
                    'tags': feature_result['suggestedTags'],
                    'dependencies': feature_result['potentialDependencies'],
                    'domain': feature_result['analysisDetails']['domain'],
                    'purpose': feature_result['analysisDetails']['purpose'],
                    'status': 'not-started',
                    'created_at': datetime.now().isoformat(),
                    'requirements': requirements,
                    'user_stories': user_stories,
                    'priority': priority,
                    'effort_estimate': 'medium',
                    'risk_level': 'medium',
                    'test_coverage': 80,
                    'version': '1.0.0',
                    'stakeholders': []
                }
                
                # Add feature directly to knowledge graph
                kg_result, kg_info = self.kg_connector.add_feature(feature_data)
                
                if kg_result:
                    logger.info(f"Successfully added feature to knowledge graph: {kg_info}")
                else:
                    logger.warning(f"Issue adding feature to knowledge graph: {kg_info}")
                
                # If using RAG engine, update its knowledge base as well
                if self.use_rag:
                    self.rag_engine.update_knowledge_base(feature_id, {
                        'name': feature_name,
                        'description': feature_description,
                        'tags': feature_result['suggestedTags'],
                        'domain': feature_result['analysisDetails']['domain'],
                        'purpose': feature_result['analysisDetails']['purpose'],
                        'milestone': feature_result['suggestedMilestone'],
                        'phase': feature_result['suggestedPhase'],
                        'module': feature_result['suggestedModule'],
                        'dependencies': feature_result['potentialDependencies']
                    })
            
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
            'context': context,
            'version': self.version,
            'capabilities': {
                'rag': self.use_rag,
                'langchain': self.use_langchain,
                'cache': self.use_cache
            }
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
                'updated_at': datetime.now().isoformat(),
                'version': self.version,
                'capabilities': {
                    'rag': self.use_rag,
                    'langchain': self.use_langchain,
                    'cache': self.use_cache
                }
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
            if self.use_langchain:
                return self.feature_analyzer.analyze_feature(name, description)
            else:
                return self.feature_analyzer.analyze(feature_name=name, feature_description=description)
        
        def suggest_placement_adapter(params):
            # Handle different parameter styles for placement suggestion
            analysis = params.get('analysis_result', params.get('analysis', {}))
            knowledge = params.get('knowledge_result', params.get('knowledge', {}))
            structure = params.get('structure_result', params.get('structure', {}))
            milestone = params.get('user_milestone', params.get('milestone'))
            phase = params.get('user_phase', params.get('phase'))
            module = params.get('user_module', params.get('module'))
            
            if self.use_rag:
                # Use RAG engine with feature name and description
                name = params.get('feature_name', params.get('name', ''))
                description = params.get('feature_description', params.get('description', ''))
                if name and description:
                    rag_results = self.rag_engine.suggest_placement(name, description)
                    
                    # Respect user preferences
                    if milestone:
                        rag_results["suggested_milestone"] = milestone
                    if phase:
                        rag_results["suggested_phase"] = phase
                    if module:
                        rag_results["suggested_module"] = module
                        
                    return {
                        "milestone": rag_results.get("suggested_milestone"),
                        "phase": rag_results.get("suggested_phase"),
                        "module": rag_results.get("suggested_module"),
                        "confidence": rag_results.get("confidence", 0.7)
                    }
            
            # Fall back to standard suggestion
            return self._suggest_placement(
                analysis_result=analysis,
                knowledge_result=knowledge,
                structure_result=structure,
                user_milestone=milestone,
                user_phase=phase,
                user_module=module
            )
        
        def generate_id_adapter(params):
            # Handle different parameter styles
            name = params.get('feature_name', params.get('name', ''))
            milestone = params.get('milestone', '')
            project_id = params.get('project_id', None)
            return self.id_generator.generate(feature_name=name, milestone=milestone, project_id=project_id)
        
        def query_knowledge_adapter(params):
            # Handle different parameter styles
            concepts = params.get('concepts', [])
            domain = params.get('domain', 'unknown')
            purpose = params.get('purpose', 'enhancement')
            
            if self.use_langchain:
                return self.rag_system.query(" ".join(concepts), domain, purpose)
            else:
                return self.kg_connector.query_by_concepts(concepts, domain, purpose)
        
        def query_structure_adapter(params):
            # Handle different parameter styles
            project_id = params.get('project_id', None)
            return self._query_structure(project_id)
        
        def vector_search_adapter(params):
            # Handle vector search operation
            query = params.get('query', '')
            top_k = params.get('top_k', 5)
            return self.vector_store.search_similar_features(query, top_k)
        
        def update_knowledge_base_adapter(params):
            # Handle knowledge base update operation
            feature_id = params.get('id', '')
            feature_data = params.get('data', {})
            
            if not feature_id or not feature_data:
                return {
                    'success': False,
                    'error': 'Missing feature_id or feature_data'
                }
            
            # Add timestamp if not provided
            if 'created_at' not in feature_data:
                feature_data['created_at'] = datetime.now().isoformat()
            
            # Ensure domain and purpose are set to reasonable defaults if missing
            if 'domain' not in feature_data:
                # Try to infer domain from tags or description
                if 'tags' in feature_data and feature_data['tags']:
                    for tag in feature_data['tags']:
                        if tag.lower() in ['ui', 'frontend', 'interface']:
                            feature_data['domain'] = 'ui'
                            break
                        elif tag.lower() in ['test', 'testing', 'qa', 'validation']:
                            feature_data['domain'] = 'testing'
                            break
                        elif tag.lower() in ['data', 'storage', 'database']:
                            feature_data['domain'] = 'data'
                            break
                        elif tag.lower() in ['agent', 'ai', 'ml']:
                            feature_data['domain'] = 'agent'
                            break
                        elif tag.lower() in ['api', 'integration', 'service']:
                            feature_data['domain'] = 'api'
                            break
                
                # If still no domain, check description
                if 'domain' not in feature_data and 'description' in feature_data:
                    desc = feature_data['description'].lower()
                    if any(kw in desc for kw in ['ui', 'user interface', 'front-end', 'frontend']):
                        feature_data['domain'] = 'ui'
                    elif any(kw in desc for kw in ['test', 'testing', 'validate']):
                        feature_data['domain'] = 'testing'
                    elif any(kw in desc for kw in ['data', 'storage', 'database']):
                        feature_data['domain'] = 'data'
                    elif any(kw in desc for kw in ['agent', 'ai', 'ml', 'intelligence']):
                        feature_data['domain'] = 'agent'
                    elif any(kw in desc for kw in ['api', 'integration', 'service']):
                        feature_data['domain'] = 'api'
                
                # Default domain if all else fails
                if 'domain' not in feature_data:
                    feature_data['domain'] = 'unknown'
            
            # Default purpose if missing
            if 'purpose' not in feature_data:
                if 'tags' in feature_data and feature_data['tags']:
                    for tag in feature_data['tags']:
                        if tag.lower() in ['bug', 'fix', 'bugfix']:
                            feature_data['purpose'] = 'bugfix'
                            break
                        elif tag.lower() in ['new', 'feature', 'add']:
                            feature_data['purpose'] = 'new_feature'
                            break
                        elif tag.lower() in ['enhance', 'enhancement', 'improve']:
                            feature_data['purpose'] = 'enhancement'
                            break
                        elif tag.lower() in ['refactor', 'cleanup', 'technical']:
                            feature_data['purpose'] = 'refactoring'
                            break
                
                # Default purpose if all else fails
                if 'purpose' not in feature_data:
                    feature_data['purpose'] = 'enhancement'
            
            # Update vector store with additional semantics
            vector_data = feature_data.copy()
            if 'concepts' not in vector_data and 'analysisDetails' in vector_data:
                vector_data['concepts'] = vector_data.get('analysisDetails', {}).get('concepts', [])
            
            vector_success = self.vector_store.add_feature(feature_id, vector_data)
            
            # Update knowledge graph with comprehensive data
            kg_data = {
                'id': feature_id,
                'name': feature_data.get('name', ''),
                'description': feature_data.get('description', ''),
                'milestone': feature_data.get('milestone', ''),
                'phase': feature_data.get('phase', ''),
                'module': feature_data.get('module', ''),
                'tags': feature_data.get('tags', []),
                'dependencies': feature_data.get('dependencies', []),
                'domain': feature_data.get('domain', 'unknown'),
                'purpose': feature_data.get('purpose', 'enhancement'),
                'status': feature_data.get('status', 'not-started'),
                'created_at': feature_data.get('created_at')
            }
            
            # If we have analysis details, add concepts information
            if 'analysisDetails' in feature_data:
                analysis = feature_data.get('analysisDetails', {})
                if 'domain' in analysis and 'domain' not in kg_data:
                    kg_data['domain'] = analysis['domain']
                if 'purpose' in analysis and 'purpose' not in kg_data:
                    kg_data['purpose'] = analysis['purpose']
                if 'concepts' in analysis:
                    kg_data['concepts'] = analysis['concepts']
                if 'confidence' in analysis:
                    kg_data['confidence'] = analysis['confidence']
            
            # Add feature to knowledge graph
            kg_success, kg_message = self.kg_connector.add_feature(kg_data)
            
            # Update MongoDB with complete data
            mongo_data = feature_data.copy()
            # Ensure all needed fields are present
            if 'domain' in kg_data and 'domain' not in mongo_data:
                mongo_data['domain'] = kg_data['domain']
            if 'purpose' in kg_data and 'purpose' not in mongo_data:
                mongo_data['purpose'] = kg_data['purpose']
            
            mongo_success = self.mongo_connector.store_feature({
                'id': feature_id,
                **mongo_data
            })
            
            # If using RAG engine, update its knowledge base as well
            if self.use_rag:
                # Ensure RAG has complete data including concepts and relations
                rag_data = feature_data.copy()
                if 'domain' in kg_data and 'domain' not in rag_data:
                    rag_data['domain'] = kg_data['domain']
                if 'purpose' in kg_data and 'purpose' not in rag_data:
                    rag_data['purpose'] = kg_data['purpose']
                
                rag_success = self.rag_engine.update_knowledge_base(feature_id, rag_data)
            else:
                rag_success = True
            
            return {
                'success': vector_success and kg_success and mongo_success and rag_success,
                'vector_store': vector_success,
                'knowledge_graph': kg_success,
                'knowledge_graph_message': kg_message if not kg_success else None,
                'mongo_db': mongo_success,
                'rag_engine': rag_success
            }
        
        def get_related_features_adapter(params):
            # Handle getting related features
            feature_id = params.get('id', '')
            relation_types = params.get('relation_types')
            max_depth = params.get('max_depth', 2)
            limit = params.get('limit', 10)
            
            if not feature_id:
                return {
                    'success': False,
                    'error': 'Missing feature ID'
                }
            
            # Query the knowledge graph for related features
            related_features = self.kg_connector.get_related_features(
                feature_id=feature_id,
                relation_types=relation_types,
                max_depth=max_depth,
                limit=limit
            )
            
            return related_features
            
        def query_features_adapter(params):
            # Handle query for multiple features
            domain = params.get('domain')
            purpose = params.get('purpose')
            tags = params.get('tags')
            milestone = params.get('milestone')
            phase = params.get('phase')
            module = params.get('module')
            limit = params.get('limit', 10)
            
            # Query the knowledge graph for matching features
            matching_features = self.kg_connector.query_features(
                domain=domain,
                purpose=purpose,
                tags=tags,
                milestone=milestone,
                phase=phase,
                module=module,
                limit=limit
            )
            
            return matching_features
        
        operations = {
            'process_feature': self.process_feature_request,
            'analyze_feature': analyze_feature_adapter,
            'suggest_placement': suggest_placement_adapter,
            'generate_id': generate_id_adapter,
            'query_knowledge': query_knowledge_adapter,
            'query_structure': query_structure_adapter,
            'vector_search': vector_search_adapter,
            'update_knowledge_base': update_knowledge_base_adapter,
            'get_related_features': get_related_features_adapter,
            'query_features': query_features_adapter
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


def main():
    """Main entry point for the Enhanced Feature Creation Agent"""
    parser = argparse.ArgumentParser(description='Enhanced Feature Creation Agent')
    
    # Core command line arguments
    parser.add_argument('--spawn', action='store_true', help='Spawn the agent')
    parser.add_argument('--retire', action='store_true', help='Retire the agent')
    parser.add_argument('--status', action='store_true', help='Get agent status')
    parser.add_argument('--operation', type=str, help='Operation to execute')
    parser.add_argument('--context', type=str, help='Path to context file')
    parser.add_argument('--params', type=str, help='Path to params file')
    parser.add_argument('--reason', type=str, default='API request', help='Reason for retirement')
    
    # Enhanced agent options
    parser.add_argument('--use-rag', action='store_true', default=True, help='Use RAG engine')
    parser.add_argument('--use-langchain', action='store_true', default=True, help='Use LangChain components')
    parser.add_argument('--use-cache', action='store_true', default=True, help='Use Redis caching')
    parser.add_argument('--no-rag', action='store_true', help='Disable RAG engine')
    parser.add_argument('--no-langchain', action='store_true', help='Disable LangChain components')
    parser.add_argument('--no-cache', action='store_true', help='Disable Redis caching')
    
    args = parser.parse_args()
    
    # Process enhanced options
    use_rag = args.use_rag and not args.no_rag
    use_langchain = args.use_langchain and not args.no_langchain
    use_cache = args.use_cache and not args.no_cache
    
    # Create agent instance
    agent = EnhancedFeatureCreationAgent(
        use_rag=use_rag,
        use_langchain=use_langchain,
        use_cache=use_cache
    )
    
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