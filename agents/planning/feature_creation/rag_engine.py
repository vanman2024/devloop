#!/usr/bin/env python3
"""
RAG Engine for Feature Creation Agent

This module provides a Retrieval-Augmented Generation (RAG) system
for the feature creation agent, enabling context-aware feature analysis
and placement based on existing project knowledge and feature descriptions.
"""

import os
import sys
import json
import logging
import time
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
        logging.FileHandler(os.path.join(PROJECT_ROOT, 'logs', 'rag_engine.log'))
    ]
)
logger = logging.getLogger('rag_engine')

# Import local modules
try:
    from vector_store import get_vector_store
    from knowledge_graph_connector import get_knowledge_graph_connector
except ImportError:
    from .vector_store import get_vector_store
    from .knowledge_graph_connector import get_knowledge_graph_connector

class RAGEngine:
    """
    Retrieval-Augmented Generation engine for the feature creation agent.
    
    This engine combines vector search with knowledge graph traversal to provide
    context-aware recommendations for feature placement and relationships.
    """
    
    def __init__(self, use_llm: bool = True, llm_model: str = "gpt-4o"):
        """
        Initialize the RAG engine
        
        Args:
            use_llm: Whether to use an LLM for processing
            llm_model: LLM model to use
        """
        self.use_llm = use_llm
        self.llm_model = llm_model
        
        # Initialize vector store and knowledge graph connector
        try:
            self.vector_store = get_vector_store()
            self.kg_connector = get_knowledge_graph_connector()
            logger.info("Initialized vector store and knowledge graph connector")
        except Exception as e:
            logger.error(f"Error initializing RAG components: {str(e)}")
            raise
        
        # Initialize LLM if enabled
        if self.use_llm:
            self._init_llm()
    
    def _init_llm(self):
        """Initialize the LLM"""
        try:
            # Import our LLM connector
            from llm_connector import get_llm_connector
            
            # Get the LLM connector
            self.llm_connector = get_llm_connector()
            
            if self.llm_connector.llm_available:
                logger.info(f"Using LLM model: {self.llm_connector.openai_config['model']}")
            else:
                logger.warning("OpenAI API not available - using simplified implementation")
                
        except ImportError as e:
            logger.error(f"Error importing LLM connector: {e}")
            logger.warning("Using placeholder implementation")
    
    def _generate_llm_prompt(self, feature_description: str, domain: str, purpose: str, 
                             similar_features: List[Dict[str, Any]]) -> str:
        """
        Generate a prompt for the LLM based on feature description and similar features
        
        Args:
            feature_description: Description of the new feature
            domain: Domain of the new feature
            purpose: Purpose of the new feature
            similar_features: List of similar features from the vector store
            
        Returns:
            Formatted prompt for the LLM
        """
        prompt = f"""
You are helping determine the optimal placement for a new feature in the Devloop project structure.

New Feature Details:
- Description: {feature_description}
- Domain: {domain}
- Purpose: {purpose}

Similar Features:
"""
        
        # Add details of similar features
        for i, feature in enumerate(similar_features):
            prompt += f"""
Feature {i+1}: {feature.get('name', '')} (Similarity: {feature.get('similarity', 0):.2f})
- Description: {feature.get('description', '')}
- Domain: {feature.get('domain', '')}
- Purpose: {feature.get('purpose', '')}
- Current Placement: Milestone: {feature.get('milestone', '')}, Phase: {feature.get('phase', '')}, Module: {feature.get('module', '')}
- Tags: {', '.join(feature.get('tags', []))}
"""
        
        # Add the task for the LLM
        prompt += """
Based on the new feature description and the similar features in the project, please recommend:
1. The most appropriate milestone, phase, and module for this new feature
2. Any potential dependencies this feature might have
3. Relevant tags that should be applied to this feature
4. A confidence score (0-1) for your recommendation

Provide your recommendations in a structured format that can be parsed as JSON.
"""
        
        return prompt
    
    def _process_llm_response(self, response: str) -> Dict[str, Any]:
        """
        Process the LLM response to extract structured data
        
        Args:
            response: LLM response text
            
        Returns:
            Structured data extracted from the response
        """
        if not response:
            # If no response, return a default result
            return {
                "suggested_milestone": "milestone-core-foundation",
                "suggested_phase": "phase-01",
                "suggested_module": "core-infrastructure",
                "potential_dependencies": [
                    {"id": "feature-1001", "name": "Database Schema"}
                ],
                "suggested_tags": ["data", "storage", "persistence"],
                "confidence": 0.7
            }
            
        try:
            # Try to parse the response as JSON
            import json
            
            # Check if the response is already a dictionary
            if isinstance(response, dict):
                return response
                
            # Parse the response as JSON
            parsed_response = json.loads(response)
            
            # Validate the required fields
            required_fields = ["suggested_milestone", "suggested_phase", "suggested_module"]
            for field in required_fields:
                if field not in parsed_response:
                    logger.warning(f"Missing required field in LLM response: {field}")
            
            return parsed_response
            
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing LLM response as JSON: {e}")
            
            # Try to extract structured data from the text using regex
            import re
            
            # Extract milestone
            milestone_match = re.search(r'milestone[:\s]+([\w\-]+)', response, re.IGNORECASE)
            milestone = milestone_match.group(1) if milestone_match else "milestone-core-foundation"
            
            # Extract phase
            phase_match = re.search(r'phase[:\s]+([\w\-]+)', response, re.IGNORECASE)
            phase = phase_match.group(1) if phase_match else "phase-01"
            
            # Extract module
            module_match = re.search(r'module[:\s]+([\w\-]+)', response, re.IGNORECASE)
            module = module_match.group(1) if module_match else "core-infrastructure"
            
            # Extract confidence
            confidence_match = re.search(r'confidence[:\s]+([\d\.]+)', response, re.IGNORECASE)
            confidence = float(confidence_match.group(1)) if confidence_match else 0.7
            
            return {
                "suggested_milestone": milestone,
                "suggested_phase": phase,
                "suggested_module": module,
                "potential_dependencies": [],  # Can't easily extract from text
                "suggested_tags": [],  # Can't easily extract from text
                "confidence": confidence
            }
            
        except Exception as e:
            logger.error(f"Error processing LLM response: {e}")
            
            # Return a default result
            return {
                "suggested_milestone": "milestone-core-foundation",
                "suggested_phase": "phase-01",
                "suggested_module": "core-infrastructure",
                "potential_dependencies": [
                    {"id": "feature-1001", "name": "Database Schema"}
                ],
                "suggested_tags": ["data", "storage", "persistence"],
                "confidence": 0.7
            }
    
    def analyze_feature(self, feature_name: str, feature_description: str) -> Dict[str, Any]:
        """
        Analyze a feature description to extract key concepts
        
        Args:
            feature_name: Name of the feature
            feature_description: Description of the feature
            
        Returns:
            Dictionary containing extracted concepts, domain, and purpose
        """
        # Simple keyword matching for domain
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
        concepts = list(set(concepts))[:5]  # Limit to 5 unique concepts
        
        return {
            'concepts': concepts,
            'domain': domain,
            'purpose': purpose
        }
    
    def suggest_placement(self, feature_name: str, feature_description: str) -> Dict[str, Any]:
        """
        Suggest optimal placement for a feature using RAG
        
        Args:
            feature_name: Name of the feature
            feature_description: Description of the feature
            
        Returns:
            Dictionary containing suggested milestone, phase, module, tags, dependencies, etc.
        """
        try:
            # Step 1: Analyze the feature to extract concepts, domain, and purpose
            analysis = self.analyze_feature(feature_name, feature_description)
            
            # Step 2: Get similar features from the vector store
            similar_features = self.vector_store.get_related_features(
                feature_description,
                analysis['domain'],
                analysis['purpose']
            )
            
            # Step 3: Get suggestions from the knowledge graph
            kg_results = self.kg_connector.query_by_concepts(
                analysis['concepts'],
                analysis['domain'],
                analysis['purpose']
            )
            
            if self.use_llm and hasattr(self, 'llm_connector'):
                # Step 4: Generate a prompt for the LLM with context from vector store and knowledge graph
                prompt = self._generate_llm_prompt(
                    feature_description,
                    analysis['domain'],
                    analysis['purpose'],
                    similar_features
                )
                
                # Step 5: Define output schema for structured response with proper structure
                output_schema = {
                    "type": "object",
                    "properties": {
                        "suggested_milestone": {"type": "string"},
                        "suggested_phase": {"type": "string"},
                        "suggested_module": {"type": "string"},
                        "potential_dependencies": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "name": {"type": "string"}
                                },
                                "required": ["id", "name"]
                            }
                        },
                        "suggested_tags": {"type": "array", "items": {"type": "string"}},
                        "confidence": {"type": "number"},
                        "reasoning": {"type": "string"}
                    },
                    "required": [
                        "suggested_milestone", 
                        "suggested_phase", 
                        "suggested_module", 
                        "potential_dependencies",
                        "suggested_tags",
                        "confidence"
                    ]
                }
                
                # Step 6: Call the LLM with structured output - ensure JSON output format
                if self.llm_connector.llm_available:
                    llm_results = self.llm_connector.generate_structured_output(prompt, output_schema)
                else:
                    # Use mock results
                    llm_results = self._process_llm_response("")
                
                # Step 7: Combine results from vector store, knowledge graph, and LLM
                results = {
                    "suggested_milestone": llm_results.get("suggested_milestone") or kg_results.get("suggested_milestone"),
                    "suggested_phase": llm_results.get("suggested_phase") or kg_results.get("suggested_phase"),
                    "suggested_module": llm_results.get("suggested_module") or kg_results.get("suggested_module"),
                    "suggested_tags": list(set(llm_results.get("suggested_tags", []) + kg_results.get("suggested_tags", []))),
                    "potential_dependencies": llm_results.get("potential_dependencies") or kg_results.get("potential_dependencies", []),
                    "confidence": llm_results.get("confidence", 0.7),
                    "analysis": analysis,
                    "similar_features": similar_features[:2]  # Include top 2 similar features for reference
                }
                
            else:
                # Without LLM, combine vector store and knowledge graph results
                vector_placement = self.vector_store.suggest_placement(
                    feature_description,
                    analysis['domain'],
                    analysis['purpose']
                )
                
                # Combine results
                results = {
                    "suggested_milestone": kg_results.get("suggested_milestone") or vector_placement.get("milestone"),
                    "suggested_phase": kg_results.get("suggested_phase") or vector_placement.get("phase"),
                    "suggested_module": kg_results.get("suggested_module") or vector_placement.get("module"),
                    "suggested_tags": kg_results.get("suggested_tags", []),
                    "potential_dependencies": kg_results.get("potential_dependencies", []),
                    "confidence": max(0.6, vector_placement.get("confidence", 0.6)),  # Default to moderate confidence
                    "analysis": analysis,
                    "similar_features": similar_features[:2]  # Include top 2 similar features for reference
                }
            
            logger.info(f"Generated placement suggestion for feature: {feature_name}")
            return results
            
        except Exception as e:
            logger.error(f"Error suggesting placement: {str(e)}")
            
            # Return a basic suggestion in case of error
            return {
                "suggested_milestone": None,
                "suggested_phase": None,
                "suggested_module": None,
                "suggested_tags": [],
                "potential_dependencies": [],
                "confidence": 0.0,
                "analysis": {
                    "concepts": [],
                    "domain": "unknown",
                    "purpose": "enhancement"
                },
                "similar_features": [],
                "error": str(e)
            }
    
    def update_knowledge_base(self, feature_id: str, feature_data: Dict[str, Any]) -> bool:
        """
        Update the knowledge base with a new feature
        
        Args:
            feature_id: ID of the feature
            feature_data: Feature data dictionary
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Update the vector store
            vector_success = self.vector_store.add_feature(feature_id, feature_data)
            
            # Update the knowledge graph
            kg_success, _ = self.kg_connector.add_feature({
                "id": feature_id,
                "name": feature_data.get("name", ""),
                "description": feature_data.get("description", ""),
                "milestone": feature_data.get("milestone", ""),
                "phase": feature_data.get("phase", ""),
                "module": feature_data.get("module", ""),
                "tags": feature_data.get("tags", []),
                "dependencies": feature_data.get("dependencies", [])
            })
            
            logger.info(f"Updated knowledge base for feature {feature_id}: vector={vector_success}, kg={kg_success}")
            return vector_success and kg_success
            
        except Exception as e:
            logger.error(f"Error updating knowledge base: {str(e)}")
            return False

# Singleton instance of the RAG engine
_rag_engine_instance = None

def get_rag_engine() -> RAGEngine:
    """
    Get the singleton instance of the RAG engine
    
    Returns:
        RAGEngine instance
    """
    global _rag_engine_instance
    if _rag_engine_instance is None:
        _rag_engine_instance = RAGEngine()
    return _rag_engine_instance