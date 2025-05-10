"""
Document Consolidation Agent for handling redundant documentation.

This agent is responsible for receiving handoffs related to document
consolidation, merging overlapping documents, and creating unified
versions of redundant content.
"""

import logging
import asyncio
from typing import Dict, List, Any, Optional, Tuple, Set, Union
from datetime import datetime
import json
import re

from ..models.document_model import Document
from ..connectors.knowledge_graph_connector import DocumentKnowledgeGraphConnector
from ..connectors.vector_store_connector import DocumentVectorStoreConnector
from ..core.inter_agent_handoff import (
    HandoffManager,
    HandoffContext,
    HandoffPriority,
    HandoffStatus
)
from ..core.redundancy_detection import RedundancyDetectionResult

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DocumentConsolidationAgent:
    """
    Agent responsible for consolidating and merging redundant documentation.
    
    This agent handles:
    1. Merging similar documents
    2. Developing consolidation strategies
    3. Unifying documentation across related areas
    4. Creating comprehensive documents from fragmented pieces
    """
    
    def __init__(self, agent_id: str, 
                 knowledge_graph: DocumentKnowledgeGraphConnector,
                 vector_store: DocumentVectorStoreConnector,
                 handoff_manager: HandoffManager,
                 llm_service=None,
                 config: Dict[str, Any] = None):
        """Initialize the document consolidation agent."""
        self.agent_id = agent_id
        self.knowledge_graph = knowledge_graph
        self.vector_store = vector_store
        self.handoff_manager = handoff_manager
        self.llm_service = llm_service
        self.config = config or {}
        
        # Default configurations
        self.default_review_agent_id = self.config.get("review_agent_id", "doc_review_agent")
        self.content_agent_id = self.config.get("content_agent_id", "doc_content_agent")
        self.human_review_required = self.config.get("human_review_required", True)
        self.human_interface_id = self.config.get("human_interface_id", "human_interface")
        
        # Active consolidation tasks
        self.active_tasks = {}
        
        # Register with handoff manager
        # This would typically use event-based registration
        logger.info(f"DocumentConsolidationAgent initialized with ID {agent_id}")
    
    async def start(self):
        """Start listening for handoffs."""
        logger.info(f"DocumentConsolidationAgent {self.agent_id} starting")
        # In a real implementation, this would register message handlers
        # Here we just log the start
        pass
    
    async def process_handoff(self, handoff_id: str, 
                            handoff_context: HandoffContext,
                            task: str) -> Dict[str, Any]:
        """
        Process a received handoff.
        
        Args:
            handoff_id: Handoff ID
            handoff_context: Handoff context
            task: Task description
            
        Returns:
            Processing result
        """
        logger.info(f"Processing handoff {handoff_id}: {task}")
        
        # Accept the handoff
        await self.handoff_manager.accept_handoff(handoff_id)
        
        # Log that we're working on this task
        self.active_tasks[handoff_id] = {
            "status": "in_progress",
            "started_at": datetime.now().isoformat(),
            "task": task,
            "document_id": handoff_context.document_id
        }
        
        # Determine task type
        if "merge" in task.lower():
            result = await self._handle_document_merge(handoff_context)
        elif "consolidation" in task.lower():
            result = await self._handle_consolidation_strategy(handoff_context)
        else:
            # Default handling if task doesn't match specific patterns
            result = await self._handle_general_consolidation(handoff_context)
        
        # Mark the task as completed
        self.active_tasks[handoff_id]["status"] = "completed"
        self.active_tasks[handoff_id]["completed_at"] = datetime.now().isoformat()
        self.active_tasks[handoff_id]["result"] = result
        
        # Complete the handoff
        await self.handoff_manager.complete_handoff(
            handoff_id,
            results=result,
            updated_context=handoff_context
        )
        
        return result
    
    async def _handle_document_merge(self, context: HandoffContext) -> Dict[str, Any]:
        """
        Handle document merge task.
        
        Args:
            context: Handoff context
            
        Returns:
            Merge result
        """
        logger.info(f"Handling document merge for {context.document_id}")
        
        # Get source document
        source_document = await self._get_document(context.document_id)
        if not source_document:
            return {"status": "failed", "reason": "Source document not found"}
        
        # Get merge candidates
        merge_candidates = []
        for action in context.metadata.get("actions", []):
            if "target_document_id" in action:
                target_doc = await self._get_document(action["target_document_id"])
                if target_doc:
                    merge_candidates.append(target_doc)
        
        if not merge_candidates:
            return {"status": "failed", "reason": "No valid merge candidates found"}
        
        # Perform document merge
        merged_document = await self._merge_documents(source_document, merge_candidates)
        
        # Store the merged document
        merged_doc_id = await self._store_merged_document(merged_document)
        
        # Update relationships
        await self._update_relationships(merged_doc_id, 
                                      [source_document.id] + [doc.id for doc in merge_candidates])
        
        # Request human review if needed
        if self.human_review_required:
            await self._request_human_review(merged_doc_id, source_document.id, 
                                          [doc.id for doc in merge_candidates])
        
        return {
            "status": "success",
            "consolidated_document_id": merged_doc_id,
            "source_document_id": source_document.id,
            "merged_document_ids": [doc.id for doc in merge_candidates],
            "merged_at": datetime.now().isoformat(),
            "human_review_requested": self.human_review_required
        }
    
    async def _handle_consolidation_strategy(self, context: HandoffContext) -> Dict[str, Any]:
        """
        Handle consolidation strategy development.
        
        Args:
            context: Handoff context
            
        Returns:
            Strategy result
        """
        logger.info(f"Developing consolidation strategy for {context.document_id}")
        
        # Get source document
        source_document = await self._get_document(context.document_id)
        if not source_document:
            return {"status": "failed", "reason": "Source document not found"}
        
        # Get consolidation candidates
        candidates = []
        candidate_ids = []
        for action in context.metadata.get("actions", []):
            if action.get("action_type") == "consolidation_strategy":
                candidate_ids = action.get("candidate_documents", [])
                break
        
        # Get candidate documents
        for doc_id in candidate_ids:
            doc = await self._get_document(doc_id)
            if doc:
                candidates.append(doc)
        
        # Create consolidation strategy
        strategy = await self._develop_consolidation_strategy(
            source_document, candidates
        )
        
        # Create task handoffs for each action in the strategy
        handoff_ids = []
        for task in strategy["tasks"]:
            # Create task context
            task_context = HandoffContext(
                document_id=task.get("document_id", source_document.id),
                document_type=context.document_type,
                handoff_reason="Consolidation strategy implementation"
            )
            
            # Add strategy to metadata
            task_context.metadata = {
                "strategy_id": strategy["strategy_id"],
                "task": task,
                "source_strategy": "consolidation"
            }
            
            # Determine target agent
            task_type = task.get("task_type", "")
            target_agent = self._get_agent_for_task(task_type)
            
            if target_agent:
                task_handoff_id = await self.handoff_manager.initiate_handoff(
                    recipient_id=target_agent,
                    task=task.get("description", "Implement consolidation action"),
                    context=task_context,
                    priority=HandoffPriority.MEDIUM
                )
                
                handoff_ids.append(task_handoff_id)
        
        # Store the strategy for future reference
        strategy_id = await self._store_consolidation_strategy(strategy)
        
        return {
            "status": "success",
            "strategy_id": strategy_id,
            "source_document_id": source_document.id,
            "candidate_document_ids": [doc.id for doc in candidates],
            "task_count": len(strategy["tasks"]),
            "handoff_ids": handoff_ids,
            "estimated_completion_time": strategy.get("estimated_completion_time")
        }
    
    async def _handle_general_consolidation(self, context: HandoffContext) -> Dict[str, Any]:
        """
        Handle general consolidation task.
        
        Args:
            context: Handoff context
            
        Returns:
            Consolidation result
        """
        logger.info(f"Handling general consolidation for {context.document_id}")
        
        # Get source document
        source_document = await self._get_document(context.document_id)
        if not source_document:
            return {"status": "failed", "reason": "Source document not found"}
        
        # Get related documents
        related_docs = await self._get_related_documents(source_document.id)
        
        # Analyze relationships
        relationship_analysis = await self._analyze_document_relationships(
            source_document, related_docs
        )
        
        # Perform basic consolidation
        consolidation_result = await self._perform_basic_consolidation(
            source_document, related_docs, relationship_analysis
        )
        
        return {
            "status": "success",
            "source_document_id": source_document.id,
            "related_document_count": len(related_docs),
            "actions_taken": consolidation_result.get("actions_taken", []),
            "updated_documents": consolidation_result.get("updated_documents", []),
            "consolidated_at": datetime.now().isoformat()
        }
    
    async def _get_document(self, doc_id: str) -> Optional[Document]:
        """
        Get a document from the knowledge graph.
        
        Args:
            doc_id: Document ID
            
        Returns:
            Document object or None if not found
        """
        try:
            doc_data = await self.knowledge_graph.get_document(doc_id)
            
            if not doc_data:
                logger.warning(f"Document {doc_id} not found in knowledge graph")
                return None
                
            # Create Document object
            return Document(
                id=doc_id,
                title=doc_data.get("title", "Untitled"),
                content=doc_data.get("content", ""),
                document_type=doc_data.get("document_type", "text")
            )
        except Exception as e:
            logger.error(f"Error getting document {doc_id}: {e}")
            return None
    
    async def _get_related_documents(self, doc_id: str) -> List[Document]:
        """
        Get documents related to the given document.
        
        Args:
            doc_id: Document ID
            
        Returns:
            List of related documents
        """
        try:
            # Get document relationships
            relationships = await self.knowledge_graph.get_document_relationships(doc_id)
            
            # Extract related document IDs
            related_ids = [r["target_id"] for r in relationships]
            
            # Get document objects
            related_docs = []
            for related_id in related_ids:
                doc = await self._get_document(related_id)
                if doc:
                    related_docs.append(doc)
            
            return related_docs
        except Exception as e:
            logger.error(f"Error getting related documents for {doc_id}: {e}")
            return []
    
    async def _merge_documents(self, source_doc: Document, 
                            target_docs: List[Document]) -> Document:
        """
        Merge multiple documents into a single cohesive document.
        
        Args:
            source_doc: Source document
            target_docs: Documents to merge with source
            
        Returns:
            Merged document
        """
        # If LLM service is available, use it for intelligent merging
        if self.llm_service:
            return await self._merge_documents_with_llm(source_doc, target_docs)
        
        # Otherwise use rule-based merging
        return await self._merge_documents_rule_based(source_doc, target_docs)
    
    async def _merge_documents_with_llm(self, source_doc: Document,
                                      target_docs: List[Document]) -> Document:
        """
        Merge documents using LLM for intelligent content combination.
        
        Args:
            source_doc: Source document
            target_docs: Documents to merge with source
            
        Returns:
            Merged document
        """
        # Prepare context for LLM
        docs_context = [
            {
                "id": source_doc.id,
                "title": source_doc.title,
                "content": source_doc.content[:2000] + "..." if len(source_doc.content) > 2000 else source_doc.content
            }
        ]
        
        for doc in target_docs:
            docs_context.append({
                "id": doc.id,
                "title": doc.title,
                "content": doc.content[:2000] + "..." if len(doc.content) > 2000 else doc.content
            })
        
        # Create prompt for the LLM
        prompt = self._create_merge_prompt(docs_context)
        
        try:
            # Call LLM service
            llm_result = await self.llm_service.generate_text(prompt)
            
            # Extract content and title from result
            title_match = re.search(r"TITLE:\s*(.*?)(?:\n|$)", llm_result)
            content_match = re.search(r"CONTENT:\s*(.*)", llm_result, re.DOTALL)
            
            merged_title = title_match.group(1) if title_match else f"Merged: {source_doc.title}"
            merged_content = content_match.group(1) if content_match else llm_result
            
            # Create merged document
            return Document(
                id=f"merged_{source_doc.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                title=merged_title,
                content=merged_content,
                document_type=source_doc.document_type
            )
        except Exception as e:
            logger.error(f"Error merging documents with LLM: {e}")
            # Fall back to rule-based merging
            return await self._merge_documents_rule_based(source_doc, target_docs)
    
    def _create_merge_prompt(self, docs_context: List[Dict[str, Any]]) -> str:
        """
        Create a prompt for the LLM to merge documents.
        
        Args:
            docs_context: Document context information
            
        Returns:
            Prompt string
        """
        prompt = "Please merge the following documents into a single cohesive document:\n\n"
        
        for i, doc in enumerate(docs_context):
            prompt += f"DOCUMENT {i+1} - {doc['title']}:\n"
            prompt += f"{doc['content']}\n\n"
        
        prompt += "\nPlease create a merged document that combines the information, removes redundancy,"
        prompt += " and presents a cohesive narrative. Use this format for your response:\n\n"
        prompt += "TITLE: [merged document title]\n\n"
        prompt += "CONTENT:\n[merged document content]"
        
        return prompt
    
    async def _merge_documents_rule_based(self, source_doc: Document,
                                       target_docs: List[Document]) -> Document:
        """
        Merge documents using rule-based approach.
        
        Args:
            source_doc: Source document
            target_docs: Documents to merge with source
            
        Returns:
            Merged document
        """
        # Extract headings from all documents
        source_sections = self._extract_document_sections(source_doc.content)
        
        all_sections = {}
        all_sections.update(source_sections)
        
        for doc in target_docs:
            doc_sections = self._extract_document_sections(doc.content)
            
            # Merge sections
            for heading, content in doc_sections.items():
                if heading in all_sections:
                    # Found duplicate heading, combine content
                    all_sections[heading] += f"\n\n*Combined from {doc.title}:*\n\n{content}"
                else:
                    # New heading, add with attribution
                    all_sections[heading] = f"*From {doc.title}:*\n\n{content}"
        
        # Create merged content
        merged_content = ""
        
        # Add title and intro if available
        if "# Introduction" in all_sections:
            merged_content += all_sections["# Introduction"] + "\n\n"
            del all_sections["# Introduction"]
        
        # Add remaining sections
        for heading, content in all_sections.items():
            merged_content += f"{heading}\n\n{content}\n\n"
        
        # Create merged title
        merged_title = f"Merged: {source_doc.title}"
        
        # Create merged document
        return Document(
            id=f"merged_{source_doc.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            title=merged_title,
            content=merged_content,
            document_type=source_doc.document_type
        )
    
    def _extract_document_sections(self, content: str) -> Dict[str, str]:
        """
        Extract sections from a markdown document.
        
        Args:
            content: Document content
            
        Returns:
            Dictionary mapping headings to content
        """
        sections = {}
        lines = content.split("\n")
        
        current_heading = "# Introduction"
        current_content = []
        
        for line in lines:
            if line.startswith("#"):
                # Save previous section
                if current_content:
                    sections[current_heading] = "\n".join(current_content)
                
                # Start new section
                current_heading = line
                current_content = []
            else:
                current_content.append(line)
        
        # Add the last section
        if current_content:
            sections[current_heading] = "\n".join(current_content)
            
        return sections
    
    async def _store_merged_document(self, document: Document) -> str:
        """
        Store a merged document in the knowledge graph.
        
        Args:
            document: Document to store
            
        Returns:
            Document ID
        """
        try:
            # Store document in knowledge graph
            doc_id = await self.knowledge_graph.add_document({
                "id": document.id,
                "title": document.title,
                "content": document.content,
                "document_type": document.document_type,
                "created_at": datetime.now().isoformat(),
                "created_by": self.agent_id,
                "is_merged_document": True
            })
            
            # Add to vector store for future reference
            await self.vector_store.add_document(document)
            
            return doc_id
        except Exception as e:
            logger.error(f"Error storing merged document: {e}")
            return document.id
    
    async def _update_relationships(self, merged_doc_id: str, 
                                  source_doc_ids: List[str]) -> None:
        """
        Update relationships between merged document and source documents.
        
        Args:
            merged_doc_id: Merged document ID
            source_doc_ids: Source document IDs
        """
        try:
            # Add relationships from merged doc to source docs
            for doc_id in source_doc_ids:
                await self.knowledge_graph.add_relationship({
                    "source_id": merged_doc_id,
                    "target_id": doc_id,
                    "relationship_type": "derived_from",
                    "properties": {
                        "created_at": datetime.now().isoformat(),
                        "created_by": self.agent_id
                    }
                })
                
                # Optionally mark source docs as superseded
                await self.knowledge_graph.add_relationship({
                    "source_id": doc_id,
                    "target_id": merged_doc_id,
                    "relationship_type": "superseded_by",
                    "properties": {
                        "created_at": datetime.now().isoformat(),
                        "created_by": self.agent_id
                    }
                })
                
            logger.info(f"Updated relationships for merged document {merged_doc_id}")
        except Exception as e:
            logger.error(f"Error updating relationships: {e}")
    
    async def _request_human_review(self, merged_doc_id: str, 
                                 source_doc_id: str,
                                 merged_doc_ids: List[str]) -> None:
        """
        Request human review of a merged document.
        
        Args:
            merged_doc_id: Merged document ID
            source_doc_id: Source document ID
            merged_doc_ids: Merged document IDs
        """
        try:
            # Create context for human review
            context = HandoffContext(
                document_id=merged_doc_id,
                metadata={
                    "source_document_id": source_doc_id,
                    "merged_document_ids": merged_doc_ids,
                    "merger_agent_id": self.agent_id,
                    "review_type": "document_consolidation"
                }
            )
            
            # Initiate handoff to human interface
            handoff_id = await self.handoff_manager.initiate_handoff(
                recipient_id=self.human_interface_id,
                task=f"Review merged document: {merged_doc_id}",
                context=context,
                priority=HandoffPriority.MEDIUM
            )
            
            logger.info(f"Requested human review with handoff {handoff_id}")
        except Exception as e:
            logger.error(f"Error requesting human review: {e}")
    
    async def _develop_consolidation_strategy(self, source_doc: Document,
                                          related_docs: List[Document]) -> Dict[str, Any]:
        """
        Develop a strategy for consolidating multiple documents.
        
        Args:
            source_doc: Source document
            related_docs: Related documents
            
        Returns:
            Consolidation strategy
        """
        # Create strategy ID
        strategy_id = f"strategy_{source_doc.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Analyze documents to determine best approach
        docs_analysis = await self._analyze_documents_for_strategy(source_doc, related_docs)
        
        # Create tasks based on analysis
        tasks = []
        
        # 1. If there are highly similar documents, create merge tasks
        for doc_group in docs_analysis.get("merge_candidates", []):
            if len(doc_group) > 1:
                primary_doc = doc_group[0]
                tasks.append({
                    "task_type": "merge_documents",
                    "document_id": primary_doc["id"],
                    "related_document_ids": [d["id"] for d in doc_group[1:]],
                    "description": f"Merge document '{primary_doc['title']}' with {len(doc_group)-1} related documents",
                    "priority": "high"
                })
        
        # 2. If there are documents with specific overlapping sections, create section consolidation tasks
        for section_group in docs_analysis.get("section_consolidation", []):
            tasks.append({
                "task_type": "consolidate_sections",
                "document_ids": [d["id"] for d in section_group["documents"]],
                "section_name": section_group["section_name"],
                "description": f"Consolidate '{section_group['section_name']}' section across {len(section_group['documents'])} documents",
                "priority": "medium"
            })
        
        # 3. Create cross-reference tasks
        for doc in docs_analysis.get("cross_reference_candidates", []):
            tasks.append({
                "task_type": "add_cross_references",
                "document_id": doc["id"],
                "reference_document_ids": doc["reference_ids"],
                "description": f"Add cross-references to document '{doc['title']}'",
                "priority": "low"
            })
        
        # 4. Create final documentation hub if needed
        if docs_analysis.get("needs_documentation_hub", False):
            tasks.append({
                "task_type": "create_documentation_hub",
                "document_ids": [source_doc.id] + [d.id for d in related_docs],
                "description": f"Create documentation hub for {source_doc.title} and related topics",
                "priority": "medium"
            })
        
        # Calculate estimated completion time
        estimated_completion = datetime.now()
        # Add 1 hour per complex task (merge, create hub), 30 min per simple task
        for task in tasks:
            if task["task_type"] in ["merge_documents", "create_documentation_hub"]:
                estimated_completion = estimated_completion.replace(
                    hour=estimated_completion.hour + 1
                )
            else:
                estimated_completion = estimated_completion.replace(
                    minute=estimated_completion.minute + 30
                )
        
        # Create strategy
        strategy = {
            "strategy_id": strategy_id,
            "source_document_id": source_doc.id,
            "related_document_ids": [d.id for d in related_docs],
            "analysis": docs_analysis,
            "tasks": tasks,
            "created_at": datetime.now().isoformat(),
            "created_by": self.agent_id,
            "estimated_completion_time": estimated_completion.isoformat(),
            "status": "initiated"
        }
        
        return strategy
    
    async def _analyze_documents_for_strategy(self, source_doc: Document,
                                           related_docs: List[Document]) -> Dict[str, Any]:
        """
        Analyze documents to determine consolidation strategy.
        
        Args:
            source_doc: Source document
            related_docs: Related documents
            
        Returns:
            Analysis results
        """
        # Base analysis result
        analysis = {
            "merge_candidates": [],
            "section_consolidation": [],
            "cross_reference_candidates": [],
            "needs_documentation_hub": False
        }
        
        # 1. Group highly similar documents for merging
        similarity_matrix = await self._compute_document_similarity_matrix(
            [source_doc] + related_docs
        )
        
        similarity_threshold = 0.75
        doc_list = [source_doc] + related_docs
        doc_map = {doc.id: {"id": doc.id, "title": doc.title, "document": doc} for doc in doc_list}
        
        # Find groups of similar documents
        processed_docs = set()
        for i, doc1 in enumerate(doc_list):
            if doc1.id in processed_docs:
                continue
                
            doc_group = [doc_map[doc1.id]]
            processed_docs.add(doc1.id)
            
            for j, doc2 in enumerate(doc_list):
                if doc2.id in processed_docs:
                    continue
                    
                if i != j and similarity_matrix[i][j] > similarity_threshold:
                    doc_group.append(doc_map[doc2.id])
                    processed_docs.add(doc2.id)
            
            if len(doc_group) > 1:
                analysis["merge_candidates"].append(doc_group)
        
        # 2. Find sections that should be consolidated
        consolidated_sections = await self._identify_consolidation_sections(
            source_doc, related_docs
        )
        
        analysis["section_consolidation"] = consolidated_sections
        
        # 3. Identify cross-reference candidates
        for doc in doc_list:
            # Skip docs that are being merged
            if any(doc.id in [d["id"] for d in group] for group in analysis["merge_candidates"]):
                continue
                
            # Find documents this should reference
            references = []
            for other_doc in doc_list:
                if doc.id == other_doc.id:
                    continue
                    
                # Check for related content
                i = doc_list.index(doc)
                j = doc_list.index(other_doc)
                
                if similarity_matrix[i][j] > 0.3 and similarity_matrix[i][j] < similarity_threshold:
                    references.append(other_doc.id)
            
            if references:
                analysis["cross_reference_candidates"].append({
                    "id": doc.id,
                    "title": doc.title,
                    "reference_ids": references
                })
        
        # 4. Determine if documentation hub is needed
        # If there are many related documents or multiple distinct topics, a hub is helpful
        if len(doc_list) > 3 or len(analysis["merge_candidates"]) > 1:
            analysis["needs_documentation_hub"] = True
        
        return analysis
    
    async def _compute_document_similarity_matrix(self, 
                                              documents: List[Document]) -> List[List[float]]:
        """
        Compute similarity matrix between documents.
        
        Args:
            documents: List of documents
            
        Returns:
            Matrix of similarity scores
        """
        # If vector store supports batch similarity, use it
        if hasattr(self.vector_store, 'compute_similarity_matrix'):
            return await self.vector_store.compute_similarity_matrix(documents)
        
        # Otherwise compute pairwise similarity
        n = len(documents)
        matrix = [[0.0 for _ in range(n)] for _ in range(n)]
        
        # Diagonal is always 1.0 (self-similarity)
        for i in range(n):
            matrix[i][i] = 1.0
        
        # Compute pairwise similarity
        for i in range(n):
            for j in range(i+1, n):
                doc1 = documents[i]
                doc2 = documents[j]
                
                # Get document vectors
                vec1 = await self.vector_store.get_document_vector(doc1.id)
                vec2 = await self.vector_store.get_document_vector(doc2.id)
                
                # Compute similarity if both vectors exist
                if vec1 is not None and vec2 is not None:
                    similarity = await self.vector_store.compute_vector_similarity(vec1, vec2)
                else:
                    # Fallback to content similarity
                    similarity = self._compute_content_similarity(doc1.content, doc2.content)
                
                # Symmetric matrix
                matrix[i][j] = similarity
                matrix[j][i] = similarity
        
        return matrix
    
    def _compute_content_similarity(self, content1: str, content2: str) -> float:
        """
        Compute similarity between two content strings.
        
        Args:
            content1: First content
            content2: Second content
            
        Returns:
            Similarity score (0-1)
        """
        # Simple Jaccard similarity
        tokens1 = set(content1.lower().split())
        tokens2 = set(content2.lower().split())
        
        intersection = tokens1.intersection(tokens2)
        union = tokens1.union(tokens2)
        
        if not union:
            return 0.0
            
        return len(intersection) / len(union)
    
    async def _identify_consolidation_sections(self, source_doc: Document,
                                            related_docs: List[Document]) -> List[Dict[str, Any]]:
        """
        Identify sections that should be consolidated across documents.
        
        Args:
            source_doc: Source document
            related_docs: Related documents
            
        Returns:
            List of section consolidation candidates
        """
        # Extract sections from all documents
        all_sections = {}
        
        source_sections = self._extract_document_sections(source_doc.content)
        all_sections[source_doc.id] = {
            "id": source_doc.id,
            "title": source_doc.title,
            "sections": source_sections
        }
        
        for doc in related_docs:
            doc_sections = self._extract_document_sections(doc.content)
            all_sections[doc.id] = {
                "id": doc.id,
                "title": doc.title,
                "sections": doc_sections
            }
        
        # Find common section headings
        section_map = {}
        
        for doc_id, doc_info in all_sections.items():
            for heading in doc_info["sections"].keys():
                # Normalize heading for comparison
                norm_heading = self._normalize_heading(heading)
                
                if norm_heading not in section_map:
                    section_map[norm_heading] = []
                
                section_map[norm_heading].append({
                    "doc_id": doc_id,
                    "heading": heading,
                    "content": doc_info["sections"][heading]
                })
        
        # Filter to sections that appear in multiple documents
        consolidation_candidates = []
        
        for norm_heading, sections in section_map.items():
            if len(sections) > 1:
                # Check content similarity to confirm these are related sections
                similar = True
                for i in range(len(sections)-1):
                    for j in range(i+1, len(sections)):
                        similarity = self._compute_content_similarity(
                            sections[i]["content"], 
                            sections[j]["content"]
                        )
                        if similarity < 0.3:  # Threshold for related sections
                            similar = False
                            break
                    
                    if not similar:
                        break
                
                if similar:
                    # Find original heading from first section
                    original_heading = sections[0]["heading"]
                    
                    # Get document info for each section
                    section_docs = []
                    for section in sections:
                        doc_id = section["doc_id"]
                        doc_info = all_sections[doc_id]
                        section_docs.append({
                            "id": doc_id,
                            "title": doc_info["title"]
                        })
                    
                    consolidation_candidates.append({
                        "section_name": original_heading.strip("# "),
                        "normalized_name": norm_heading,
                        "documents": section_docs,
                        "document_count": len(section_docs)
                    })
        
        return consolidation_candidates
    
    def _normalize_heading(self, heading: str) -> str:
        """
        Normalize a heading for comparison.
        
        Args:
            heading: Original heading
            
        Returns:
            Normalized heading
        """
        # Remove markdown heading symbols and lowercase
        return re.sub(r'^#+\s*', '', heading).lower().strip()
    
    async def _store_consolidation_strategy(self, strategy: Dict[str, Any]) -> str:
        """
        Store consolidation strategy in the knowledge graph.
        
        Args:
            strategy: Consolidation strategy
            
        Returns:
            Strategy ID
        """
        try:
            # Convert strategy to a storable format if needed
            strategy_json = json.dumps(strategy)
            
            # Store as a special document type
            strategy_doc = {
                "id": strategy["strategy_id"],
                "title": f"Consolidation Strategy: {strategy['source_document_id']}",
                "content": strategy_json,
                "document_type": "consolidation_strategy",
                "created_at": strategy["created_at"],
                "created_by": self.agent_id
            }
            
            await self.knowledge_graph.add_document(strategy_doc)
            
            # Add relationships to all involved documents
            source_id = strategy["source_document_id"]
            
            await self.knowledge_graph.add_relationship({
                "source_id": strategy["strategy_id"],
                "target_id": source_id,
                "relationship_type": "applies_to",
                "properties": {"primary": True}
            })
            
            for doc_id in strategy["related_document_ids"]:
                await self.knowledge_graph.add_relationship({
                    "source_id": strategy["strategy_id"],
                    "target_id": doc_id,
                    "relationship_type": "applies_to",
                    "properties": {"primary": False}
                })
            
            return strategy["strategy_id"]
        except Exception as e:
            logger.error(f"Error storing consolidation strategy: {e}")
            return strategy["strategy_id"]
    
    async def _analyze_document_relationships(self, source_doc: Document,
                                           related_docs: List[Document]) -> Dict[str, Any]:
        """
        Analyze relationships between documents.
        
        Args:
            source_doc: Source document
            related_docs: Related documents
            
        Returns:
            Relationship analysis
        """
        analysis = {
            "relationship_types": {},
            "citation_network": [],
            "topic_clusters": []
        }
        
        # Get explicit relationships
        for doc in [source_doc] + related_docs:
            relationships = await self.knowledge_graph.get_document_relationships(doc.id)
            
            for rel in relationships:
                rel_type = rel["relationship_type"]
                
                if rel_type not in analysis["relationship_types"]:
                    analysis["relationship_types"][rel_type] = 0
                    
                analysis["relationship_types"][rel_type] += 1
                
                # Add to citation network if it's a reference
                if rel_type in ["references", "cited_by", "extends"]:
                    analysis["citation_network"].append({
                        "source": doc.id,
                        "target": rel["target_id"],
                        "type": rel_type
                    })
        
        # Identify topic clusters
        # This would typically use more sophisticated clustering
        # Here we use a simple approach based on title similarity
        
        # Extract potential topics from titles
        all_docs = [source_doc] + related_docs
        topics = {}
        
        for doc in all_docs:
            # Extract potential topic words from title
            words = re.findall(r'\b\w+\b', doc.title)
            for word in words:
                word = word.lower()
                if len(word) > 3:  # Skip short words
                    if word not in topics:
                        topics[word] = []
                    topics[word].append(doc.id)
        
        # Filter to topics that appear in multiple documents
        for topic, doc_ids in topics.items():
            if len(doc_ids) > 1:
                analysis["topic_clusters"].append({
                    "topic": topic,
                    "document_ids": doc_ids,
                    "document_count": len(doc_ids)
                })
        
        return analysis
    
    async def _perform_basic_consolidation(self, source_doc: Document,
                                        related_docs: List[Document],
                                        relationship_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform basic consolidation operations.
        
        Args:
            source_doc: Source document
            related_docs: Related documents
            relationship_analysis: Relationship analysis
            
        Returns:
            Consolidation result
        """
        result = {
            "actions_taken": [],
            "updated_documents": []
        }
        
        # 1. Add cross-references where missing
        for doc in [source_doc] + related_docs:
            existing_references = [
                rel["target_id"] 
                for rel in await self.knowledge_graph.get_document_relationships(doc.id)
                if rel["relationship_type"] == "references"
            ]
            
            # Check if we need to add references
            references_added = False
            
            for other_doc in [source_doc] + related_docs:
                if doc.id != other_doc.id and other_doc.id not in existing_references:
                    # Check if they're related
                    similarity = self._compute_content_similarity(
                        doc.content, other_doc.content
                    )
                    
                    if similarity > 0.3:  # Threshold for adding references
                        # Add relationship
                        await self.knowledge_graph.add_relationship({
                            "source_id": doc.id,
                            "target_id": other_doc.id,
                            "relationship_type": "references",
                            "properties": {
                                "automatically_added": True,
                                "similarity": similarity,
                                "added_by": self.agent_id
                            }
                        })
                        
                        references_added = True
            
            if references_added:
                result["actions_taken"].append({
                    "action": "added_cross_references",
                    "document_id": doc.id
                })
                result["updated_documents"].append(doc.id)
        
        # 2. Update document metadata with relationship information
        for doc in [source_doc] + related_docs:
            # Get existing metadata
            doc_data = await self.knowledge_graph.get_document(doc.id)
            metadata = doc_data.get("metadata", {})
            
            # Update with relationship information
            if "related_documents" not in metadata:
                metadata["related_documents"] = []
                
            # Get relationships
            relationships = await self.knowledge_graph.get_document_relationships(doc.id)
            
            # Add to metadata
            for rel in relationships:
                if rel["target_id"] not in [d["id"] for d in metadata["related_documents"]]:
                    metadata["related_documents"].append({
                        "id": rel["target_id"],
                        "relationship_type": rel["relationship_type"]
                    })
            
            # Add topic clusters
            if "topics" not in metadata:
                metadata["topics"] = []
                
            for cluster in relationship_analysis.get("topic_clusters", []):
                if doc.id in cluster["document_ids"]:
                    topic = cluster["topic"]
                    if topic not in metadata["topics"]:
                        metadata["topics"].append(topic)
            
            # Update document
            if doc_data.get("metadata") != metadata:
                doc_data["metadata"] = metadata
                await self.knowledge_graph.update_document(doc.id, doc_data)
                
                result["actions_taken"].append({
                    "action": "updated_metadata",
                    "document_id": doc.id
                })
                
                if doc.id not in result["updated_documents"]:
                    result["updated_documents"].append(doc.id)
        
        return result
    
    def _get_agent_for_task(self, task_type: str) -> Optional[str]:
        """
        Determine which agent should handle a task.
        
        Args:
            task_type: Type of task
            
        Returns:
            Agent ID or None if no suitable agent
        """
        # Default agent mappings
        agent_mappings = {
            "merge_documents": self.agent_id,  # Handle it ourselves
            "consolidate_sections": self.content_agent_id,
            "add_cross_references": self.content_agent_id,
            "create_documentation_hub": self.content_agent_id,
            "review": self.default_review_agent_id
        }
        
        # Override with config if provided
        if "agent_mappings" in self.config:
            agent_mappings.update(self.config["agent_mappings"])
            
        return agent_mappings.get(task_type)