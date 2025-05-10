#!/usr/bin/env python3
"""
LangChain Integration for Feature Creation Agent

This module provides LangChain-based integration for the feature creation agent,
enabling more sophisticated NLP-based analysis of feature descriptions and
better recommendations for feature placement.
"""

import os
import sys
import json
import logging
from typing import Dict, List, Any, Optional, Tuple, Union

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
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'langchain_integration.log'))
    ]
)
logger = logging.getLogger('langchain_integration')

class LangChainFeatureAnalyzer:
    """
    LangChain-based analyzer for feature descriptions.
    
    Uses LangChain components to extract key concepts, determine domain and purpose,
    and provide better analysis of feature descriptions.
    """
    
    def __init__(self, llm_model: str = "gpt-4o"):
        """
        Initialize the LangChain Feature Analyzer
        
        Args:
            llm_model: LLM model to use
        """
        self.llm_model = llm_model
        
        # Initialize LangChain components
        self._init_langchain()
    
    def _init_langchain(self):
        """Initialize LangChain components"""
        try:
            # Try to import LangChain and other dependencies
            import langchain
            from langchain_openai import ChatOpenAI
            from langchain.chains import LLMChain
            from langchain.prompts import PromptTemplate
            from langchain_openai import OpenAIEmbeddings
            
            # Import our LLM connector
            from llm_connector import get_llm_connector
            
            # Get configuration and LLM connector
            self.llm_connector = get_llm_connector()
            
            # Initialize LangChain components if OpenAI API is available
            if self.llm_connector.llm_available:
                # Initialize the LLM
                self.llm = ChatOpenAI(
                    model_name=self.llm_model,
                    temperature=0.0,
                    openai_api_key=self.llm_connector.openai_config['api_key']
                )
                
                # Initialize the embeddings
                self.embeddings = OpenAIEmbeddings(
                    model=self.llm_connector.openai_config['embedding_model'],
                    openai_api_key=self.llm_connector.openai_config['api_key']
                )
                
                # Create prompt templates for feature analysis
                self.analysis_prompt = PromptTemplate(
                    template="""
You are an expert software developer tasked with analyzing a feature description.
Please analyze the following feature:

Name: {feature_name}
Description: {feature_description}

Provide a detailed analysis including:
1. The domain this feature belongs to (ui, api, data, testing, agent, etc.)
2. The main concepts mentioned in the description
3. The purpose of the feature (new_feature, enhancement, bugfix, refactoring)

Format your response as JSON with the following structure:
{
    "domain": "domain_name",
    "concepts": ["concept1", "concept2", ...],
    "purpose": "purpose_type"
}
                    """,
                    input_variables=["feature_name", "feature_description"]
                )
                
                # Create the analysis chain with structured output format
                from langchain.output_parsers import JsonOutputParser
                from langchain.schema import OutputParserException

                # Define schema for analysis output
                analysis_schema = {
                    "properties": {
                        "domain": {"type": "string"},
                        "concepts": {"type": "array", "items": {"type": "string"}},
                        "purpose": {"type": "string"}
                    },
                    "required": ["domain", "concepts", "purpose"]
                }
                
                # Initialize JSON output parser
                json_parser = JsonOutputParser()
                
                # Create the analysis chain
                self.analysis_chain = LLMChain(
                    llm=self.llm,
                    prompt=self.analysis_prompt,
                    output_parser=json_parser
                )
                
                # Create prompt template for placement suggestion
                self.placement_prompt = PromptTemplate(
                    template="""
You are an expert software architect tasked with suggesting the optimal placement for a new feature.
Please review the following information:

Feature Analysis:
{analysis_result}

Knowledge Graph Results:
{knowledge_result}

Project Structure:
{structure_result}

User Preferences:
{user_preferences}

Suggest the optimal placement for this feature in the project structure.
Format your response as JSON with the following structure:
{
    "milestone": "milestone_id",
    "phase": "phase_id",
    "module": "module_id",
    "confidence": 0.0 to 1.0,
    "reasoning": "Explanation for your suggestion"
}
                    """,
                    input_variables=["analysis_result", "knowledge_result", "structure_result", "user_preferences"]
                )
                
                # Create the placement chain with structured output format
                # Define schema for placement output
                placement_schema = {
                    "properties": {
                        "milestone": {"type": "string"},
                        "phase": {"type": "string"},
                        "module": {"type": "string"},
                        "confidence": {"type": "number"},
                        "reasoning": {"type": "string"}
                    },
                    "required": ["milestone", "phase", "module", "confidence"]
                }
                
                # Initialize JSON output parser if not already defined
                if not hasattr(self, 'json_parser'):
                    from langchain.output_parsers import JsonOutputParser
                    self.json_parser = JsonOutputParser()
                
                # Create the placement chain
                self.placement_chain = LLMChain(
                    llm=self.llm,
                    prompt=self.placement_prompt,
                    output_parser=self.json_parser
                )
                
                logger.info(f"Initialized LangChain with model: {self.llm_model}")
            else:
                logger.warning("OpenAI API not available - using simplified implementation")
                
        except ImportError as e:
            logger.warning(f"LangChain or required dependencies not installed: {e}")
            logger.warning("Using simplified implementation")
    
    def analyze_feature(self, feature_name: str, feature_description: str) -> Dict[str, Any]:
        """
        Analyze a feature description using LangChain
        
        Args:
            feature_name: Name of the feature
            feature_description: Description of the feature
            
        Returns:
            Dictionary containing extracted concepts, domain, and purpose
        """
        logger.info(f"Analyzing feature with LangChain: {feature_name}")
        
        # Check if we have a working LangChain setup
        if hasattr(self, 'llm_connector') and self.llm_connector.llm_available and hasattr(self, 'analysis_chain'):
            try:
                # Use LangChain to analyze the feature
                result = self.analysis_chain.run({
                    "feature_name": feature_name,
                    "feature_description": feature_description
                })
                
                # Parse the result as JSON
                if isinstance(result, str):
                    import json
                    try:
                        parsed_result = json.loads(result)
                        logger.info(f"LangChain analysis complete: domain={parsed_result.get('domain')}, purpose={parsed_result.get('purpose')}")
                        return parsed_result
                    except json.JSONDecodeError as e:
                        logger.error(f"Error parsing LangChain result as JSON: {e}")
                        # Fall back to direct LLM call
                else:
                    # If the result is already a dict, return it
                    return result
                    
            except Exception as e:
                logger.error(f"Error analyzing feature with LangChain: {e}")
                # Fall back to direct LLM call
        
        # Fall back to direct LLM call
        if hasattr(self, 'llm_connector'):
            try:
                # Create a prompt for the LLM
                prompt = f"""
You are an expert software developer tasked with analyzing a feature description.
Please analyze the following feature:

Name: {feature_name}
Description: {feature_description}

Provide a detailed analysis including:
1. The domain this feature belongs to (ui, api, data, testing, agent, etc.)
2. The main concepts mentioned in the description
3. The purpose of the feature (new_feature, enhancement, bugfix, refactoring)

Format your response as JSON with the following structure:
{{
    "domain": "domain_name",
    "concepts": ["concept1", "concept2", ...],
    "purpose": "purpose_type"
}}
                """
                
                # Use structured output with schema
                output_schema = {
                    "domain": {"type": "string"},
                    "concepts": {"type": "array", "items": {"type": "string"}},
                    "purpose": {"type": "string"}
                }
                
                result = self.llm_connector.generate_structured_output(prompt, output_schema)
                logger.info(f"Direct LLM analysis complete: domain={result.get('domain')}, purpose={result.get('purpose')}")
                return result
                
            except Exception as e:
                logger.error(f"Error analyzing feature with direct LLM call: {e}")
                # Fall back to keyword matching
        
        # Fall back to simple keyword matching
        logger.info("Falling back to keyword matching for feature analysis")
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
        words = text.split()
        concepts = [w for w in words if len(w) > 4 and w not in [
            'feature', 'implement', 'implementation', 'should', 'would', 
            'could', 'provides', 'system', 'enable', 'allows'
        ]]
        concepts = list(set(concepts))[:10]  # Limit to 10 unique concepts
        
        logger.info(f"Analyzed feature with keyword matching: {feature_name}, domain: {domain}, purpose: {purpose}")
        
        return {
            'concepts': concepts,
            'domain': domain,
            'purpose': purpose
        }

class LangChainPlacementSuggester:
    """
    LangChain-based suggester for feature placement.
    
    Uses LangChain components to determine optimal placement for features
    within the project structure.
    """
    
    def __init__(self, llm_model: str = "gpt-4o"):
        """
        Initialize the LangChain Placement Suggester
        
        Args:
            llm_model: LLM model to use
        """
        self.llm_model = llm_model
        
        # Initialize LangChain components
        self._init_langchain()
    
    def _init_langchain(self):
        """Initialize LangChain components"""
        try:
            # Try to import LangChain and other dependencies
            import langchain
            from langchain_openai import ChatOpenAI
            from langchain.chains import LLMChain
            from langchain.prompts import PromptTemplate
            from langchain_openai import OpenAIEmbeddings
            
            # Import our LLM connector
            from llm_connector import get_llm_connector
            
            # Get configuration and LLM connector
            self.llm_connector = get_llm_connector()
            
            # Initialize LangChain components if OpenAI API is available
            if self.llm_connector.llm_available:
                # Initialize the LLM
                self.llm = ChatOpenAI(
                    model_name=self.llm_model,
                    temperature=0.0,
                    openai_api_key=self.llm_connector.openai_config['api_key']
                )
                
                # Initialize the embeddings
                self.embeddings = OpenAIEmbeddings(
                    model=self.llm_connector.openai_config['embedding_model'],
                    openai_api_key=self.llm_connector.openai_config['api_key']
                )
                
                # Create prompt templates for feature analysis
                self.analysis_prompt = PromptTemplate(
                    template="""
You are an expert software developer tasked with analyzing a feature description.
Please analyze the following feature:

Name: {feature_name}
Description: {feature_description}

Provide a detailed analysis including:
1. The domain this feature belongs to (ui, api, data, testing, agent, etc.)
2. The main concepts mentioned in the description
3. The purpose of the feature (new_feature, enhancement, bugfix, refactoring)

Format your response as JSON with the following structure:
{
    "domain": "domain_name",
    "concepts": ["concept1", "concept2", ...],
    "purpose": "purpose_type"
}
                    """,
                    input_variables=["feature_name", "feature_description"]
                )
                
                # Create the analysis chain with structured output format
                from langchain.output_parsers import JsonOutputParser
                from langchain.schema import OutputParserException

                # Define schema for analysis output
                analysis_schema = {
                    "properties": {
                        "domain": {"type": "string"},
                        "concepts": {"type": "array", "items": {"type": "string"}},
                        "purpose": {"type": "string"}
                    },
                    "required": ["domain", "concepts", "purpose"]
                }
                
                # Initialize JSON output parser
                json_parser = JsonOutputParser()
                
                # Create the analysis chain
                self.analysis_chain = LLMChain(
                    llm=self.llm,
                    prompt=self.analysis_prompt,
                    output_parser=json_parser
                )
                
                # Create prompt template for placement suggestion
                self.placement_prompt = PromptTemplate(
                    template="""
You are an expert software architect tasked with suggesting the optimal placement for a new feature.
Please review the following information:

Feature Analysis:
{analysis_result}

Knowledge Graph Results:
{knowledge_result}

Project Structure:
{structure_result}

User Preferences:
{user_preferences}

Suggest the optimal placement for this feature in the project structure.
Format your response as JSON with the following structure:
{
    "milestone": "milestone_id",
    "phase": "phase_id",
    "module": "module_id",
    "confidence": 0.0 to 1.0,
    "reasoning": "Explanation for your suggestion"
}
                    """,
                    input_variables=["analysis_result", "knowledge_result", "structure_result", "user_preferences"]
                )
                
                # Create the placement chain with structured output format
                # Define schema for placement output
                placement_schema = {
                    "properties": {
                        "milestone": {"type": "string"},
                        "phase": {"type": "string"},
                        "module": {"type": "string"},
                        "confidence": {"type": "number"},
                        "reasoning": {"type": "string"}
                    },
                    "required": ["milestone", "phase", "module", "confidence"]
                }
                
                # Initialize JSON output parser if not already defined
                if not hasattr(self, 'json_parser'):
                    from langchain.output_parsers import JsonOutputParser
                    self.json_parser = JsonOutputParser()
                
                # Create the placement chain
                self.placement_chain = LLMChain(
                    llm=self.llm,
                    prompt=self.placement_prompt,
                    output_parser=self.json_parser
                )
                
                logger.info(f"Initialized LangChain with model: {self.llm_model}")
            else:
                logger.warning("OpenAI API not available - using simplified implementation")
                
        except ImportError as e:
            logger.warning(f"LangChain or required dependencies not installed: {e}")
            logger.warning("Using simplified implementation")
    
    def suggest(self, analysis_result: Dict[str, Any], knowledge_result: Dict[str, Any], 
                structure_result: Dict[str, Any], user_milestone: Optional[str] = None,
                user_phase: Optional[str] = None, user_module: Optional[str] = None) -> Dict[str, Any]:
        """
        Suggest optimal placement for a feature using LangChain
        
        Args:
            analysis_result: Result from feature analyzer
            knowledge_result: Result from knowledge graph querier
            structure_result: Result from structure querier
            user_milestone: User-provided milestone ID (optional)
            user_phase: User-provided phase ID (optional)
            user_module: User-provided module ID (optional)
            
        Returns:
            Dictionary containing suggested milestone, phase, module, and confidence
        """
        # TODO: Replace with actual LangChain implementation
        # This is a placeholder implementation that uses simple rules
        
        # In a real implementation, we would use LangChain components to 
        # determine optimal placement based on analysis, knowledge, and structure
        
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
        
        logger.info(f"Suggested placement: {suggested_milestone}/{suggested_phase}/{suggested_module} (confidence: {confidence:.2f})")
        
        return {
            'milestone': suggested_milestone,
            'phase': suggested_phase,
            'module': suggested_module,
            'confidence': confidence
        }

class LangChainRAG:
    """
    LangChain-based RAG (Retrieval-Augmented Generation) system for feature creation.
    
    Uses LangChain components to implement a RAG system that combines
    vector search with knowledge graph traversal for better feature analysis.
    """
    
    def __init__(self, llm_model: str = "gpt-4o"):
        """
        Initialize the LangChain RAG system
        
        Args:
            llm_model: LLM model to use
        """
        self.llm_model = llm_model
        
        # Initialize LangChain components
        self._init_langchain()
    
    def _init_langchain(self):
        """Initialize LangChain components"""
        try:
            # Try to import LangChain
            # import langchain
            # from langchain.vectorstores import Chroma
            # from langchain.embeddings import OpenAIEmbeddings
            # from langchain.retrievers import ContextualCompressionRetriever
            # from langchain.retrievers.document_compressors import LLMChainExtractor
            # from langchain.chains import RetrievalQA

            # This is a placeholder for LangChain RAG initialization
            # In a real implementation, we would initialize LangChain components here
            logger.info(f"Using LLM model: {self.llm_model}")
            logger.info("Note: This is a placeholder implementation")
            
        except ImportError:
            logger.warning("LangChain not installed, using simplified implementation")
    
    def query(self, feature_description: str, domain: str, purpose: str) -> Dict[str, Any]:
        """
        Query the RAG system for feature placement suggestions
        
        Args:
            feature_description: Description of the feature
            domain: Domain of the feature
            purpose: Purpose of the feature
            
        Returns:
            Dictionary containing query results
        """
        # TODO: Replace with actual LangChain RAG implementation
        # This is a placeholder implementation that returns simple suggestions
        
        # In a real implementation, we would use LangChain RAG to retrieve relevant
        # information from the vector store and knowledge graph, and generate better suggestions
        
        logger.info(f"Querying RAG for domain: {domain}, purpose: {purpose}")
        
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
        
        # Extract simple concepts for tags
        words = feature_description.lower().split()
        concepts = [w for w in words if len(w) > 4 and w not in [
            'feature', 'implement', 'implementation', 'should', 'would', 
            'could', 'provides', 'system', 'enable', 'allows'
        ]]
        concepts = list(set(concepts))[:5]  # Limit to 5 unique concepts
        
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

# Initialize LangChain components at module level
_feature_analyzer = None
_placement_suggester = None
_rag_system = None

def get_feature_analyzer() -> LangChainFeatureAnalyzer:
    """
    Get the LangChain feature analyzer
    
    Returns:
        LangChainFeatureAnalyzer instance
    """
    global _feature_analyzer
    if _feature_analyzer is None:
        _feature_analyzer = LangChainFeatureAnalyzer()
    return _feature_analyzer

def get_placement_suggester() -> LangChainPlacementSuggester:
    """
    Get the LangChain placement suggester
    
    Returns:
        LangChainPlacementSuggester instance
    """
    global _placement_suggester
    if _placement_suggester is None:
        _placement_suggester = LangChainPlacementSuggester()
    return _placement_suggester

def get_rag_system() -> LangChainRAG:
    """
    Get the LangChain RAG system
    
    Returns:
        LangChainRAG instance
    """
    global _rag_system
    if _rag_system is None:
        _rag_system = LangChainRAG()
    return _rag_system