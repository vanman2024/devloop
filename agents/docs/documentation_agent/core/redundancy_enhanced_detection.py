"""
Redundancy Enhanced Detection - Taxonomy-enhanced redundancy detection

This module extends the base redundancy detection system with taxonomy awareness,
allowing for more intelligent identification of similar content based on
semantic meaning and programming actions.
"""

import logging
from typing import Dict, List, Any, Optional, Tuple, Set, Union
from datetime import datetime

from ..models.document_model import Document
from ..connectors.vector_store_connector import DocumentVectorStoreConnector
from ..connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from ..core.redundancy_detection import RedundancyDetector, RedundancyDetectionResult
from ..taxonomy.action_taxonomy import ActionTaxonomy

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class TaxonomyEnhancedRedundancyDetector(RedundancyDetector):
    """
    Enhanced redundancy detector that uses action taxonomy to better
    identify similar content across documents.
    
    This class extends the base RedundancyDetector with additional
    semantic understanding of code and documentation operations.
    """
    
    def __init__(self, vector_store: DocumentVectorStoreConnector,
                knowledge_graph: DocumentKnowledgeGraphConnector,
                taxonomy: ActionTaxonomy,
                config: Dict[str, Any] = None):
        """
        Initialize the taxonomy-enhanced redundancy detector.
        
        Args:
            vector_store: Vector store connector
            knowledge_graph: Knowledge graph connector
            taxonomy: Action taxonomy instance
            config: Configuration dictionary
        """
        super().__init__(vector_store, knowledge_graph, config)
        self.taxonomy = taxonomy
        
        # Update configuration
        self.config = config or {}
        self.action_similarity_threshold = self.config.get("action_similarity_threshold", 0.6)
        self.action_weight = self.config.get("action_weight", 0.3)
        
        logger.info("Taxonomy-enhanced redundancy detector initialized")
    
    async def detect_redundancy(self, document: Document) -> RedundancyDetectionResult:
        """
        Detect redundancy between this document and others with taxonomy awareness.
        
        Args:
            document: The document to check for redundancy
            
        Returns:
            RedundancyDetectionResult containing detected overlaps and recommendations
        """
        # First, categorize the document to understand its actions
        document_actions = await self._analyze_document_actions(document)
        
        # Track the primary actions and categories
        document_primary_actions = [
            action["verb"] for action in document_actions.get("actions", [])
            if action.get("similarity", 0) >= self.action_similarity_threshold
        ]
        
        document_primary_categories = [
            category["category"] for category in document_actions.get("categories", [])
            if category.get("similarity", 0) >= self.action_similarity_threshold
        ]
        
        # Run standard redundancy detection
        result = await super().detect_redundancy(document)
        
        # Enhance with taxonomy awareness
        if document_primary_actions or document_primary_categories:
            # Store the taxonomy information in the result
            result.taxonomy_info = {
                "actions": document_primary_actions,
                "categories": document_primary_categories
            }
            
            # Enhance similar docs with taxonomy information
            await self._enhance_similar_docs(result, document_primary_actions, document_primary_categories)
            
            # Enhance recommended actions with taxonomy insights
            await self._enhance_recommendations(result, document_primary_actions, document_primary_categories)
        
        return result
    
    async def _analyze_document_actions(self, document: Document) -> Dict[str, Any]:
        """
        Analyze document to identify actions and categories.
        
        Args:
            document: Document to analyze
            
        Returns:
            Analysis results
        """
        # Get the document content
        content = document.content
        
        # Categorize content using the taxonomy
        try:
            categorization = await self.taxonomy.categorize_text(content, threshold=self.action_similarity_threshold)
            return categorization
        except Exception as e:
            logger.error(f"Error categorizing document: {e}")
            return {"actions": [], "categories": []}
    
    async def _enhance_similar_docs(self, result: RedundancyDetectionResult,
                                 primary_actions: List[str],
                                 primary_categories: List[str]) -> None:
        """
        Enhance similar document results with taxonomy awareness.
        
        Args:
            result: Current redundancy detection result
            primary_actions: Primary actions in source document
            primary_categories: Primary categories in source document
        """
        # Early exit if no similar docs or no taxonomy insights
        if not result.similar_docs or (not primary_actions and not primary_categories):
            return
        
        # Track original similarity scores
        original_scores = {doc["id"]: doc.get("similarity_score", 0) for doc in result.similar_docs}
        
        # For each similar document, analyze actions and calculate adjusted similarity
        for i, doc in enumerate(result.similar_docs):
            doc_id = doc["id"]
            
            # Get the document
            similar_doc_data = await self.knowledge_graph.get_document(doc_id)
            if not similar_doc_data:
                continue
                
            # Create a document object for analysis
            similar_doc = Document(
                id=doc_id,
                title=similar_doc_data.get("title", ""),
                content=similar_doc_data.get("content", ""),
                document_type=similar_doc_data.get("document_type", "")
            )
            
            # Analyze actions
            similar_doc_actions = await self._analyze_document_actions(similar_doc)
            
            # Get primary actions and categories
            similar_primary_actions = [
                action["verb"] for action in similar_doc_actions.get("actions", [])
                if action.get("similarity", 0) >= self.action_similarity_threshold
            ]
            
            similar_primary_categories = [
                category["category"] for category in similar_doc_actions.get("categories", [])
                if category.get("similarity", 0) >= self.action_similarity_threshold
            ]
            
            # Calculate action similarity
            action_overlap = len(set(primary_actions).intersection(set(similar_primary_actions)))
            action_similarity = action_overlap / max(len(primary_actions), len(similar_primary_actions), 1)
            
            # Calculate category similarity
            category_overlap = len(set(primary_categories).intersection(set(similar_primary_categories)))
            category_similarity = category_overlap / max(len(primary_categories), len(similar_primary_categories), 1)
            
            # Adjust similarity score
            original_similarity = original_scores[doc_id]
            adjusted_similarity = (
                original_similarity * (1 - self.action_weight) +
                ((action_similarity + category_similarity) / 2) * self.action_weight
            )
            
            # Update the similarity score
            result.similar_docs[i]["similarity_score"] = adjusted_similarity
            
            # Add taxonomy information
            result.similar_docs[i]["taxonomy_info"] = {
                "actions": similar_primary_actions,
                "categories": similar_primary_categories,
                "action_similarity": action_similarity,
                "category_similarity": category_similarity,
                "original_similarity": original_similarity
            }
            
            # Add function/class-level similarities if they exist
            if hasattr(similar_doc, "structure") and hasattr(document, "structure"):
                result.similar_docs[i]["function_similarities"] = await self._compare_functions(
                    document.structure, similar_doc.structure
                )
        
        # Re-sort by adjusted similarity
        result.similar_docs.sort(key=lambda x: x["similarity_score"], reverse=True)
    
    async def _enhance_recommendations(self, result: RedundancyDetectionResult,
                                    primary_actions: List[str],
                                    primary_categories: List[str]) -> None:
        """
        Enhance recommended actions with taxonomy insights.
        
        Args:
            result: Current redundancy detection result
            primary_actions: Primary actions in source document
            primary_categories: Primary categories in source document
        """
        # Early exit if no recommendations or no taxonomy insights
        if not result.recommended_actions or (not primary_actions and not primary_categories):
            return
        
        # Check for code operations that might need special handling
        is_functional_code = "transform" in primary_actions or "process" in primary_actions
        is_data_operation = any(cat == "Data Operations" for cat in primary_categories)
        is_system_operation = any(cat == "System Operations" for cat in primary_categories)
        
        # Add taxonomy-specific recommendations
        if is_functional_code and is_data_operation:
            # Recommend centralizing data transformation logic
            result.recommended_actions.append({
                "action_type": "centralize_data_operations",
                "priority": "medium",
                "description": "Centralize data transformation logic that appears in multiple locations",
                "taxonomy_driven": True
            })
        
        if is_system_operation and "initialize" in primary_actions:
            # Recommend standardizing initialization patterns
            result.recommended_actions.append({
                "action_type": "standardize_initialization",
                "priority": "medium",
                "description": "Standardize initialization patterns across similar components",
                "taxonomy_driven": True
            })
        
        # Check for redundant validation logic
        if "validate" in primary_actions:
            result.recommended_actions.append({
                "action_type": "unify_validation",
                "priority": "medium",
                "description": "Unify validation logic that appears across multiple components",
                "taxonomy_driven": True
            })
        
        # Add context to existing recommendations
        for i, action in enumerate(result.recommended_actions):
            if "merge_documents" == action["action_type"]:
                # Add taxonomy context to merge recommendation
                result.recommended_actions[i]["taxonomy_context"] = {
                    "actions": primary_actions,
                    "categories": primary_categories
                }
                
                # Adjust description based on taxonomy
                if is_data_operation:
                    result.recommended_actions[i]["description"] += " to consolidate data operation logic"
                elif is_system_operation:
                    result.recommended_actions[i]["description"] += " to standardize system operations"
    
    async def _compare_functions(self, source_structure: Dict[str, Any], 
                              target_structure: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Compare functions and classes between documents for similarities.
        
        Args:
            source_structure: Source document structure
            target_structure: Target document structure
            
        Returns:
            List of similar functions/classes
        """
        similarities = []
        
        # Compare functions
        source_functions = source_structure.get("functions", {})
        target_functions = target_structure.get("functions", {})
        
        for s_name, s_info in source_functions.items():
            for t_name, t_info in target_functions.items():
                # Calculate name similarity
                name_similarity = self._calculate_name_similarity(s_name, t_name)
                
                # Compare function parameters
                param_similarity = self._calculate_param_similarity(
                    s_info.get("parameters", []), 
                    t_info.get("parameters", [])
                )
                
                # Compare function bodies using vector similarity if content is available
                body_similarity = 0.0
                if "content" in s_info and "content" in t_info:
                    body_similarity = await self._calculate_content_similarity(
                        s_info["content"], t_info["content"]
                    )
                
                # Calculate overall similarity
                overall_similarity = (name_similarity * 0.2 + param_similarity * 0.3 + body_similarity * 0.5)
                
                # If similarity is significant, add to results
                if overall_similarity >= self.similarity_threshold:
                    similarities.append({
                        "source_name": s_name,
                        "target_name": t_name,
                        "type": "function",
                        "overall_similarity": overall_similarity,
                        "name_similarity": name_similarity,
                        "param_similarity": param_similarity,
                        "body_similarity": body_similarity
                    })
        
        # Similarly compare classes (simplified version)
        source_classes = source_structure.get("classes", {})
        target_classes = target_structure.get("classes", {})
        
        for s_name, s_info in source_classes.items():
            for t_name, t_info in target_classes.items():
                # Calculate name similarity
                name_similarity = self._calculate_name_similarity(s_name, t_name)
                
                # Compare methods (simplified)
                method_similarity = 0.0
                if "methods" in s_info and "methods" in t_info:
                    common_methods = set(s_info["methods"].keys()).intersection(set(t_info["methods"].keys()))
                    all_methods = set(s_info["methods"].keys()).union(set(t_info["methods"].keys()))
                    if all_methods:
                        method_similarity = len(common_methods) / len(all_methods)
                
                # Calculate overall similarity
                overall_similarity = (name_similarity * 0.3 + method_similarity * 0.7)
                
                # If similarity is significant, add to results
                if overall_similarity >= self.similarity_threshold:
                    similarities.append({
                        "source_name": s_name,
                        "target_name": t_name,
                        "type": "class",
                        "overall_similarity": overall_similarity,
                        "name_similarity": name_similarity,
                        "method_similarity": method_similarity
                    })
        
        return similarities
    
    def _calculate_name_similarity(self, name1: str, name2: str) -> float:
        """
        Calculate similarity between function or class names.
        
        Args:
            name1: First name
            name2: Second name
            
        Returns:
            Similarity score (0-1)
        """
        # Convert to lowercase and remove common prefixes/suffixes
        common_prefixes = ["get", "set", "create", "update", "delete", "process", "handle", "fetch"]
        common_suffixes = ["Handler", "Provider", "Service", "Manager", "Controller"]
        
        name1_clean = name1.lower()
        name2_clean = name2.lower()
        
        for prefix in common_prefixes:
            if name1_clean.startswith(prefix) and len(name1_clean) > len(prefix):
                name1_clean = name1_clean[len(prefix):]
            if name2_clean.startswith(prefix) and len(name2_clean) > len(prefix):
                name2_clean = name2_clean[len(prefix):]
        
        for suffix in common_suffixes:
            suffix_lower = suffix.lower()
            if name1_clean.endswith(suffix_lower) and len(name1_clean) > len(suffix_lower):
                name1_clean = name1_clean[:-len(suffix_lower)]
            if name2_clean.endswith(suffix_lower) and len(name2_clean) > len(suffix_lower):
                name2_clean = name2_clean[:-len(suffix_lower)]
        
        # Calculate Jaccard similarity on remaining words
        words1 = set(name1_clean.split("_"))
        words2 = set(name2_clean.split("_"))
        
        # Special case for camelCase or PascalCase
        if "_" not in name1_clean and "_" not in name2_clean:
            # Try to split by capital letters
            import re
            words1 = set(re.findall(r'[a-z]+', name1_clean))
            words2 = set(re.findall(r'[a-z]+', name2_clean))
        
        if not words1 or not words2:
            return 0.0
            
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    def _calculate_param_similarity(self, params1: List[str], params2: List[str]) -> float:
        """
        Calculate similarity between function parameters.
        
        Args:
            params1: First parameter list
            params2: Second parameter list
            
        Returns:
            Similarity score (0-1)
        """
        if not params1 and not params2:
            return 1.0
            
        if not params1 or not params2:
            return 0.0
            
        # Calculate Jaccard similarity
        set1 = set(params1)
        set2 = set(params2)
        
        intersection = set1.intersection(set2)
        union = set1.union(set2)
        
        return len(intersection) / len(union)
    
    async def _calculate_content_similarity(self, content1: str, content2: str) -> float:
        """
        Calculate similarity between function bodies.
        
        Args:
            content1: First content
            content2: Second content
            
        Returns:
            Similarity score (0-1)
        """
        if not self.vector_store:
            # Fall back to simple text similarity
            return self._compute_content_similarity(content1, content2)
            
        try:
            # Generate embeddings
            vector1 = await self.vector_store.get_embedding(content1)
            vector2 = await self.vector_store.get_embedding(content2)
            
            # Calculate cosine similarity
            return self._calculate_similarity(vector1, vector2)
            
        except Exception as e:
            logger.error(f"Error calculating content similarity: {e}")
            # Fall back to simple text similarity
            return self._compute_content_similarity(content1, content2)


class RedundancyActionAnalyzer:
    """
    Analyzes redundant code to identify similar actions and operation patterns.
    
    This class focuses on understanding what operations are being performed
    in similar documents to provide more insightful recommendations.
    """
    
    def __init__(self, taxonomy: ActionTaxonomy, vector_store: DocumentVectorStoreConnector):
        """
        Initialize the action analyzer.
        
        Args:
            taxonomy: Action taxonomy instance
            vector_store: Vector store connector
        """
        self.taxonomy = taxonomy
        self.vector_store = vector_store
        
        logger.info("RedundancyActionAnalyzer initialized")
    
    async def analyze_redundant_documents(self, result: RedundancyDetectionResult) -> Dict[str, Any]:
        """
        Analyze redundant documents to identify action patterns.
        
        Args:
            result: Redundancy detection result
            
        Returns:
            Analysis results
        """
        # Get the source document information
        source_doc_id = result.source_doc_id
        
        # Get similar documents
        similar_docs = result.similar_docs
        
        if not similar_docs:
            return {"patterns": [], "recommendations": []}
        
        # Collect document IDs
        doc_ids = [source_doc_id] + [doc["id"] for doc in similar_docs]
        
        # Initialize collections for analysis
        action_frequencies = {}
        category_frequencies = {}
        action_co_occurrences = {}
        
        # Analyze each document
        for doc_id in doc_ids:
            # Get document content
            doc_content = await self._get_document_content(doc_id)
            if not doc_content:
                continue
                
            # Analyze actions
            doc_actions = await self.taxonomy.categorize_text(doc_content, threshold=0.6)
            
            # Track actions
            detected_actions = [action["verb"] for action in doc_actions.get("actions", [])]
            detected_categories = [cat["category"] for cat in doc_actions.get("categories", [])]
            
            # Update frequency counts
            for action in detected_actions:
                if action not in action_frequencies:
                    action_frequencies[action] = 0
                action_frequencies[action] += 1
            
            for category in detected_categories:
                if category not in category_frequencies:
                    category_frequencies[category] = 0
                category_frequencies[category] += 1
            
            # Track co-occurrences
            for i, action1 in enumerate(detected_actions):
                for action2 in detected_actions[i+1:]:
                    pair = tuple(sorted([action1, action2]))
                    if pair not in action_co_occurrences:
                        action_co_occurrences[pair] = 0
                    action_co_occurrences[pair] += 1
        
        # Identify common patterns
        common_actions = [action for action, count in action_frequencies.items() if count > 1]
        common_categories = [cat for cat, count in category_frequencies.items() if count > 1]
        common_pairs = [pair for pair, count in action_co_occurrences.items() if count > 1]
        
        # Generate insights
        patterns = []
        recommendations = []
        
        # Action patterns
        if common_actions:
            patterns.append({
                "type": "common_actions",
                "actions": common_actions,
                "description": f"These documents commonly perform {', '.join(common_actions)} operations"
            })
            
            # If all documents share the same primary actions, suggest standardization
            if any(count == len(doc_ids) for action, count in action_frequencies.items()):
                full_overlap_actions = [action for action, count in action_frequencies.items() if count == len(doc_ids)]
                if full_overlap_actions:
                    recommendations.append({
                        "type": "standardize_implementation",
                        "actions": full_overlap_actions,
                        "description": f"Standardize implementation of {', '.join(full_overlap_actions)} operations across all documents"
                    })
        
        # Category patterns
        if common_categories:
            patterns.append({
                "type": "common_categories",
                "categories": common_categories,
                "description": f"These documents focus on {', '.join(common_categories)} operations"
            })
            
            # If all documents share the same primary category, suggest consolidation
            if any(count == len(doc_ids) for cat, count in category_frequencies.items()):
                primary_categories = [cat for cat, count in category_frequencies.items() if count == len(doc_ids)]
                if primary_categories:
                    recommendations.append({
                        "type": "consolidate_by_category",
                        "categories": primary_categories,
                        "description": f"Consider consolidating {', '.join(primary_categories)} operations into shared utilities or services"
                    })
        
        # Co-occurrence patterns
        if common_pairs:
            for pair in sorted(common_pairs, key=lambda p: action_co_occurrences[p], reverse=True)[:3]:
                patterns.append({
                    "type": "action_pair",
                    "actions": list(pair),
                    "frequency": action_co_occurrences[pair],
                    "description": f"Operations {pair[0]} and {pair[1]} frequently occur together"
                })
                
                # If actions are commonly paired, suggest creating named patterns
                if action_co_occurrences[pair] >= len(doc_ids) * 0.7:
                    recommendations.append({
                        "type": "extract_pattern",
                        "actions": list(pair),
                        "description": f"Extract {pair[0]}-{pair[1]} pattern into a named operation or utility function"
                    })
        
        return {
            "patterns": patterns,
            "recommendations": recommendations,
            "stats": {
                "actions": action_frequencies,
                "categories": category_frequencies,
                "co_occurrences": {f"{p[0]}-{p[1]}": c for p, c in action_co_occurrences.items()}
            }
        }
    
    async def _get_document_content(self, doc_id: str) -> Optional[str]:
        """
        Get document content.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Document content or None if not found
        """
        try:
            # Use the vector store to get document content
            doc = await self.vector_store.get_document(doc_id)
            if doc and "content" in doc:
                return doc["content"]
            return None
        except Exception as e:
            logger.error(f"Error getting document content: {e}")
            return None
    
    async def generate_consolidation_plan(self, result: RedundancyDetectionResult) -> Dict[str, Any]:
        """
        Generate a plan for consolidating redundant documents.
        
        Args:
            result: Redundancy detection result
            
        Returns:
            Consolidation plan
        """
        # First analyze the redundant documents
        analysis = await self.analyze_redundant_documents(result)
        
        # Extract patterns and recommendations
        patterns = analysis.get("patterns", [])
        action_recommendations = analysis.get("recommendations", [])
        
        # Get the source document ID
        source_doc_id = result.source_doc_id
        
        # Get similar documents
        similar_docs = result.similar_docs
        
        if not similar_docs:
            return {"status": "no_action_needed", "message": "No similar documents found"}
        
        # Get consolidation candidates
        consolidation_candidates = result.consolidation_candidates
        
        # Determine consolidation strategy
        if not consolidation_candidates:
            return {
                "status": "no_consolidation_needed",
                "message": "No documents meet the threshold for consolidation",
                "action_patterns": patterns,
                "action_recommendations": action_recommendations
            }
        
        # Generate consolidation plan
        plan = {
            "status": "consolidation_recommended",
            "source_document": source_doc_id,
            "candidates": consolidation_candidates,
            "action_patterns": patterns,
            "action_recommendations": action_recommendations,
            "steps": []
        }
        
        # Determine common actions across documents
        common_actions = [pattern["actions"] for pattern in patterns if pattern["type"] == "common_actions"]
        common_actions = common_actions[0] if common_actions else []
        
        # Generate consolidation steps based on actions
        if "transform" in common_actions or "process" in common_actions:
            plan["steps"].append({
                "type": "extract_transformation_logic",
                "description": "Extract common transformation logic into a shared utility",
                "priority": "high"
            })
        
        if "validate" in common_actions:
            plan["steps"].append({
                "type": "unify_validation",
                "description": "Create a unified validation library for the shared validation logic",
                "priority": "high"
            })
        
        if "query" in common_actions or "fetch" in common_actions:
            plan["steps"].append({
                "type": "centralize_data_access",
                "description": "Centralize data access logic to reduce query duplication",
                "priority": "medium"
            })
        
        # Default steps if no specific action patterns detected
        if not plan["steps"]:
            plan["steps"].append({
                "type": "merge_documents",
                "description": "Merge similar documents into a unified implementation",
                "priority": "medium"
            })
            
            plan["steps"].append({
                "type": "extract_common_logic",
                "description": "Extract common logic into shared utilities",
                "priority": "medium"
            })
        
        # Add refactoring recommendations
        plan["steps"].append({
            "type": "update_references",
            "description": "Update all references to the original documents to use the consolidated version",
            "priority": "medium"
        })
        
        plan["steps"].append({
            "type": "add_documentation",
            "description": "Add clear documentation to the consolidated components",
            "priority": "medium"
        })
        
        return plan