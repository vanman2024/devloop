# Document Validation and Quality Check System

This document outlines the validation and quality check system for the Agentic Documentation Management System, following principles from both Google's A2A architecture and OpenAI's agent design.

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Document Validation Agent                          │
└───────────┬──────────────┬──────────────┬───────────────────────────┘
            │              │              │                   
            ▼              ▼              ▼                   
┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  Technical    │  │ Completeness  │  │ Consistency   │  │   Readability │
│  Validation   │  │ Validation    │  │ Validation    │  │   Validation  │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │                  │
        └──────────────────┼──────────────────┼──────────────────┘
                           │                  │
                           ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Knowledge Graph                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Design Principles

The document validation system adheres to these key principles from OpenAI and Google A2A architectures:

1. **Modular Specialized Agents**: Following OpenAI's Manager Pattern, specialized validation agents handle specific types of validation
2. **Tool-Augmented Validation**: Each agent uses specific tools to enhance its validation capabilities
3. **Well-Defined Communication Protocol**: Using Google's A2A principles for standardized message formats
4. **Reasoning-First Approach**: Validation agents explain their reasoning and provide actionable feedback
5. **Tool-Enhanced Capabilities**: Specialized tools for different validation aspects

## Core Components

### 1. Validation Manager Agent

The Validation Manager coordinates specialized validation agents and consolidates results, following OpenAI's Manager Pattern:

```python
from agents import Agent, function_tool, Runner

class ValidationManagerAgent:
    def __init__(self, knowledge_graph, document_store):
        self.kg = knowledge_graph
        self.document_store = document_store
        
        # Initialize specialized validation agents
        self.technical_validator = TechnicalValidationAgent(knowledge_graph)
        self.completeness_validator = CompletenessValidationAgent(knowledge_graph)
        self.consistency_validator = ConsistencyValidationAgent(knowledge_graph)
        self.readability_validator = ReadabilityValidationAgent()
        
        # Create function tools wrapping specialized agents
        @function_tool
        async def validate_technical_accuracy(document_id: str, content: str) -> dict:
            """
            Validate the technical accuracy of a document
            
            Args:
                document_id: ID of the document to validate
                content: Document content
                
            Returns:
                Validation results with issues and recommendations
            """
            return await self.technical_validator.validate(document_id, content)
        
        @function_tool
        async def validate_completeness(document_id: str, content: str) -> dict:
            """
            Validate the completeness of a document
            
            Args:
                document_id: ID of the document to validate
                content: Document content
                
            Returns:
                Validation results with missing sections and recommendations
            """
            return await self.completeness_validator.validate(document_id, content)
        
        @function_tool
        async def validate_consistency(document_id: str, content: str) -> dict:
            """
            Validate the consistency of a document with other documents
            
            Args:
                document_id: ID of the document to validate
                content: Document content
                
            Returns:
                Validation results with inconsistencies and recommendations
            """
            return await self.consistency_validator.validate(document_id, content)
        
        @function_tool
        async def validate_readability(content: str) -> dict:
            """
            Validate the readability of a document
            
            Args:
                content: Document content
                
            Returns:
                Readability metrics and recommendations
            """
            return await self.readability_validator.validate(content)
        
        @function_tool
        async def store_validation_results(document_id: str, results: dict) -> bool:
            """
            Store validation results in the knowledge graph
            
            Args:
                document_id: ID of the document
                results: Validation results
                
            Returns:
                Success status
            """
            await self.kg.storeDocumentValidation(document_id, results)
            return True
        
        # Create the manager agent
        self.agent = Agent(
            name="ValidationManagerAgent",
            instructions="""
            You are a document validation manager. Your job is to:
            1. Coordinate the validation of documents for technical accuracy, completeness, consistency, and readability
            2. Analyze the results from specialized validation agents
            3. Prioritize issues based on severity 
            4. Provide a consolidated validation report
            
            Follow these steps for each document:
            1. Run all validations in parallel
            2. Assess the overall quality based on validation results
            3. Identify critical issues that must be addressed
            4. Provide an executive summary of the document quality
            5. Store the validation results
            """,
            tools=[
                validate_technical_accuracy,
                validate_completeness,
                validate_consistency,
                validate_readability,
                store_validation_results
            ]
        )
    
    async def validate_document(self, document_id):
        """Validate a document using the manager agent"""
        # Get document content
        document = await self.document_store.get_document(document_id)
        
        if not document or not document.get("content"):
            return {
                "status": "error",
                "message": "Document not found or empty"
            }
        
        # Create message for the agent
        message = {
            "role": "user",
            "content": f"""
            Please validate this document:
            
            Document ID: {document_id}
            Title: {document.get("title", "Untitled")}
            
            Run all validation checks and provide a consolidated report.
            """
        }
        
        # Execute the validation workflow
        result = await Runner.run(
            self.agent,
            [message],
            additional_context={
                "document_id": document_id, 
                "document_content": document["content"]
            }
        )
        
        # Process the result to extract validation summary
        validation_summary = self._extract_validation_summary(result)
        
        return {
            "document_id": document_id,
            "validation_summary": validation_summary,
            "status": "completed"
        }
    
    def _extract_validation_summary(self, result):
        """Extract validation summary from the agent's response"""
        # Find the final summary message from the agent
        for message in reversed(result.new_messages):
            if message.role == "assistant" and "Executive Summary" in message.content:
                # Extract key parts from the message
                import re
                
                # Extract overall quality score
                quality_match = re.search(r'Overall Quality: (\d+\.?\d*)/10', message.content)
                quality_score = float(quality_match.group(1)) if quality_match else None
                
                # Extract critical issues count
                critical_match = re.search(r'Critical Issues: (\d+)', message.content)
                critical_issues = int(critical_match.group(1)) if critical_match else 0
                
                # Extract priority recommendations section
                recommendations_match = re.search(r'Priority Recommendations:(.*?)(?:\n\n|$)', message.content, re.DOTALL)
                recommendations = recommendations_match.group(1).strip() if recommendations_match else ""
                
                return {
                    "quality_score": quality_score,
                    "critical_issues": critical_issues,
                    "priority_recommendations": recommendations,
                    "full_report": message.content
                }
        
        return None
```

### 2. Technical Validation Agent

This specialized agent ensures technical accuracy by checking code, API references, and technical concepts:

```python
class TechnicalValidationAgent:
    def __init__(self, knowledge_graph, llm_service=None):
        self.kg = knowledge_graph
        self.llm = llm_service or LLMService()
        
        # Initialize required tools
        self.code_validator = CodeSnippetValidator()
        self.api_validator = APIReferenceValidator(knowledge_graph)
        self.fact_checker = TechnicalFactChecker(knowledge_graph)
    
    async def validate(self, document_id, content):
        """Validate technical accuracy of document content"""
        # Extract document metadata and related projects/features
        metadata = await self.kg.getDocumentMetadata(document_id)
        related_features = await self.kg.getRelatedFeatures(document_id)
        
        # Extract code snippets for validation
        code_snippets = await self._extract_code_snippets(content)
        
        # Extract API references for validation
        api_references = await self._extract_api_references(content)
        
        # Extract technical assertions for fact checking
        technical_assertions = await self._extract_technical_assertions(content)
        
        # Run validations in parallel
        import asyncio
        
        validation_tasks = [
            self.code_validator.validate_snippets(code_snippets),
            self.api_validator.validate_references(api_references, related_features),
            self.fact_checker.check_assertions(technical_assertions)
        ]
        
        code_results, api_results, fact_results = await asyncio.gather(*validation_tasks)
        
        # Generate a GPT-4 assessment if we found issues
        llm_assessment = None
        total_issues = len(code_results["issues"]) + len(api_results["issues"]) + len(fact_results["issues"])
        
        if total_issues > 0:
            llm_assessment = await self._get_llm_assessment(
                content, 
                code_results["issues"], 
                api_results["issues"], 
                fact_results["issues"]
            )
        
        # Assemble results
        validation_result = {
            "technical_validation": {
                "document_id": document_id,
                "validated_at": datetime.now().isoformat(),
                "code_validation": code_results,
                "api_validation": api_results,
                "fact_validation": fact_results,
                "llm_assessment": llm_assessment,
                "total_issues": total_issues,
                "score": self._calculate_technical_score(
                    code_results, api_results, fact_results
                )
            }
        }
        
        return validation_result
    
    async def _extract_code_snippets(self, content):
        """Extract code snippets from document content using regex patterns"""
        import re
        
        # Find markdown code blocks
        markdown_pattern = r'```([a-zA-Z0-9]+)?\n(.*?)\n```'
        markdown_matches = re.finditer(markdown_pattern, content, re.DOTALL)
        
        code_snippets = []
        for match in markdown_matches:
            language = match.group(1) or "text"
            code = match.group(2)
            code_snippets.append({
                "language": language,
                "code": code,
                "start_pos": match.start(),
                "end_pos": match.end()
            })
        
        # Also look for inline code
        inline_pattern = r'`(.*?)`'
        inline_matches = re.finditer(inline_pattern, content)
        
        for match in inline_matches:
            code = match.group(1)
            # Only include if it looks like code (contains symbols)
            if re.search(r'[;=(){}\[\]<>]', code):
                code_snippets.append({
                    "language": "unknown",
                    "code": code,
                    "start_pos": match.start(),
                    "end_pos": match.end(),
                    "is_inline": True
                })
        
        return code_snippets
    
    async def _extract_api_references(self, content):
        """Extract API references using LLM"""
        prompt = f"""
        Extract all API references from this document. Include:
        - Function/method names
        - Class names 
        - Parameter names and types
        - Return value descriptions
        - Endpoint URLs
        
        Format your response as a JSON array of objects, each containing:
        - type: "function", "class", "parameter", "endpoint", etc.
        - name: the referenced name
        - context: the sentence or paragraph containing the reference
        - line_number_approx: your best guess at the line number
        
        Here's the document:
        {content[:10000]}  # Using first 10000 chars for analysis
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            api_references = json.loads(response)
            return api_references
        except Exception as e:
            print(f"Error parsing API references: {e}")
            return []
    
    async def _extract_technical_assertions(self, content):
        """Extract technical assertions that should be fact-checked"""
        prompt = f"""
        Identify technical assertions from this document that should be fact-checked.
        Focus on statements about:
        - Performance characteristics
        - Compatibility claims
        - Version requirements
        - Technical capabilities
        - Architectural descriptions
        - Security properties
        
        Format your response as a JSON array of objects, each containing:
        - assertion: the technical claim being made
        - context: the surrounding text
        - confidence: how confident you are this is a factual claim (0-1)
        - type: the type of assertion (performance, compatibility, etc.)
        
        Document:
        {content[:10000]}  # Using first 10000 chars for analysis
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            assertions = json.loads(response)
            
            # Filter to only high-confidence assertions
            filtered = [a for a in assertions if a.get("confidence", 0) > 0.7]
            
            return filtered
        except Exception as e:
            print(f"Error parsing technical assertions: {e}")
            return []
    
    async def _get_llm_assessment(self, content, code_issues, api_issues, fact_issues):
        """Get LLM assessment of technical issues"""
        prompt = f"""
        Assess the technical accuracy of this document given these identified issues:
        
        CODE ISSUES:
        {json.dumps(code_issues, indent=2)}
        
        API REFERENCE ISSUES:
        {json.dumps(api_issues, indent=2)}
        
        FACTUAL ISSUES:
        {json.dumps(fact_issues, indent=2)}
        
        Document content preview:
        {content[:5000]}...
        
        Provide your assessment as a JSON object with:
        - overallAssessment: your overall assessment of technical accuracy
        - severity: a score from 0-10 where 10 is the most severe issues
        - criticalIssues: list of the most critical issues that must be fixed
        - recommendedFixes: specific suggestions to address the issues
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            return json.loads(response)
        except Exception as e:
            print(f"Error parsing LLM assessment: {e}")
            return {
                "overallAssessment": "Assessment parsing failed",
                "severity": 5,
                "criticalIssues": [],
                "recommendedFixes": []
            }
    
    def _calculate_technical_score(self, code_results, api_results, fact_results):
        """Calculate technical score based on validation results"""
        # Start with perfect score
        score = 10.0
        
        # Reduce score based on code issues (more weight for errors than warnings)
        code_deduction = len(code_results["issues"]) * 0.5
        for issue in code_results["issues"]:
            if issue.get("severity") == "error":
                code_deduction += 0.5
        
        # Reduce score based on API reference issues
        api_deduction = len(api_results["issues"]) * 0.3
        
        # Reduce score based on factual issues (weighted by confidence)
        fact_deduction = 0
        for issue in fact_results["issues"]:
            confidence = issue.get("confidence", 0.5)
            fact_deduction += 0.4 * confidence
        
        # Apply deductions (minimum score is 1.0)
        score = max(1.0, score - code_deduction - api_deduction - fact_deduction)
        
        return round(score, 1)
```

### 3. Consistency Validation Agent

This agent verifies that a document is consistent with other documents in the system:

```python
class ConsistencyValidationAgent:
    def __init__(self, knowledge_graph, vector_store, llm_service=None):
        self.kg = knowledge_graph
        self.vector_store = vector_store
        self.llm = llm_service or LLMService()
    
    async def validate(self, document_id, content):
        """Validate document consistency with other documents"""
        # Get document metadata
        metadata = await self.kg.getDocumentMetadata(document_id)
        
        # Find related documents
        related_docs = await self._find_related_documents(document_id, content)
        
        # Extract key concepts and definitions
        document_concepts = await self._extract_concepts_and_definitions(content)
        
        # Check for consistency issues
        consistency_issues = []
        
        for related_doc in related_docs:
            # Get related document content
            related_content = await self.kg.getDocumentContent(related_doc["id"])
            
            # Extract concepts and definitions from related document
            related_concepts = await self._extract_concepts_and_definitions(related_content)
            
            # Compare concepts and find inconsistencies
            for concept, definition in document_concepts.items():
                if concept in related_concepts:
                    related_def = related_concepts[concept]
                    
                    # Check if definitions are inconsistent
                    is_inconsistent = await self._are_definitions_inconsistent(
                        definition, related_def
                    )
                    
                    if is_inconsistent:
                        consistency_issues.append({
                            "type": "conflicting_definition",
                            "concept": concept,
                            "current_definition": definition,
                            "conflicting_definition": related_def,
                            "conflicting_document": {
                                "id": related_doc["id"],
                                "title": related_doc.get("title", "Untitled")
                            }
                        })
            
            # Check for conflicting information using LLM
            conflicts = await self._detect_conflicts(content, related_content)
            
            for conflict in conflicts:
                consistency_issues.append({
                    "type": "conflicting_information",
                    "description": conflict["description"],
                    "current_text": conflict["current_text"],
                    "conflicting_text": conflict["conflicting_text"],
                    "conflicting_document": {
                        "id": related_doc["id"],
                        "title": related_doc.get("title", "Untitled")
                    }
                })
        
        # Calculate consistency score
        consistency_score = self._calculate_consistency_score(consistency_issues)
        
        # Get recommendations for resolving issues
        recommendations = await self._generate_recommendations(consistency_issues)
        
        return {
            "consistency_validation": {
                "document_id": document_id,
                "validated_at": datetime.now().isoformat(),
                "related_documents": [doc["id"] for doc in related_docs],
                "issues": consistency_issues,
                "score": consistency_score,
                "recommendations": recommendations
            }
        }
    
    async def _find_related_documents(self, document_id, content):
        """Find documents related to the current document"""
        # Get document embedding
        embedding = await self.vector_store.get_document_embedding(content)
        
        # Search for similar documents
        similar_docs = await self.vector_store.search(
            embedding,
            limit=5,
            exclude_ids=[document_id]
        )
        
        # Get documents that reference the current document
        referencing_docs = await self.kg.findDocumentsReferencing(document_id)
        
        # Get documents referenced by the current document
        referenced_docs = await self.kg.findDocumentsReferencedBy(document_id)
        
        # Combine and deduplicate results
        all_docs = similar_docs + referencing_docs + referenced_docs
        unique_docs = {doc["id"]: doc for doc in all_docs}
        
        return list(unique_docs.values())
    
    async def _extract_concepts_and_definitions(self, content):
        """Extract concepts and their definitions from document content"""
        prompt = f"""
        Extract key concepts and their definitions from this document.
        Focus on technical terms, architecture components, APIs, and other important concepts.
        
        Format your response as a JSON object where keys are concept names and values are their definitions.
        Include only concepts that have clear definitions in the text.
        
        Document:
        {content[:10000]}  # Using first 10000 chars
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            concepts = json.loads(response)
            return concepts
        except Exception as e:
            print(f"Error parsing concepts: {e}")
            return {}
    
    async def _are_definitions_inconsistent(self, def1, def2):
        """Determine if two definitions are inconsistent"""
        # Trivial case: identical definitions
        if def1 == def2:
            return False
        
        # Use LLM to assess semantic inconsistency
        prompt = f"""
        Determine if these two definitions of the same concept are inconsistent with each other.
        Definitions can be different but compatible (e.g., one is more detailed), or they can be inconsistent (contradicting each other).
        
        Definition 1: "{def1}"
        
        Definition 2: "{def2}"
        
        Are these definitions inconsistent with each other? Answer YES or NO, followed by a brief explanation.
        """
        
        response = await self.llm.complete(prompt)
        
        return response.strip().upper().startswith("YES")
    
    async def _detect_conflicts(self, content1, content2):
        """Detect conflicting information between two documents"""
        # Create summaries of documents
        summary1 = await self._summarize_document(content1)
        summary2 = await self._summarize_document(content2)
        
        # Use LLM to find conflicts
        prompt = f"""
        Identify conflicts between these two documents. Focus on:
        - Technical requirements or specifications
        - Process descriptions
        - API behavior
        - Component functionality
        - Architectural descriptions
        
        Document 1 summary:
        {summary1}
        
        Document 2 summary:
        {summary2}
        
        For each conflict, provide:
        - A description of the conflict
        - The relevant text from Document 1
        - The relevant text from Document 2
        
        Format your response as a JSON array of conflict objects.
        If there are no conflicts, return an empty array.
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            conflicts = json.loads(response)
            return conflicts
        except Exception as e:
            print(f"Error parsing conflicts: {e}")
            return []
    
    async def _summarize_document(self, content):
        """Create a concise summary of document focusing on technical details"""
        prompt = f"""
        Summarize this document, focusing on technical details, specifications, and processes.
        Keep the summary under 500 words.
        
        Document:
        {content[:10000]}  # Using first 10000 chars
        """
        
        return await self.llm.complete(prompt)
    
    def _calculate_consistency_score(self, issues):
        """Calculate consistency score based on issues"""
        # Start with perfect score
        score = 10.0
        
        # Deduct points based on issues
        if issues:
            # Base deduction per issue
            score -= len(issues) * 0.5
            
            # Additional deduction for conflicting definitions (more serious)
            definition_conflicts = sum(1 for issue in issues if issue["type"] == "conflicting_definition")
            score -= definition_conflicts * 0.5
        
        # Ensure score is between 1-10
        return max(1.0, min(10.0, score))
    
    async def _generate_recommendations(self, issues):
        """Generate recommendations for resolving consistency issues"""
        if not issues:
            return []
        
        # Use LLM to generate recommendations
        prompt = f"""
        Generate recommendations for resolving these document consistency issues:
        
        {json.dumps(issues, indent=2)}
        
        For each issue, provide:
        1. A recommended approach to resolve the inconsistency
        2. Specific text changes if applicable
        
        Format your response as a JSON array of recommendation objects.
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            recommendations = json.loads(response)
            return recommendations
        except Exception as e:
            print(f"Error parsing recommendations: {e}")
            return []
```

### 4. Completeness Validation Agent

This agent evaluates whether a document is complete and covers all necessary topics:

```python
class CompletenessValidationAgent:
    def __init__(self, knowledge_graph, llm_service=None):
        self.kg = knowledge_graph
        self.llm = llm_service or LLMService()
    
    async def validate(self, document_id, content):
        """Validate document completeness"""
        # Get document metadata and type
        metadata = await self.kg.getDocumentMetadata(document_id)
        doc_type = metadata.get("type", "unknown")
        
        # Get document structure
        structure = await self._extract_document_structure(content)
        
        # Get expected sections based on document type
        expected_sections = await self._get_expected_sections(doc_type, metadata)
        
        # Compare actual vs expected sections
        missing_sections = []
        for expected in expected_sections:
            if not any(s["title"].lower() == expected["title"].lower() for s in structure["sections"]):
                missing_sections.append(expected)
        
        # Check for missing content types
        missing_content = await self._identify_missing_content(content, doc_type)
        
        # Check for incomplete sections
        incomplete_sections = await self._identify_incomplete_sections(structure["sections"], content)
        
        # Calculate completeness score
        completeness_score = self._calculate_completeness_score(
            structure, 
            missing_sections, 
            missing_content, 
            incomplete_sections
        )
        
        # Get recommendations for improving completeness
        recommendations = await self._generate_recommendations(
            doc_type,
            missing_sections,
            missing_content,
            incomplete_sections
        )
        
        return {
            "completeness_validation": {
                "document_id": document_id,
                "document_type": doc_type,
                "validated_at": datetime.now().isoformat(),
                "structure": structure,
                "missing_sections": missing_sections,
                "missing_content": missing_content,
                "incomplete_sections": incomplete_sections,
                "score": completeness_score,
                "recommendations": recommendations
            }
        }
    
    async def _extract_document_structure(self, content):
        """Extract document structure with sections and subsections"""
        import re
        
        # Find markdown headings
        heading_pattern = r'^(#{1,6})\s+(.+)$'
        headings = re.finditer(heading_pattern, content, re.MULTILINE)
        
        sections = []
        for match in headings:
            level = len(match.group(1))
            title = match.group(2).strip()
            position = match.start()
            
            sections.append({
                "title": title,
                "level": level,
                "position": position
            })
        
        # Calculate section lengths
        for i, section in enumerate(sections):
            if i < len(sections) - 1:
                section["length"] = sections[i+1]["position"] - section["position"]
            else:
                section["length"] = len(content) - section["position"]
        
        # Estimate word count for each section
        for section in sections:
            # Get section content
            start = section["position"]
            end = start + section["length"]
            section_content = content[start:end]
            
            # Count words
            section["word_count"] = len(section_content.split())
        
        # Organize into hierarchy
        hierarchy = []
        stack = []
        
        for section in sections:
            # Pop items from stack until we find a parent (lower level number)
            while stack and stack[-1]["level"] >= section["level"]:
                stack.pop()
            
            # Add parent reference if there's a parent
            if stack:
                parent = stack[-1]
                if "children" not in parent:
                    parent["children"] = []
                parent["children"].append(section)
            else:
                hierarchy.append(section)
            
            # Push current section to stack
            stack.append(section)
        
        return {
            "sections": sections,
            "hierarchy": hierarchy,
            "total_sections": len(sections)
        }
    
    async def _get_expected_sections(self, doc_type, metadata):
        """Get expected sections based on document type"""
        # Check if we have a template for this document type
        template = await self.kg.getDocumentTemplate(doc_type)
        
        if template and "expected_sections" in template:
            return template["expected_sections"]
        
        # Otherwise, use LLM to suggest expected sections
        prompt = f"""
        What sections would you expect in a complete {doc_type} document?
        
        Additional context:
        - Document title: {metadata.get('title', 'Untitled')}
        - Document tags: {', '.join(metadata.get('tags', []))}
        - Related features: {', '.join(metadata.get('related_features', []))}
        
        For each expected section, provide:
        - title: The section title
        - description: What content should be in this section
        - importance: How important is this section (required, recommended, optional)
        
        Format your response as a JSON array of section objects.
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            return json.loads(response)
        except Exception as e:
            print(f"Error parsing expected sections: {e}")
            return []
    
    async def _identify_missing_content(self, content, doc_type):
        """Identify types of content that are missing based on document type"""
        # Define content type detectors
        content_type_patterns = {
            "code_examples": r'```[a-z]*\n.*?\n```',
            "images": r'!\[.*?\]\(.*?\)',
            "tables": r'\|.*\|.*\|',
            "links": r'\[.*?\]\(.*?\)',
            "api_endpoints": r'`(GET|POST|PUT|DELETE|PATCH)\s+/[a-zA-Z0-9/{}]+`',
            "command_examples": r'`\$\s+.*?`'
        }
        
        # Check for each content type
        missing_content = []
        
        for content_type, pattern in content_type_patterns.items():
            import re
            if not re.search(pattern, content, re.DOTALL):
                # Check if this content type is expected for this document type
                is_expected = await self._is_content_type_expected(content_type, doc_type)
                
                if is_expected:
                    missing_content.append({
                        "type": content_type,
                        "expected_for_doc_type": True,
                        "importance": is_expected["importance"],
                        "description": is_expected["description"]
                    })
        
        return missing_content
    
    async def _is_content_type_expected(self, content_type, doc_type):
        """Determine if a content type is expected for a document type"""
        # Get content type expectations from knowledge graph
        expectations = await self.kg.getContentTypeExpectations(doc_type)
        
        if expectations and content_type in expectations:
            return expectations[content_type]
        
        # Use LLM to determine if content type is expected
        prompt = f"""
        Would you expect a {doc_type} document to include {content_type}?
        
        Answer with a JSON object containing:
        - expected: true/false
        - importance: "required", "recommended", or "optional"
        - description: brief explanation of why this content type is or isn't expected
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            result = json.loads(response)
            
            if result.get("expected", False):
                return {
                    "importance": result.get("importance", "optional"),
                    "description": result.get("description", "")
                }
            else:
                return None
        except Exception as e:
            print(f"Error determining content type expectations: {e}")
            return None
    
    async def _identify_incomplete_sections(self, sections, content):
        """Identify sections that appear incomplete"""
        incomplete_sections = []
        
        for section in sections:
            # Skip very short sections (headings only)
            if section["word_count"] < 10:
                # Get section content
                start = section["position"]
                end = start + section["length"]
                section_text = content[start:end]
                
                incomplete_sections.append({
                    "title": section["title"],
                    "issue": "too_short",
                    "word_count": section["word_count"],
                    "content": section_text.strip()
                })
                continue
            
            # Get section content
            start = section["position"]
            end = start + section["length"]
            section_text = content[start:end]
            
            # Look for "TODO" markers
            import re
            todo_match = re.search(r'TODO|FIXME|XXX|TBD', section_text, re.IGNORECASE)
            if todo_match:
                incomplete_sections.append({
                    "title": section["title"],
                    "issue": "contains_todo",
                    "position": start + todo_match.start(),
                    "todo_text": todo_match.group(0)
                })
            
            # Check for trailing questions or incomplete sentences
            last_lines = '\n'.join(section_text.split('\n')[-3:])
            if re.search(r'\?\s*$', last_lines) or re.search(r'[a-z],\s*$', last_lines):
                incomplete_sections.append({
                    "title": section["title"],
                    "issue": "incomplete_ending",
                    "ending": last_lines.strip()
                })
        
        return incomplete_sections
    
    def _calculate_completeness_score(self, structure, missing_sections, missing_content, incomplete_sections):
        """Calculate completeness score based on validation results"""
        # Start with perfect score
        score = 10.0
        
        # Deduct for missing required sections
        required_missing = [s for s in missing_sections if s.get("importance") == "required"]
        score -= len(required_missing) * 1.5
        
        # Deduct for missing recommended sections
        recommended_missing = [s for s in missing_sections if s.get("importance") == "recommended"]
        score -= len(recommended_missing) * 0.75
        
        # Deduct for missing required content types
        required_content_missing = [c for c in missing_content if c.get("importance") == "required"]
        score -= len(required_content_missing) * 1.0
        
        # Deduct for incomplete sections
        score -= len(incomplete_sections) * 0.5
        
        # Ensure score is between 1-10
        return max(1.0, min(10.0, score))
    
    async def _generate_recommendations(self, doc_type, missing_sections, missing_content, incomplete_sections):
        """Generate recommendations for improving completeness"""
        # Use LLM to generate recommendations
        prompt = f"""
        Generate recommendations for improving the completeness of a {doc_type} document with these issues:
        
        Missing Sections:
        {json.dumps(missing_sections, indent=2)}
        
        Missing Content Types:
        {json.dumps(missing_content, indent=2)}
        
        Incomplete Sections:
        {json.dumps(incomplete_sections, indent=2)}
        
        For each issue, provide:
        1. A recommended approach to address it
        2. Example content where appropriate
        
        Format your response as a JSON array of recommendation objects.
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            recommendations = json.loads(response)
            return recommendations
        except Exception as e:
            print(f"Error parsing recommendations: {e}")
            return []
```

### 5. Readability Validation Agent

This agent assesses document readability and clarity:

```python
class ReadabilityValidationAgent:
    def __init__(self, llm_service=None):
        self.llm = llm_service or LLMService()
    
    async def validate(self, content):
        """Validate document readability"""
        # Calculate readability metrics
        metrics = self._calculate_readability_metrics(content)
        
        # Identify readability issues
        issues = await self._identify_readability_issues(content)
        
        # Get LLM assessment
        llm_assessment = await self._get_llm_assessment(content)
        
        # Calculate overall readability score
        readability_score = self._calculate_readability_score(metrics, issues, llm_assessment)
        
        # Get recommendations for improving readability
        recommendations = await self._generate_recommendations(issues, llm_assessment)
        
        return {
            "readability_validation": {
                "validated_at": datetime.now().isoformat(),
                "metrics": metrics,
                "issues": issues,
                "llm_assessment": llm_assessment,
                "score": readability_score,
                "recommendations": recommendations
            }
        }
    
    def _calculate_readability_metrics(self, content):
        """Calculate readability metrics"""
        import re
        
        # Count words
        words = re.findall(r'\b\w+\b', content)
        word_count = len(words)
        
        # Count sentences
        sentences = re.split(r'[.!?]+', content)
        sentence_count = len([s for s in sentences if s.strip()])
        
        # Count paragraphs
        paragraphs = re.split(r'\n\s*\n', content)
        paragraph_count = len([p for p in paragraphs if p.strip()])
        
        # Calculate average word length
        avg_word_length = sum(len(word) for word in words) / word_count if word_count > 0 else 0
        
        # Calculate average sentence length
        avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
        
        # Calculate average paragraph length
        avg_paragraph_length = word_count / paragraph_count if paragraph_count > 0 else 0
        
        # Calculate Flesch Reading Ease
        # Formula: 206.835 - (1.015 * ASL) - (84.6 * ASW)
        # ASL = average sentence length (words)
        # ASW = average word length (syllables)
        # We'll approximate syllables as word length / 3
        flesch_reading_ease = 206.835 - (1.015 * avg_sentence_length) - (84.6 * (avg_word_length / 3))
        
        # Interpret Flesch Reading Ease
        if flesch_reading_ease >= 90:
            reading_level = "Very Easy"
        elif flesch_reading_ease >= 80:
            reading_level = "Easy"
        elif flesch_reading_ease >= 70:
            reading_level = "Fairly Easy"
        elif flesch_reading_ease >= 60:
            reading_level = "Standard"
        elif flesch_reading_ease >= 50:
            reading_level = "Fairly Difficult"
        elif flesch_reading_ease >= 30:
            reading_level = "Difficult"
        else:
            reading_level = "Very Difficult"
        
        return {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "paragraph_count": paragraph_count,
            "avg_word_length": round(avg_word_length, 2),
            "avg_sentence_length": round(avg_sentence_length, 2),
            "avg_paragraph_length": round(avg_paragraph_length, 2),
            "flesch_reading_ease": round(flesch_reading_ease, 2),
            "reading_level": reading_level
        }
    
    async def _identify_readability_issues(self, content):
        """Identify common readability issues"""
        issues = []
        
        # Check for long sentences (>40 words)
        import re
        sentences = re.split(r'[.!?]+', content)
        for i, sentence in enumerate(sentences):
            if sentence.strip():
                words = re.findall(r'\b\w+\b', sentence)
                if len(words) > 40:
                    issues.append({
                        "type": "long_sentence",
                        "sentence": sentence.strip(),
                        "word_count": len(words),
                        "position": i
                    })
        
        # Check for jargon and complex terminology
        jargon = await self._identify_jargon(content)
        for term in jargon:
            issues.append({
                "type": "jargon",
                "term": term["term"],
                "context": term["context"],
                "suggestion": term.get("suggestion")
            })
        
        # Check for passive voice
        passive_voice = await self._identify_passive_voice(content)
        for instance in passive_voice:
            issues.append({
                "type": "passive_voice",
                "sentence": instance["sentence"],
                "suggestion": instance.get("suggestion")
            })
        
        return issues
    
    async def _identify_jargon(self, content):
        """Identify jargon and complex terminology"""
        # Use LLM to identify jargon
        prompt = f"""
        Identify technical jargon or unnecessarily complex terminology in this text.
        Focus on terms that could be simplified for better readability.
        
        For each term, provide:
        - term: The complex term or phrase
        - context: The sentence containing the term
        - suggestion: A simpler alternative
        
        Format your response as a JSON array of term objects.
        
        Text:
        {content[:5000]}  # Using first 5000 chars
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            jargon = json.loads(response)
            return jargon
        except Exception as e:
            print(f"Error parsing jargon: {e}")
            return []
    
    async def _identify_passive_voice(self, content):
        """Identify instances of passive voice"""
        # Use LLM to identify passive voice
        prompt = f"""
        Identify instances of passive voice in this text.
        For each instance, provide:
        - sentence: The sentence containing passive voice
        - suggestion: A revised version using active voice
        
        Format your response as a JSON array of passive voice objects.
        
        Text:
        {content[:5000]}  # Using first 5000 chars
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            passive_voice = json.loads(response)
            return passive_voice
        except Exception as e:
            print(f"Error parsing passive voice: {e}")
            return []
    
    async def _get_llm_assessment(self, content):
        """Get LLM assessment of document readability"""
        prompt = f"""
        Assess the readability and clarity of this text. Consider:
        - Clarity of explanation
        - Use of examples
        - Structure and organization
        - Appropriate detail level
        - Target audience appropriateness
        
        Provide your assessment as a JSON object with:
        - overallAssessment: your overall assessment of readability
        - strengths: list of readability strengths
        - weaknesses: list of readability weaknesses
        - audienceAppropriate: whether the content seems appropriate for its likely audience
        - clarityScore: a score from 1-10 where 10 is extremely clear
        
        Text:
        {content[:5000]}  # Using first 5000 chars
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            return json.loads(response)
        except Exception as e:
            print(f"Error parsing LLM assessment: {e}")
            return {
                "overallAssessment": "Assessment parsing failed",
                "strengths": [],
                "weaknesses": [],
                "audienceAppropriate": None,
                "clarityScore": 5
            }
    
    def _calculate_readability_score(self, metrics, issues, llm_assessment):
        """Calculate overall readability score"""
        # Start with LLM clarity score (1-10 scale)
        score = llm_assessment.get("clarityScore", 5)
        
        # Adjust based on Flesch Reading Ease
        flesch_score = metrics["flesch_reading_ease"]
        
        # Optimal technical documentation is around 50-60 on Flesch scale
        # Reduce score if too complex or too simple
        if flesch_score < 30:  # Very difficult
            score -= 1.5
        elif flesch_score < 40:  # Difficult
            score -= 0.5
        elif flesch_score > 80:  # Too simple for technical docs
            score -= 0.5
        
        # Deduct for readability issues
        long_sentences = sum(1 for issue in issues if issue["type"] == "long_sentence")
        score -= min(2, long_sentences * 0.2)  # Cap at 2 point deduction
        
        jargon_terms = sum(1 for issue in issues if issue["type"] == "jargon")
        score -= min(1.5, jargon_terms * 0.15)  # Cap at 1.5 point deduction
        
        passive_voice_instances = sum(1 for issue in issues if issue["type"] == "passive_voice")
        score -= min(1, passive_voice_instances * 0.1)  # Cap at 1 point deduction
        
        # Ensure score is between 1-10
        return max(1.0, min(10.0, score))
    
    async def _generate_recommendations(self, issues, llm_assessment):
        """Generate recommendations for improving readability"""
        # Prepare issues context
        issues_summary = {
            "long_sentences": sum(1 for issue in issues if issue["type"] == "long_sentence"),
            "jargon_terms": sum(1 for issue in issues if issue["type"] == "jargon"),
            "passive_voice": sum(1 for issue in issues if issue["type"] == "passive_voice")
        }
        
        # Use LLM to generate recommendations
        prompt = f"""
        Generate recommendations for improving the readability of a document with these characteristics:
        
        Issues summary:
        {json.dumps(issues_summary, indent=2)}
        
        LLM assessment:
        {json.dumps(llm_assessment, indent=2)}
        
        Provide specific, actionable recommendations focusing on:
        1. Addressing the identified issues
        2. Building on the document's strengths
        3. Improving overall clarity and readability
        
        Format your response as a JSON array of recommendation objects, each with:
        - category: the category of recommendation (structure, language, clarity, etc.)
        - recommendation: the specific recommendation
        - priority: high, medium, or low
        - example: an example of applying this recommendation (if applicable)
        """
        
        response = await self.llm.complete(prompt)
        
        try:
            import json
            recommendations = json.loads(response)
            return recommendations
        except Exception as e:
            print(f"Error parsing recommendations: {e}")
            return []
```

## Integration with Knowledge Graph

The validation system integrates with the knowledge graph to store validation results and track document quality over time:

```javascript
class ValidationGraphIntegration {
  constructor(knowledgeGraph) {
    this.kg = knowledgeGraph;
  }
  
  async storeValidationResults(documentId, results) {
    // Create validation node
    const validationId = `validation-${Date.now()}`;
    
    await this.kg.createNode(
      validationId,
      "Validation",
      {
        documentId,
        technicalScore: results.technical_validation?.score,
        completenessScore: results.completeness_validation?.score,
        consistencyScore: results.consistency_validation?.score,
        readabilityScore: results.readability_validation?.score,
        overallScore: this._calculateOverallScore(results),
        validatedAt: new Date().toISOString(),
        hasCriticalIssues: this._hasCriticalIssues(results)
      }
    );
    
    // Connect validation to document
    await this.kg.createRelationship(
      "validation", validationId,
      "document", documentId,
      "VALIDATES",
      {
        createdAt: new Date().toISOString()
      }
    );
    
    // Create issue nodes for each validation issue
    await this._createIssueNodes(validationId, results);
    
    // Create recommendation nodes
    await this._createRecommendationNodes(validationId, results);
    
    // Update document metadata with validation scores
    await this.kg.updateNode(
      documentId,
      {
        latestValidationId: validationId,
        technicalAccuracy: results.technical_validation?.score,
        completeness: results.completeness_validation?.score,
        consistency: results.consistency_validation?.score,
        readability: results.readability_validation?.score,
        qualityScore: this._calculateOverallScore(results),
        lastValidated: new Date().toISOString(),
        needsRevision: this._needsRevision(results)
      }
    );
    
    return validationId;
  }
  
  async _createIssueNodes(validationId, results) {
    // Technical issues
    if (results.technical_validation?.code_validation?.issues) {
      for (const issue of results.technical_validation.code_validation.issues) {
        await this._createIssueNode(validationId, "technical", "code", issue);
      }
    }
    
    if (results.technical_validation?.api_validation?.issues) {
      for (const issue of results.technical_validation.api_validation.issues) {
        await this._createIssueNode(validationId, "technical", "api", issue);
      }
    }
    
    // Consistency issues
    if (results.consistency_validation?.issues) {
      for (const issue of results.consistency_validation.issues) {
        await this._createIssueNode(validationId, "consistency", issue.type, issue);
      }
    }
    
    // Completeness issues
    if (results.completeness_validation?.missing_sections) {
      for (const issue of results.completeness_validation.missing_sections) {
        await this._createIssueNode(validationId, "completeness", "missing_section", issue);
      }
    }
    
    if (results.completeness_validation?.incomplete_sections) {
      for (const issue of results.completeness_validation.incomplete_sections) {
        await this._createIssueNode(validationId, "completeness", "incomplete_section", issue);
      }
    }
    
    // Readability issues
    if (results.readability_validation?.issues) {
      for (const issue of results.readability_validation.issues) {
        await this._createIssueNode(validationId, "readability", issue.type, issue);
      }
    }
  }
  
  async _createIssueNode(validationId, category, type, issue) {
    const issueId = `issue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    await this.kg.createNode(
      issueId,
      "ValidationIssue",
      {
        category,
        type,
        details: JSON.stringify(issue),
        severity: this._calculateIssueSeverity(category, type, issue),
        createdAt: new Date().toISOString()
      }
    );
    
    // Connect issue to validation
    await this.kg.createRelationship(
      "validation", validationId,
      "issue", issueId,
      "HAS_ISSUE",
      {
        createdAt: new Date().toISOString()
      }
    );
    
    return issueId;
  }
  
  async _createRecommendationNodes(validationId, results) {
    // Technical recommendations
    if (results.technical_validation?.llm_assessment?.recommendedFixes) {
      for (const rec of results.technical_validation.llm_assessment.recommendedFixes) {
        await this._createRecommendationNode(validationId, "technical", rec);
      }
    }
    
    // Consistency recommendations
    if (results.consistency_validation?.recommendations) {
      for (const rec of results.consistency_validation.recommendations) {
        await this._createRecommendationNode(validationId, "consistency", rec);
      }
    }
    
    // Completeness recommendations
    if (results.completeness_validation?.recommendations) {
      for (const rec of results.completeness_validation.recommendations) {
        await this._createRecommendationNode(validationId, "completeness", rec);
      }
    }
    
    // Readability recommendations
    if (results.readability_validation?.recommendations) {
      for (const rec of results.readability_validation.recommendations) {
        await this._createRecommendationNode(validationId, "readability", rec);
      }
    }
  }
  
  async _createRecommendationNode(validationId, category, recommendation) {
    const recId = `recommendation-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    await this.kg.createNode(
      recId,
      "ValidationRecommendation",
      {
        category,
        details: JSON.stringify(recommendation),
        priority: recommendation.priority || "medium",
        createdAt: new Date().toISOString()
      }
    );
    
    // Connect recommendation to validation
    await this.kg.createRelationship(
      "validation", validationId,
      "recommendation", recId,
      "HAS_RECOMMENDATION",
      {
        createdAt: new Date().toISOString()
      }
    );
    
    return recId;
  }
  
  _calculateOverallScore(results) {
    // Calculate weighted average of scores
    const scores = [
      { score: results.technical_validation?.score, weight: 0.35 },
      { score: results.completeness_validation?.score, weight: 0.25 },
      { score: results.consistency_validation?.score, weight: 0.25 },
      { score: results.readability_validation?.score, weight: 0.15 }
    ];
    
    // Filter out undefined scores
    const validScores = scores.filter(s => s.score !== undefined);
    
    if (validScores.length === 0) {
      return null;
    }
    
    // Normalize weights
    const totalWeight = validScores.reduce((sum, s) => sum + s.weight, 0);
    const normalizedScores = validScores.map(s => ({
      score: s.score,
      weight: s.weight / totalWeight
    }));
    
    // Calculate weighted average
    const overallScore = normalizedScores.reduce(
      (sum, s) => sum + s.score * s.weight, 
      0
    );
    
    return Math.round(overallScore * 10) / 10;  // Round to 1 decimal place
  }
  
  _calculateIssueSeverity(category, type, issue) {
    // Default medium severity
    let severity = "medium";
    
    // Technical issues severity rules
    if (category === "technical") {
      if (type === "code" && issue.severity === "error") {
        severity = "high";
      } else if (type === "api" && issue.severity === "critical") {
        severity = "high";
      }
    }
    
    // Consistency issues severity rules
    if (category === "consistency" && type === "conflicting_definition") {
      severity = "high";
    }
    
    // Completeness issues severity rules
    if (category === "completeness" && type === "missing_section") {
      if (issue.importance === "required") {
        severity = "high";
      } else if (issue.importance === "optional") {
        severity = "low";
      }
    }
    
    return severity;
  }
  
  _hasCriticalIssues(results) {
    // Check for critical technical issues
    if (results.technical_validation?.llm_assessment?.severity >= 8) {
      return true;
    }
    
    // Check for critical consistency issues
    if (results.consistency_validation?.issues) {
      const criticalConsistencyIssues = results.consistency_validation.issues.filter(
        issue => issue.type === "conflicting_definition"
      );
      if (criticalConsistencyIssues.length > 0) {
        return true;
      }
    }
    
    // Check for critical completeness issues
    if (results.completeness_validation?.missing_sections) {
      const criticalMissingSections = results.completeness_validation.missing_sections.filter(
        section => section.importance === "required"
      );
      if (criticalMissingSections.length > 0) {
        return true;
      }
    }
    
    return false;
  }
  
  _needsRevision(results) {
    // Document needs revision if it has critical issues
    if (this._hasCriticalIssues(results)) {
      return true;
    }
    
    // Document needs revision if overall score is below threshold
    const overallScore = this._calculateOverallScore(results);
    if (overallScore !== null && overallScore < 6.0) {
      return true;
    }
    
    // Document needs revision if any individual score is very low
    if (
      (results.technical_validation?.score !== undefined && results.technical_validation.score < 5.0) ||
      (results.completeness_validation?.score !== undefined && results.completeness_validation.score < 5.0) ||
      (results.consistency_validation?.score !== undefined && results.consistency_validation.score < 5.0)
    ) {
      return true;
    }
    
    return false;
  }
}
```

## Validation Workflow Integration

The following integration adds document validation to the document processing pipeline:

```python
class DocumentValidationWorkflow:
    def __init__(self, validation_manager, document_store, knowledge_graph, event_bus):
        self.validation_manager = validation_manager
        self.document_store = document_store
        self.kg = knowledge_graph
        self.event_bus = event_bus
        
        # Register for document events
        self.event_bus.subscribe("document.created", self.handle_document_created)
        self.event_bus.subscribe("document.updated", self.handle_document_updated)
        self.event_bus.subscribe("validation.requested", self.handle_validation_requested)
    
    async def handle_document_created(self, event):
        """Handle document created event"""
        document_id = event["document_id"]
        
        # Check if automatic validation is enabled
        metadata = await self.kg.getDocumentMetadata(document_id)
        auto_validate = metadata.get("auto_validate", True)
        
        if auto_validate:
            # Schedule validation (with delay to allow processing to complete)
            await self.schedule_validation(document_id, delay_seconds=5)
    
    async def handle_document_updated(self, event):
        """Handle document updated event"""
        document_id = event["document_id"]
        
        # Check if automatic validation is enabled
        metadata = await self.kg.getDocumentMetadata(document_id)
        auto_validate = metadata.get("auto_validate", True)
        
        if auto_validate:
            # Schedule validation (with delay to allow processing to complete)
            await self.schedule_validation(document_id, delay_seconds=5)
    
    async def handle_validation_requested(self, event):
        """Handle explicit validation request"""
        document_id = event["document_id"]
        
        # Process validation immediately
        await self.validate_document(document_id)
    
    async def schedule_validation(self, document_id, delay_seconds=0):
        """Schedule document validation with optional delay"""
        if delay_seconds > 0:
            import asyncio
            await asyncio.sleep(delay_seconds)
        
        await self.validate_document(document_id)
    
    async def validate_document(self, document_id):
        """Validate a document and store the results"""
        try:
            # Publish validation started event
            await self.event_bus.publish("validation.started", {
                "document_id": document_id,
                "timestamp": datetime.now().isoformat()
            })
            
            # Run validation
            validation_result = await self.validation_manager.validate_document(document_id)
            
            # Store validation results
            validation_id = await self.kg.storeDocumentValidation(
                document_id, 
                validation_result
            )
            
            # Check if document needs human review
            needs_review = self._needs_human_review(validation_result)
            
            if needs_review:
                await self.request_human_review(document_id, validation_result)
            
            # Publish validation completed event
            await self.event_bus.publish("validation.completed", {
                "document_id": document_id,
                "validation_id": validation_id,
                "needs_review": needs_review,
                "quality_score": validation_result.get("quality_score"),
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "document_id": document_id,
                "validation_id": validation_id,
                "status": "completed"
            }
            
        except Exception as e:
            # Publish validation failed event
            await self.event_bus.publish("validation.failed", {
                "document_id": document_id,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
            
            return {
                "document_id": document_id,
                "status": "failed",
                "error": str(e)
            }
    
    def _needs_human_review(self, validation_result):
        """Determine if document needs human review based on validation results"""
        # Check for critical issues
        if validation_result.get("critical_issues", 0) > 0:
            return True
        
        # Check for low quality score
        quality_score = validation_result.get("quality_score")
        if quality_score is not None and quality_score < 6.0:
            return True
        
        return False
    
    async def request_human_review(self, document_id, validation_result):
        """Request human review for a document"""
        # Create review request in knowledge graph
        review_id = f"review-{document_id}-{datetime.now().isoformat()}"
        
        await self.kg.createReviewRequest(
            review_id,
            document_id,
            {
                "reason": "validation_issues",
                "validation_result": validation_result,
                "requested_at": datetime.now().isoformat(),
                "status": "pending"
            }
        )
        
        # Publish review requested event
        await self.event_bus.publish("document.review.requested", {
            "document_id": document_id,
            "review_id": review_id,
            "reason": "validation_issues",
            "quality_score": validation_result.get("quality_score"),
            "timestamp": datetime.now().isoformat()
        })
        
        return review_id
```

## Continuous Documentation Quality Monitoring

The system monitors document quality over time and identifies trends:

```javascript
class DocumentQualityMonitor {
  constructor(knowledgeGraph, eventBus) {
    this.kg = knowledgeGraph;
    this.eventBus = eventBus;
    
    // Register for validation events
    this.eventBus.subscribe("validation.completed", this.handleValidationCompleted.bind(this));
  }
  
  async handleValidationCompleted(event) {
    // Update quality metrics after validation
    await this.updateQualityMetrics();
  }
  
  async updateQualityMetrics() {
    // Get recent validations
    const recentValidations = await this.kg.getRecentValidations(50);
    
    // Calculate average scores
    const metrics = this._calculateMetrics(recentValidations);
    
    // Store metrics in knowledge graph
    await this.kg.storeQualityMetrics(metrics);
    
    // Check for concerning trends
    const concerns = this._identifyConcerns(metrics, recentValidations);
    
    if (concerns.length > 0) {
      // Publish concerns event
      await this.eventBus.publish("documentation.quality.concerns", {
        metrics,
        concerns,
        timestamp: new Date().toISOString()
      });
    }
    
    return metrics;
  }
  
  _calculateMetrics(validations) {
    // Calculate average scores
    const scores = {
      overall: [],
      technical: [],
      completeness: [],
      consistency: [],
      readability: []
    };
    
    for (const validation of validations) {
      if (validation.overallScore !== null) scores.overall.push(validation.overallScore);
      if (validation.technicalScore !== null) scores.technical.push(validation.technicalScore);
      if (validation.completenessScore !== null) scores.completeness.push(validation.completenessScore);
      if (validation.consistencyScore !== null) scores.consistency.push(validation.consistencyScore);
      if (validation.readabilityScore !== null) scores.readability.push(validation.readabilityScore);
    }
    
    // Calculate metrics
    const calculateMetrics = (values) => {
      if (values.length === 0) return null;
      
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = sum / values.length;
      
      // Sort for percentiles
      const sorted = [...values].sort((a, b) => a - b);
      const p25 = sorted[Math.floor(sorted.length * 0.25)];
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p75 = sorted[Math.floor(sorted.length * 0.75)];
      
      return {
        count: values.length,
        avg: Number(avg.toFixed(2)),
        min: Math.min(...values),
        max: Math.max(...values),
        p25: Number(p25.toFixed(2)),
        p50: Number(p50.toFixed(2)),
        p75: Number(p75.toFixed(2))
      };
    };
    
    // Compile metrics
    return {
      timestamp: new Date().toISOString(),
      overall: calculateMetrics(scores.overall),
      technical: calculateMetrics(scores.technical),
      completeness: calculateMetrics(scores.completeness),
      consistency: calculateMetrics(scores.consistency),
      readability: calculateMetrics(scores.readability),
      criticalIssueCount: validations.filter(v => v.hasCriticalIssues).length,
      needsRevisionCount: validations.filter(v => v.needsRevision).length,
      totalValidations: validations.length
    };
  }
  
  _identifyConcerns(metrics, recentValidations) {
    const concerns = [];
    
    // Check for low average scores
    if (metrics.overall && metrics.overall.avg < 6.5) {
      concerns.push({
        type: "low_overall_score",
        message: "Overall documentation quality score is below target",
        details: { 
          current: metrics.overall.avg,
          target: 6.5
        }
      });
    }
    
    // Check for high number of documents needing revision
    const revisionPercentage = (metrics.needsRevisionCount / metrics.totalValidations) * 100;
    if (revisionPercentage > 25) {
      concerns.push({
        type: "high_revision_rate",
        message: "High percentage of documents need revision",
        details: {
          percentage: Number(revisionPercentage.toFixed(1)),
          count: metrics.needsRevisionCount,
          threshold: 25
        }
      });
    }
    
    // Check for critical issues
    if (metrics.criticalIssueCount > 5) {
      concerns.push({
        type: "critical_issues",
        message: "Multiple documents have critical issues",
        details: {
          count: metrics.criticalIssueCount,
          threshold: 5
        }
      });
    }
    
    // Check for declining trends
    // This would require historical metrics to compare against
    
    return concerns;
  }
  
  async generateQualityReport() {
    // Get quality metrics
    const metrics = await this.kg.getQualityMetrics();
    
    // Get validation history
    const history = await this.kg.getValidationHistory();
    
    // Get documents needing revision
    const needsRevision = await this.kg.getDocumentsNeedingRevision();
    
    // Get documents with critical issues
    const criticalIssues = await this.kg.getDocumentsWithCriticalIssues();
    
    // Return comprehensive report
    return {
      timestamp: new Date().toISOString(),
      metrics,
      history,
      needsRevision,
      criticalIssues,
      recommendations: await this._generateRecommendations(
        metrics, needsRevision, criticalIssues
      )
    };
  }
  
  async _generateRecommendations(metrics, needsRevision, criticalIssues) {
    // Identify common issues
    const commonIssues = await this._identifyCommonIssues(needsRevision);
    
    // Generate recommendations based on issues
    const recommendations = [];
    
    // Recommend addressing critical issues first
    if (criticalIssues.length > 0) {
      recommendations.push({
        priority: "high",
        category: "critical_issues",
        recommendation: "Address documents with critical issues",
        details: `${criticalIssues.length} documents have critical issues that need immediate attention.`,
        documents: criticalIssues.map(doc => ({ id: doc.id, title: doc.title }))
      });
    }
    
    // Recommend addressing common issues
    for (const issue of commonIssues) {
      recommendations.push({
        priority: issue.count > 5 ? "high" : "medium",
        category: issue.category,
        recommendation: `Address common ${issue.category} issues`,
        details: `${issue.count} documents have issues with ${issue.description}`,
        examples: issue.examples
      });
    }
    
    // Recommend improving specific aspects based on metrics
    if (metrics.technical && metrics.technical.avg < 7) {
      recommendations.push({
        priority: "medium",
        category: "technical_accuracy",
        recommendation: "Improve technical accuracy across documentation",
        details: "Technical accuracy scores are below target (7.0)",
        current: metrics.technical.avg
      });
    }
    
    // Add more recommendations based on other metrics...
    
    return recommendations;
  }
  
  async _identifyCommonIssues(documentsNeedingRevision) {
    // Get validation issues for these documents
    const allIssues = [];
    
    for (const doc of documentsNeedingRevision) {
      const issues = await this.kg.getDocumentValidationIssues(doc.id);
      allIssues.push(...issues);
    }
    
    // Group issues by type
    const issueGroups = {};
    
    for (const issue of allIssues) {
      const key = `${issue.category}:${issue.type}`;
      
      if (!issueGroups[key]) {
        issueGroups[key] = {
          category: issue.category,
          type: issue.type,
          count: 0,
          examples: []
        };
      }
      
      issueGroups[key].count++;
      
      // Store a few examples
      if (issueGroups[key].examples.length < 3) {
        issueGroups[key].examples.push({
          documentId: issue.documentId,
          details: issue.details
        });
      }
    }
    
    // Sort by frequency
    const commonIssues = Object.values(issueGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);  // Top 5 issues
    
    // Add descriptions
    const issueDescriptions = {
      "technical:code": "code snippets",
      "technical:api": "API references",
      "consistency:conflicting_definition": "conflicting definitions",
      "completeness:missing_section": "missing sections",
      "readability:long_sentence": "overly long sentences",
      "readability:jargon": "excessive jargon"
      // Add more as needed
    };
    
    for (const issue of commonIssues) {
      const key = `${issue.category}:${issue.type}`;
      issue.description = issueDescriptions[key] || `${issue.type} issues`;
    }
    
    return commonIssues;
  }
}
```

## GraphQL API for Validation

Access validation results through a GraphQL API:

```graphql
type ValidationResult {
  id: ID!
  documentId: ID!
  technicalScore: Float
  completenessScore: Float
  consistencyScore: Float
  readabilityScore: Float
  overallScore: Float!
  validatedAt: DateTime!
  hasCriticalIssues: Boolean!
  needsRevision: Boolean!
  issues: [ValidationIssue!]
  recommendations: [ValidationRecommendation!]
}

type ValidationIssue {
  id: ID!
  validationId: ID!
  category: String!
  type: String!
  severity: String!
  details: JSONObject!
  createdAt: DateTime!
}

type ValidationRecommendation {
  id: ID!
  validationId: ID!
  category: String!
  details: JSONObject!
  priority: String!
  createdAt: DateTime!
}

extend type Document {
  latestValidation: ValidationResult
  validationHistory: [ValidationResult!]
  technicalAccuracy: Float
  completeness: Float
  consistency: Float
  readability: Float
  qualityScore: Float
  lastValidated: DateTime
  needsRevision: Boolean
}

extend type Query {
  # Validation queries
  getDocumentValidation(documentId: ID!): ValidationResult
  getValidationResult(validationId: ID!): ValidationResult
  getDocumentsNeedingRevision(limit: Int = 10): [Document!]
  getDocumentsWithCriticalIssues(limit: Int = 10): [Document!]
  
  # Quality metrics
  getDocumentationQualityMetrics: JSONObject!
  getDocumentationQualityReport: JSONObject!
  getDocumentationQualityTrends(days: Int = 30): JSONObject!
}

extend type Mutation {
  # Validation operations
  requestDocumentValidation(documentId: ID!): Boolean!
  acknowledgeValidationIssue(issueId: ID!): Boolean!
  markDocumentAsReviewed(documentId: ID!, notes: String): Boolean!
}
```

## Conclusion

The Document Validation and Quality Check System provides comprehensive assessment of documentation quality using specialized agents for different validation aspects. The system:

1. **Ensures Technical Accuracy**: Verifies code snippets, API references, and technical claims
2. **Validates Completeness**: Checks for missing sections and incomplete content
3. **Maintains Consistency**: Identifies contradictions between documents
4. **Improves Readability**: Enhances clarity and user experience

By following Google's A2A architecture and OpenAI's Manager Pattern, the system creates a robust agent coordination framework where specialized validators work under the direction of a validation manager. The system integrates with the knowledge graph to track quality metrics over time and highlights areas for improvement.

The validation workflow seamlessly integrates with the document processing pipeline, enabling automatic validation of new and updated documents, while providing a structured approach to addressing quality issues. This ensures that documentation remains accurate, complete, consistent, and readable throughout the system.