"""
Action Taxonomy Module - Semantic classification of operations across programming domains

This module implements a comprehensive taxonomy of programming actions and operations
that can be used to enhance documentation organization, semantic search, and
redundancy detection without requiring GPU-based training.
"""

import json
import os
import logging
from typing import Dict, List, Set, Tuple, Any, Optional
import numpy as np

from ..connectors.vector_store_connector import DocumentVectorStoreConnector

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ActionTaxonomy:
    """
    A comprehensive taxonomy of programming actions and operations.
    
    This class provides a structured way to categorize code operations,
    enhance semantic search, and improve documentation organization.
    """
    
    def __init__(self, vector_store: Optional[DocumentVectorStoreConnector] = None):
        """
        Initialize the action taxonomy.
        
        Args:
            vector_store: Vector store connector for embedding operations
        """
        self.vector_store = vector_store
        self.taxonomy: Dict[str, Dict[str, Any]] = {}
        self.action_vectors: Dict[str, List[float]] = {}
        self.category_vectors: Dict[str, List[float]] = {}
        self.initialized = False
        
        # Track indexed taxonomy terms
        self.indexed_terms: Set[str] = set()
        
        logger.info("Action taxonomy initialized")
    
    def load_taxonomy(self, taxonomy_file: Optional[str] = None) -> bool:
        """
        Load the action taxonomy from a file.
        
        Args:
            taxonomy_file: Path to the taxonomy file (JSON)
            
        Returns:
            Success status
        """
        # Use default path if not specified
        if not taxonomy_file:
            # Get the directory of this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            taxonomy_file = os.path.join(current_dir, "data", "action_taxonomy.json")
        
        try:
            if os.path.exists(taxonomy_file):
                with open(taxonomy_file, 'r') as f:
                    self.taxonomy = json.load(f)
            else:
                # Create default taxonomy structure
                self.taxonomy = self._create_default_taxonomy()
                
                # Ensure the directory exists
                os.makedirs(os.path.dirname(taxonomy_file), exist_ok=True)
                
                # Save the default taxonomy
                with open(taxonomy_file, 'w') as f:
                    json.dump(self.taxonomy, f, indent=2)
            
            self.initialized = True
            logger.info(f"Loaded taxonomy with {len(self.taxonomy)} actions")
            return True
            
        except Exception as e:
            logger.error(f"Error loading taxonomy: {e}")
            # Create in-memory default taxonomy
            self.taxonomy = self._create_default_taxonomy()
            self.initialized = True
            return False
    
    def _create_default_taxonomy(self) -> Dict[str, Dict[str, Any]]:
        """
        Create the default action taxonomy structure.
        
        Returns:
            Default taxonomy dictionary
        """
        # Raw taxonomy data (partial list shown for brevity)
        taxonomy_data = [
            {"verb": "parse", "description": "To analyze and convert data from one format to another, breaking it into components", 
             "examples": ["parseJsonResponse", "parseXmlDocument", "parseConfigFile"], "category": "Data Operations"},
            {"verb": "transform", "description": "To change data from one structure or format to another", 
             "examples": ["transformRawData", "transformToViewModel", "transformResponseFormat"], "category": "Data Operations"},
            {"verb": "validate", "description": "To check if data meets specified criteria or constraints", 
             "examples": ["validateUserInput", "validateConfigFile", "validateFormData"], "category": "Data Operations"},
            {"verb": "filter", "description": "To selectively include or exclude data based on criteria", 
             "examples": ["filterInactiveUsers", "filterOutliers", "filterByDate"], "category": "Data Operations"},
            {"verb": "sort", "description": "To arrange data elements in a specific order", 
             "examples": ["sortByTimestamp", "sortUsersAlphabetically", "sortNumericValues"], "category": "Data Operations"},
            
            # System operations
            {"verb": "initialize", "description": "To set up the starting state of a system or component", 
             "examples": ["initializeDatabase", "initializeApplication", "initializeDefaultSettings"], "category": "System Operations"},
            {"verb": "configure", "description": "To set specific parameters or options for optimal operation", 
             "examples": ["configureServer", "configureLogging", "configureNetworkSettings"], "category": "System Operations"},
            {"verb": "deploy", "description": "To release software to a production environment", 
             "examples": ["deployApplication", "deployNewVersion", "deployToCloud"], "category": "System Operations"},
            
            # Code management
            {"verb": "refactor", "description": "To restructure existing code without changing its behavior", 
             "examples": ["refactorLegacyCode", "refactorForPerformance", "refactorToPattern"], "category": "Code Management"},
            {"verb": "encapsulate", "description": "To hide implementation details", 
             "examples": ["encapsulateBusinessLogic", "encapsulateState", "encapsulateDataAccess"], "category": "Code Management"},
            
            # UI/UX Operations
            {"verb": "render", "description": "To display UI elements on screen", 
             "examples": ["renderComponent", "renderTemplate", "renderDynamicContent"], "category": "UI/UX Operations"},
            {"verb": "animate", "description": "To create motion or transitions in UI", 
             "examples": ["animatePageTransition", "animateFadeIn", "animateSequence"], "category": "UI/UX Operations"},
            
            # Async Operations
            {"verb": "await", "description": "To pause execution until a promise resolves", 
             "examples": ["awaitDatabaseResult", "awaitUserResponse", "awaitAsyncOperation"], "category": "Async Operations"},
            {"verb": "promise", "description": "To represent a future value", 
             "examples": ["promiseFileUpload", "promiseApiResponse", "promiseDataFetch"], "category": "Async Operations"},
        ]
        
        # Convert to dictionary with verbs as keys
        taxonomy = {}
        for item in taxonomy_data:
            taxonomy[item["verb"]] = {
                "description": item["description"],
                "examples": item["examples"],
                "category": item["category"]
            }
        
        return taxonomy
    
    def add_action(self, verb: str, description: str, examples: List[str], category: str) -> bool:
        """
        Add a new action to the taxonomy.
        
        Args:
            verb: Action verb
            description: Action description
            examples: List of examples
            category: Action category
            
        Returns:
            Success status
        """
        if not self.initialized:
            self.load_taxonomy()
        
        # Add the action
        self.taxonomy[verb] = {
            "description": description,
            "examples": examples,
            "category": category
        }
        
        # If we have a vector store, embed the new action
        if self.vector_store:
            self._embed_action(verb)
        
        logger.info(f"Added action '{verb}' to taxonomy")
        return True
    
    def save_taxonomy(self, taxonomy_file: Optional[str] = None) -> bool:
        """
        Save the action taxonomy to a file.
        
        Args:
            taxonomy_file: Path to the taxonomy file (JSON)
            
        Returns:
            Success status
        """
        if not taxonomy_file:
            # Get the directory of this file
            current_dir = os.path.dirname(os.path.abspath(__file__))
            taxonomy_file = os.path.join(current_dir, "data", "action_taxonomy.json")
        
        try:
            # Ensure the directory exists
            os.makedirs(os.path.dirname(taxonomy_file), exist_ok=True)
            
            # Save the taxonomy
            with open(taxonomy_file, 'w') as f:
                json.dump(self.taxonomy, f, indent=2)
            
            logger.info(f"Saved taxonomy to {taxonomy_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving taxonomy: {e}")
            return False
    
    async def initialize_embeddings(self) -> bool:
        """
        Initialize embeddings for all taxonomy actions.
        
        Returns:
            Success status
        """
        if not self.vector_store:
            logger.warning("No vector store available for embeddings")
            return False
        
        if not self.initialized:
            self.load_taxonomy()
        
        try:
            # Embed all actions
            for verb in self.taxonomy:
                await self._embed_action(verb)
            
            # Embed categories
            categories = set(item["category"] for item in self.taxonomy.values())
            for category in categories:
                await self._embed_category(category)
            
            logger.info(f"Initialized embeddings for {len(self.taxonomy)} actions and {len(categories)} categories")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing embeddings: {e}")
            return False
    
    async def _embed_action(self, verb: str) -> bool:
        """
        Create embeddings for an action.
        
        Args:
            verb: Action verb
            
        Returns:
            Success status
        """
        if verb not in self.taxonomy:
            return False
        
        action = self.taxonomy[verb]
        
        # Create an embedding prompt that captures the essence of the action
        embedding_text = f"{verb}: {action['description']} Examples: {', '.join(action['examples'])}. Category: {action['category']}"
        
        try:
            # Generate embedding
            vector = await self.vector_store.get_embedding(embedding_text)
            
            # Store the vector
            self.action_vectors[verb] = vector
            
            # Add to indexed terms
            self.indexed_terms.add(verb)
            
            return True
            
        except Exception as e:
            logger.error(f"Error embedding action '{verb}': {e}")
            return False
    
    async def _embed_category(self, category: str) -> bool:
        """
        Create embeddings for a category.
        
        Args:
            category: Category name
            
        Returns:
            Success status
        """
        # Get all actions in this category
        actions = [verb for verb, data in self.taxonomy.items() if data["category"] == category]
        
        if not actions:
            return False
        
        # Create an embedding prompt that captures the essence of the category
        embedding_text = f"Category: {category}. Actions: {', '.join(actions)}."
        
        try:
            # Generate embedding
            vector = await self.vector_store.get_embedding(embedding_text)
            
            # Store the vector
            self.category_vectors[category] = vector
            
            return True
            
        except Exception as e:
            logger.error(f"Error embedding category '{category}': {e}")
            return False
    
    async def find_similar_actions(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Find actions similar to a query.
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of similar actions
        """
        if not self.vector_store:
            logger.warning("No vector store available for similarity search")
            return []
        
        try:
            # Generate embedding for the query
            query_vector = await self.vector_store.get_embedding(query)
            
            # Calculate similarity with all action vectors
            similarities = []
            for verb, vector in self.action_vectors.items():
                similarity = self._calculate_similarity(query_vector, vector)
                similarities.append((verb, similarity))
            
            # Sort by similarity (descending)
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            # Return top-k results
            results = []
            for verb, similarity in similarities[:top_k]:
                results.append({
                    "verb": verb,
                    "description": self.taxonomy[verb]["description"],
                    "category": self.taxonomy[verb]["category"],
                    "examples": self.taxonomy[verb]["examples"],
                    "similarity": similarity
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error finding similar actions: {e}")
            return []
    
    async def categorize_text(self, text: str, threshold: float = 0.6) -> List[Dict[str, Any]]:
        """
        Categorize text based on action taxonomy.
        
        Args:
            text: Text to categorize
            threshold: Similarity threshold
            
        Returns:
            List of matched actions and categories
        """
        if not self.vector_store:
            logger.warning("No vector store available for categorization")
            return []
        
        try:
            # Generate embedding for the text
            text_vector = await self.vector_store.get_embedding(text)
            
            # Calculate similarity with all action vectors
            action_similarities = []
            for verb, vector in self.action_vectors.items():
                similarity = self._calculate_similarity(text_vector, vector)
                if similarity >= threshold:
                    action_similarities.append((verb, similarity))
            
            # Calculate similarity with all category vectors
            category_similarities = []
            for category, vector in self.category_vectors.items():
                similarity = self._calculate_similarity(text_vector, vector)
                if similarity >= threshold:
                    category_similarities.append((category, similarity))
            
            # Sort by similarity (descending)
            action_similarities.sort(key=lambda x: x[1], reverse=True)
            category_similarities.sort(key=lambda x: x[1], reverse=True)
            
            # Prepare results
            results = {
                "actions": [],
                "categories": []
            }
            
            # Add matched actions
            for verb, similarity in action_similarities:
                results["actions"].append({
                    "verb": verb,
                    "description": self.taxonomy[verb]["description"],
                    "category": self.taxonomy[verb]["category"],
                    "similarity": similarity
                })
            
            # Add matched categories
            for category, similarity in category_similarities:
                results["categories"].append({
                    "category": category,
                    "similarity": similarity
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error categorizing text: {e}")
            return []
    
    def _calculate_similarity(self, vector1: List[float], vector2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.
        
        Args:
            vector1: First vector
            vector2: Second vector
            
        Returns:
            Similarity score (0-1)
        """
        # Convert to numpy arrays
        v1 = np.array(vector1)
        v2 = np.array(vector2)
        
        # Calculate cosine similarity
        dot_product = np.dot(v1, v2)
        norm_v1 = np.linalg.norm(v1)
        norm_v2 = np.linalg.norm(v2)
        
        if norm_v1 == 0 or norm_v2 == 0:
            return 0.0
        
        similarity = dot_product / (norm_v1 * norm_v2)
        return float(similarity)
    
    def get_actions_by_category(self, category: str) -> List[Dict[str, Any]]:
        """
        Get all actions in a specific category.
        
        Args:
            category: Category name
            
        Returns:
            List of actions in the category
        """
        if not self.initialized:
            self.load_taxonomy()
        
        actions = []
        for verb, data in self.taxonomy.items():
            if data["category"] == category:
                actions.append({
                    "verb": verb,
                    "description": data["description"],
                    "examples": data["examples"]
                })
        
        return actions
    
    def get_categories(self) -> List[str]:
        """
        Get all categories in the taxonomy.
        
        Returns:
            List of categories
        """
        if not self.initialized:
            self.load_taxonomy()
        
        categories = set(item["category"] for item in self.taxonomy.values())
        return sorted(list(categories))
    
    def get_action_details(self, verb: str) -> Optional[Dict[str, Any]]:
        """
        Get details for a specific action.
        
        Args:
            verb: Action verb
            
        Returns:
            Action details or None if not found
        """
        if not self.initialized:
            self.load_taxonomy()
        
        if verb in self.taxonomy:
            return {
                "verb": verb,
                "description": self.taxonomy[verb]["description"],
                "examples": self.taxonomy[verb]["examples"],
                "category": self.taxonomy[verb]["category"]
            }
        
        return None
    
    async def analyze_code(self, code: str, threshold: float = 0.6) -> Dict[str, Any]:
        """
        Analyze code to identify actions and categories.
        
        Args:
            code: Code to analyze
            threshold: Similarity threshold
            
        Returns:
            Analysis results
        """
        if not self.vector_store:
            logger.warning("No vector store available for code analysis")
            return {"actions": [], "categories": [], "summary": ""}
        
        try:
            # First, categorize the code
            categorization = await self.categorize_text(code, threshold)
            
            # Identify primary actions and categories
            primary_actions = categorization["actions"][:3]  # Top 3 actions
            primary_categories = categorization["categories"][:2]  # Top 2 categories
            
            # Generate a summary
            summary = self._generate_code_summary(code, primary_actions, primary_categories)
            
            # Add summary to results
            result = {
                "actions": primary_actions,
                "categories": primary_categories,
                "summary": summary
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error analyzing code: {e}")
            return {"actions": [], "categories": [], "summary": ""}
    
    def _generate_code_summary(self, code: str, 
                              actions: List[Dict[str, Any]], 
                              categories: List[Dict[str, Any]]) -> str:
        """
        Generate a summary of code based on detected actions and categories.
        
        Args:
            code: Code to summarize
            actions: Detected actions
            categories: Detected categories
            
        Returns:
            Code summary
        """
        # If no actions or categories were detected, return generic summary
        if not actions and not categories:
            return "Code with no clearly detected operations."
        
        # Build summary from detected actions and categories
        action_verbs = [a["verb"] for a in actions]
        category_names = [c["category"] for c in categories]
        
        if action_verbs and category_names:
            return f"Code performing {', '.join(action_verbs)} operations in the {', '.join(category_names)} domain."
        elif action_verbs:
            return f"Code performing {', '.join(action_verbs)} operations."
        elif category_names:
            return f"Code in the {', '.join(category_names)} domain."
        else:
            return "General code with no specific operations detected."


class TaxonomyEnhancedSearch:
    """
    Enhances search capabilities using the action taxonomy.
    
    This class integrates the action taxonomy with document search
    to provide more meaningful and accurate search results.
    """
    
    def __init__(self, vector_store: DocumentVectorStoreConnector, taxonomy: ActionTaxonomy):
        """
        Initialize the taxonomy-enhanced search.
        
        Args:
            vector_store: Vector store connector
            taxonomy: Action taxonomy instance
        """
        self.vector_store = vector_store
        self.taxonomy = taxonomy
        
        logger.info("Taxonomy-enhanced search initialized")
    
    async def search(self, query: str, top_k: int = 10, 
                   boost_taxonomy: bool = True) -> List[Dict[str, Any]]:
        """
        Perform an enhanced search using taxonomy understanding.
        
        Args:
            query: Search query
            top_k: Number of results to return
            boost_taxonomy: Whether to boost results based on taxonomy
            
        Returns:
            Search results
        """
        # First, check if the query matches any taxonomy terms
        taxonomy_matches = await self.taxonomy.find_similar_actions(query, top_k=3)
        
        # If we have taxonomy matches, enhance the query
        enhanced_query = query
        if taxonomy_matches and boost_taxonomy:
            top_match = taxonomy_matches[0]
            # Enhance query with the top match's description and category
            enhanced_query = f"{query} {top_match['description']} category:{top_match['category']}"
        
        # Perform the search
        search_results = await self.vector_store.search(enhanced_query, top_k=top_k)
        
        # If taxonomy boosting is enabled, re-rank results
        if boost_taxonomy and taxonomy_matches:
            search_results = await self._rerank_results(search_results, taxonomy_matches)
        
        # Add taxonomy information to results
        for result in search_results:
            result["taxonomy_info"] = await self._get_taxonomy_info(result["content"])
        
        return search_results
    
    async def _rerank_results(self, results: List[Dict[str, Any]], 
                            taxonomy_matches: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Re-rank search results based on taxonomy matches.
        
        Args:
            results: Original search results
            taxonomy_matches: Matching taxonomy actions
            
        Returns:
            Re-ranked results
        """
        # Create a copy of results for re-ranking
        reranked = results.copy()
        
        # Get top category and action
        top_category = taxonomy_matches[0]["category"] if taxonomy_matches else None
        top_verbs = [match["verb"] for match in taxonomy_matches[:2]]
        
        # Boost scores for results that match the top category or verbs
        for i, result in enumerate(reranked):
            # Get taxonomy info for the result
            taxonomy_info = await self._get_taxonomy_info(result["content"])
            
            # Calculate boost based on matches
            boost = 1.0
            
            # Boost for category match
            if top_category and top_category in taxonomy_info.get("categories", []):
                boost += 0.2
            
            # Boost for verb match
            for verb in top_verbs:
                if verb in taxonomy_info.get("actions", []):
                    boost += 0.15
            
            # Apply boost to score
            reranked[i]["score"] = result["score"] * boost
        
        # Re-sort by adjusted score
        reranked.sort(key=lambda x: x["score"], reverse=True)
        
        return reranked
    
    async def _get_taxonomy_info(self, content: str) -> Dict[str, Any]:
        """
        Get taxonomy information for content.
        
        Args:
            content: Content to analyze
            
        Returns:
            Taxonomy information
        """
        # Get a simple version with just names
        try:
            # Categorize the content
            categorization = await self.taxonomy.categorize_text(content, threshold=0.6)
            
            # Extract action and category names
            actions = [a["verb"] for a in categorization["actions"]]
            categories = [c["category"] for c in categorization["categories"]]
            
            return {
                "actions": actions,
                "categories": categories
            }
            
        except Exception as e:
            logger.error(f"Error getting taxonomy info: {e}")
            return {"actions": [], "categories": []}
    
    async def search_by_action(self, action: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for documents performing a specific action.
        
        Args:
            action: Action verb to search for
            top_k: Number of results to return
            
        Returns:
            Search results
        """
        # Get action details
        action_details = self.taxonomy.get_action_details(action)
        
        if not action_details:
            return []
        
        # Create a query using action details
        query = f"{action} {action_details['description']} {' '.join(action_details['examples'])}"
        
        # Perform the search
        search_results = await self.vector_store.search(query, top_k=top_k)
        
        # Add taxonomy information to results
        for result in search_results:
            result["taxonomy_info"] = await self._get_taxonomy_info(result["content"])
        
        return search_results
    
    async def search_by_category(self, category: str, top_k: int = 10) -> List[Dict[str, Any]]:
        """
        Search for documents in a specific category.
        
        Args:
            category: Category to search for
            top_k: Number of results to return
            
        Returns:
            Search results
        """
        # Get actions in this category
        actions = self.taxonomy.get_actions_by_category(category)
        
        if not actions:
            return []
        
        # Create a query using category and actions
        action_verbs = [a["verb"] for a in actions]
        query = f"category:{category} {' '.join(action_verbs)}"
        
        # Perform the search
        search_results = await self.vector_store.search(query, top_k=top_k)
        
        # Add taxonomy information to results
        for result in search_results:
            result["taxonomy_info"] = await self._get_taxonomy_info(result["content"])
        
        return search_results