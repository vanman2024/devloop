/**
 * Document Generation Server
 * 
 * This server provides document generation capabilities for the DevLoop system.
 * It uses AI to generate comprehensive documentation content based on templates.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3002;

// Configure middleware
app.use(cors());
app.use(bodyParser.json());

// Simple logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/api/documents/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'document-generation-server',
    timestamp: new Date().toISOString()
  });
});

// Document generation endpoint
app.post('/api/documents/generate', async (req, res) => {
  try {
    const { title, description, docType, docPurpose, components } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields. Title is required.' 
      });
    }
    
    console.log(`Generating document: ${title} (${docType}/${docPurpose})`);
    
    // Generate document content based on type and purpose
    const content = generateDocumentContent(title, description, docType, docPurpose, components);
    
    // Return the generated content
    res.json({
      success: true,
      content,
      metadata: {
        title,
        description,
        docType,
        docPurpose,
        components,
        wordCount: content.split(/\s+/).length,
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error generating document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Document generation failed', 
      message: error.message 
    });
  }
});

// Document analysis endpoint
app.post('/api/documents/analyze', async (req, res) => {
  try {
    const { title, description, content } = req.body;
    
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields. Title is required.' 
      });
    }
    
    console.log(`Analyzing document: ${title}`);
    
    // Analyze document and suggest metadata
    const analysis = analyzeDocument(title, description, content);
    
    // Return the analysis results
    res.json({
      success: true,
      analysis,
      suggestedPath: generateFilePath(title, analysis.contentType),
      suggestedCategories: generateCategories(analysis.contentType, analysis.contentPurpose, analysis.technicalLevel),
      suggestedComponents: analysis.relevantSystems || ['Core System'],
      suggestedTags: generateTags(title + ' ' + description, analysis.contentType, analysis.contentPurpose, analysis.relevantSystems || [])
    });
  } catch (error) {
    console.error('Error analyzing document:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Document analysis failed', 
      message: error.message 
    });
  }
});

// Document quality analysis endpoint
app.post('/api/documents/quality', async (req, res) => {
  try {
    const { id, content } = req.body;
    
    if (!id || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields. ID and content are required.' 
      });
    }
    
    console.log(`Analyzing document quality: ${id}`);
    
    // Analyze document quality
    const quality = analyzeDocumentQuality(content);
    
    // Return the quality analysis
    res.json({
      success: true,
      documentId: id,
      analysis: quality
    });
  } catch (error) {
    console.error('Error analyzing document quality:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Document quality analysis failed', 
      message: error.message 
    });
  }
});

// Document chat endpoint
app.post('/api/documents/chat', async (req, res) => {
  try {
    const { message, documentContext } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields. Message is required.' 
      });
    }
    
    console.log(`Processing chat message: ${message}`);
    
    // Generate AI response based on document context
    const response = generateDocumentChatResponse(message, documentContext);
    
    // Return the AI response
    res.json({
      success: true,
      message: response,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Chat processing failed', 
      message: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Document Generation Server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/documents/health`);
});

// ===== Document Generation Functions =====

/**
 * Generate document content based on type and purpose
 */
function generateDocumentContent(title, description = '', docType = 'general', docPurpose = 'general', components = []) {
  // Get document template based on type and purpose
  const template = getDocumentTemplate(docType, docPurpose);
  
  // Replace template variables
  let content = template
    .replace(/\$\{TITLE\}/g, title)
    .replace(/\$\{DESCRIPTION\}/g, description || 'No description provided.')
    .replace(/\$\{DATE\}/g, new Date().toISOString().split('T')[0])
    .replace(/\$\{COMPONENTS\}/g, components && components.length ? components.join(', ') : 'General');
  
  // Add component-specific sections if applicable
  if (components && components.length > 0) {
    let componentSections = '';
    
    components.forEach(component => {
      componentSections += `\n\n## ${component} Integration\n\n`;
      componentSections += `This section describes how to integrate with the ${component} component.\n\n`;
      
      // Add sample integration code based on component
      if (component.toLowerCase().includes('api')) {
        componentSections += "```javascript\n// Example API integration\nconst response = await fetch('/api/endpoint');\nconst data = await response.json();\nconsole.log(data);\n```\n";
      } else if (component.toLowerCase().includes('ui')) {
        componentSections += "```jsx\n// Example UI component integration\nimport { Component } from './components';\n\nfunction MyComponent() {\n  return <Component prop=\"value\" />;\n}\n```\n";
      } else {
        componentSections += "```javascript\n// Example integration code\nimport { integrate } from './" + component.toLowerCase().replace(/\s+/g, '-') + "';\n\nintegrate(config);\n```\n";
      }
    });
    
    content += componentSections;
  }
  
  return content;
}

/**
 * Get document template based on type and purpose
 */
function getDocumentTemplate(docType, docPurpose) {
  // Default template
  let template = `# \${TITLE}

> Last Updated: \${DATE}

\${DESCRIPTION}

## Overview

This document provides information about \${TITLE}.

## Purpose

This documentation aims to help users understand how to work with this system component.

## Components

This document relates to the following components: \${COMPONENTS}

## Getting Started

To get started, follow these steps...

`;

  // Custom templates based on type
  if (docType === 'architecture') {
    template = `# \${TITLE} Architecture

> Last Updated: \${DATE}

\${DESCRIPTION}

## Overview

This document outlines the architecture for \${TITLE}.

## System Components

The system consists of the following components:
- Component 1
- Component 2
- Component 3

## Component Relationships

```mermaid
graph TD;
    A[Component 1] --> B[Component 2];
    A --> C[Component 3];
    B --> D[Component 4];
    C --> D;
```

## Data Flow

This section describes how data flows through the system.

## Technology Stack

- Frontend: React, TailwindCSS
- Backend: Node.js, Express
- Database: MongoDB
- Deployment: Docker, Kubernetes

## Security Considerations

This section outlines key security considerations.

## Performance Considerations

This section covers performance optimizations.

## Related Components

This architecture relates to: \${COMPONENTS}
`;
  } else if (docType === 'api') {
    template = `# \${TITLE} API Reference

> Last Updated: \${DATE}

\${DESCRIPTION}

## Authentication

All API requests require authentication using a JWT token.

## Endpoints

### GET /api/resource

Retrieves a list of resources.

#### Parameters

| Name | Type | Description |
|------|------|-------------|
| limit | number | Maximum number of items to return |
| offset | number | Number of items to skip |

#### Response

\`\`\`json
{
  "success": true,
  "data": [
    {
      "id": "123",
      "name": "Example Resource",
      "created_at": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
\`\`\`

### POST /api/resource

Creates a new resource.

#### Request Body

\`\`\`json
{
  "name": "New Resource",
  "description": "Description of the resource"
}
\`\`\`

#### Response

\`\`\`json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "New Resource",
    "description": "Description of the resource",
    "created_at": "2023-01-01T00:00:00Z"
  }
}
\`\`\`

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

## Related Components

This API relates to: \${COMPONENTS}
`;
  } else if (docType === 'guide') {
    template = `# \${TITLE} Guide

> Last Updated: \${DATE}

\${DESCRIPTION}

## Introduction

This guide will walk you through how to use \${TITLE}.

## Prerequisites

Before you begin, ensure you have:
- Requirement 1
- Requirement 2
- Requirement 3

## Step 1: Getting Started

First, you'll need to...

## Step 2: Configuration

Configure the system by...

## Step 3: Implementation

Implement the functionality by...

## Common Issues

This section covers common issues and their solutions.

### Issue 1: Problem Description

To solve this issue, try the following steps...

### Issue 2: Another Problem

This issue can be resolved by...

## Best Practices

- Best practice 1
- Best practice 2
- Best practice 3

## Related Components

This guide relates to: \${COMPONENTS}
`;
  }

  // Custom templates based on purpose
  if (docPurpose === 'learning') {
    template += `
## Learning Resources

- Resource 1
- Resource 2
- Resource 3

## Exercises

### Exercise 1

Try implementing...

### Exercise 2

Create a new...
`;
  } else if (docPurpose === 'troubleshooting') {
    template += `
## Troubleshooting

### Common Issues

#### Issue 1: Description

**Symptoms:**
- Symptom 1
- Symptom 2

**Causes:**
- Cause 1
- Cause 2

**Solutions:**
1. Step 1
2. Step 2
3. Step 3

#### Issue 2: Description

**Symptoms:**
- Symptom 1
- Symptom 2

**Causes:**
- Cause 1
- Cause 2

**Solutions:**
1. Step 1
2. Step 2
3. Step 3

### Logging

Enable detailed logging by...

### Diagnostic Tools

The following tools can help diagnose issues:
- Tool 1
- Tool 2
- Tool 3
`;
  }

  return template;
}

/**
 * Analyze document and suggest metadata
 */
function analyzeDocument(title, description, content) {
  const combinedText = `${title} ${description} ${content || ''}`.toLowerCase();
  
  // Determine content type
  let contentType = 'general';
  if (combinedText.includes('architecture') || combinedText.includes('design') || combinedText.includes('structure')) {
    contentType = 'architecture';
  } else if (combinedText.includes('api') || combinedText.includes('endpoint') || combinedText.includes('interface')) {
    contentType = 'api';
  } else if (combinedText.includes('guide') || combinedText.includes('tutorial') || combinedText.includes('how to')) {
    contentType = 'guide';
  } else if (combinedText.includes('workflow') || combinedText.includes('process')) {
    contentType = 'workflow';
  } else if (combinedText.includes('reference') || combinedText.includes('documentation')) {
    contentType = 'reference';
  }
  
  // Determine content purpose
  let contentPurpose = 'general';
  if (combinedText.includes('learn') || combinedText.includes('tutorial') || combinedText.includes('introduction')) {
    contentPurpose = 'learning';
  } else if (combinedText.includes('implement') || combinedText.includes('build') || combinedText.includes('create')) {
    contentPurpose = 'implementation';
  } else if (combinedText.includes('troubleshoot') || combinedText.includes('debug') || combinedText.includes('fix')) {
    contentPurpose = 'troubleshooting';
  } else if (combinedText.includes('plan') || combinedText.includes('roadmap') || combinedText.includes('future')) {
    contentPurpose = 'planning';
  } else if (combinedText.includes('best practice') || combinedText.includes('recommendation')) {
    contentPurpose = 'best-practices';
  }
  
  // Determine technical level
  let technicalLevel = 'beginner';
  if (combinedText.includes('advanced') || combinedText.includes('complex') || combinedText.includes('expert')) {
    technicalLevel = 'advanced';
  } else if (combinedText.includes('intermediate') || combinedText.includes('experienced')) {
    technicalLevel = 'intermediate';
  }
  
  // Determine relevant systems
  const relevantSystems = [];
  if (combinedText.includes('ui') || combinedText.includes('frontend') || combinedText.includes('interface')) {
    relevantSystems.push('UI System');
  }
  if (combinedText.includes('api') || combinedText.includes('backend') || combinedText.includes('server')) {
    relevantSystems.push('API System');
  }
  if (combinedText.includes('database') || combinedText.includes('data') || combinedText.includes('storage')) {
    relevantSystems.push('Data Storage');
  }
  if (combinedText.includes('auth') || combinedText.includes('security') || combinedText.includes('permission')) {
    relevantSystems.push('Authentication System');
  }
  if (combinedText.includes('report') || combinedText.includes('analytics') || combinedText.includes('metrics')) {
    relevantSystems.push('Analytics System');
  }
  
  // Default to Core System if no relevant systems detected
  if (relevantSystems.length === 0) {
    relevantSystems.push('Core System');
  }
  
  return {
    contentType,
    contentPurpose,
    technicalLevel,
    relevantSystems
  };
}

/**
 * Generate appropriate file path for document
 */
function generateFilePath(title, contentType) {
  // Sanitize title for filename
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-');
  
  // Determine base directory based on content type
  let baseDir = '/docs';
  let filename = '';
  
  if (contentType === 'architecture') {
    baseDir = '/docs/architecture';
    filename = sanitizedTitle + '.md';
  } else if (contentType === 'api') {
    baseDir = '/docs/api';
    filename = sanitizedTitle + '.md';
  } else if (contentType === 'guide') {
    baseDir = '/docs/guides';
    filename = sanitizedTitle + '-guide.md';
  } else if (contentType === 'workflow') {
    baseDir = '/docs/workflows';
    filename = sanitizedTitle + '-workflow.md';
  } else if (contentType === 'reference') {
    baseDir = '/docs/reference';
    filename = 'REFERENCE_' + sanitizedTitle + '.md';
  } else {
    filename = sanitizedTitle + '.md';
  }
  
  return `${baseDir}/${filename}`;
}

/**
 * Generate appropriate categories based on content analysis
 */
function generateCategories(contentType, contentPurpose, technicalLevel) {
  const categories = [];
  
  // Primary category based on content type
  if (contentType === 'architecture') categories.push('Architecture');
  else if (contentType === 'guide') categories.push('Guide');
  else if (contentType === 'api') categories.push('API');
  else if (contentType === 'workflow') categories.push('Workflow');
  else if (contentType === 'reference') categories.push('Reference');
  else categories.push('Documentation');
  
  // Secondary category based on purpose
  if (contentPurpose === 'learning') categories.push('Learning');
  else if (contentPurpose === 'implementation') categories.push('Implementation');
  else if (contentPurpose === 'troubleshooting') categories.push('Troubleshooting');
  else if (contentPurpose === 'best-practices') categories.push('Best Practices');
  else if (contentPurpose === 'planning') categories.push('Planning');
  
  // Add technical level if not beginner
  if (technicalLevel === 'advanced') categories.push('Advanced');
  else if (technicalLevel === 'intermediate') categories.push('Intermediate');
  
  return categories;
}

/**
 * Generate relevant tags based on content
 */
function generateTags(text, contentType, contentPurpose, relevantSystems) {
  const tags = [];
  
  // Add tags based on content type and purpose
  tags.push(contentType);
  tags.push(contentPurpose);
  
  // Add system-related tags
  relevantSystems.forEach(system => {
    const systemTag = system.toLowerCase().replace(/\s+/g, '-');
    if (!tags.includes(systemTag)) {
      tags.push(systemTag);
    }
  });
  
  // Extract potential key terms
  const potentialTags = [
    'architecture', 'design', 'workflow', 'process', 'api', 
    'tutorial', 'guide', 'reference', 'system', 'core',
    'feature', 'ui', 'dashboard', 'testing', 'ai', 'integration',
    'development', 'production', 'deployment', 'setup', 'configuration',
    'security', 'performance', 'optimization', 'analysis', 'monitoring',
    'milestone', 'phase', 'module', 'component', 'roadmap'
  ];
  
  text = text.toLowerCase();
  potentialTags.forEach(tag => {
    if (text.includes(tag) && !tags.includes(tag)) {
      tags.push(tag);
    }
  });
  
  // Limit to a reasonable number of tags
  return tags.slice(0, 8);
}

/**
 * Analyze document quality
 */
function analyzeDocumentQuality(content) {
  // Count words
  const wordCount = content.split(/\s+/).length;
  
  // Count headings
  const headingCount = (content.match(/^#+\s+.+$/gm) || []).length;
  
  // Count code blocks
  const codeBlockCount = (content.match(/```[\s\S]*?```/g) || []).length;
  
  // Count lists
  const listItemCount = (content.match(/^[*-]\s+.+$/gm) || []).length;
  
  // Count links
  const linkCount = (content.match(/\[.+\]\(.+\)/g) || []).length;
  
  // Check for table of contents
  const hasTOC = content.includes('## Table of Contents') || content.includes('## Contents');
  
  // Check for introduction
  const hasIntroduction = content.includes('## Introduction') || content.includes('## Overview');
  
  // Calculate completeness score (0-10)
  let completenessScore = 5;
  if (wordCount > 1000) completenessScore += 1;
  if (wordCount > 2000) completenessScore += 1;
  if (headingCount > 5) completenessScore += 1;
  if (codeBlockCount > 0) completenessScore += 0.5;
  if (listItemCount > 5) completenessScore += 0.5;
  if (linkCount > 0) completenessScore += 0.5;
  if (hasTOC) completenessScore += 0.5;
  if (hasIntroduction) completenessScore += 1;
  
  // Ensure score is within range
  completenessScore = Math.min(10, Math.max(0, completenessScore));
  
  // Calculate clarity score (0-10)
  let clarityScore = 5;
  if (headingCount > 3) clarityScore += 1;
  if (headingCount / wordCount * 1000 > 2) clarityScore += 1; // Good heading density
  if (listItemCount > 3) clarityScore += 1;
  if (codeBlockCount > 0) clarityScore += 1;
  
  // Ensure score is within range
  clarityScore = Math.min(10, Math.max(0, clarityScore));
  
  // Calculate overall quality score
  const qualityScore = Math.round((completenessScore + clarityScore) / 2);
  
  // Generate insights
  const insights = [];
  
  if (wordCount < 500) {
    insights.push('Document is quite short. Consider adding more content for comprehensiveness.');
  }
  
  if (headingCount < 3) {
    insights.push('Document has few headings. Consider adding more structure with additional sections.');
  }
  
  if (!hasIntroduction) {
    insights.push('Document lacks a clear introduction or overview section.');
  }
  
  if (codeBlockCount === 0 && (content.includes('code') || content.includes('implementation'))) {
    insights.push('Document mentions code but lacks code examples. Consider adding relevant code blocks.');
  }
  
  if (listItemCount === 0) {
    insights.push('Document lacks lists. Lists can improve readability for steps, requirements, etc.');
  }
  
  if (linkCount === 0) {
    insights.push('Document lacks links to related resources. Consider adding references.');
  }
  
  if (!hasTOC && wordCount > 1000) {
    insights.push('Long document without a table of contents. Consider adding one for navigation.');
  }
  
  // If no issues found, add a positive insight
  if (insights.length === 0) {
    insights.push('Document appears well-structured and comprehensive.');
  }
  
  return {
    qualityScore,
    completeness: {
      score: completenessScore,
      wordCount,
      headingCount,
      codeBlockCount,
      listItemCount,
      linkCount,
      hasTOC,
      hasIntroduction
    },
    clarity: {
      score: clarityScore
    },
    insights
  };
}

/**
 * Generate document chat response
 */
function generateDocumentChatResponse(message, documentContext) {
  const lowerMessage = message.toLowerCase();
  
  // Generate response based on message and context
  if (lowerMessage.includes('example') || lowerMessage.includes('sample')) {
    return generateExampleResponse(documentContext);
  } else if (lowerMessage.includes('structure') || lowerMessage.includes('outline') || lowerMessage.includes('template')) {
    return generateStructureResponse(documentContext);
  } else if (lowerMessage.includes('best practice') || lowerMessage.includes('recommendation')) {
    return generateBestPracticesResponse(documentContext);
  } else if (lowerMessage.includes('help')) {
    return generateHelpResponse(documentContext);
  } else {
    return generateDefaultResponse(message, documentContext);
  }
}

/**
 * Generate example response for chat
 */
function generateExampleResponse(documentContext) {
  const { type, purpose } = documentContext;
  
  if (type === 'architecture') {
    return `Here's an example architecture document structure for your "${documentContext.title}" document:

# System Architecture

## Overview
Brief description of the system and its purpose.

## Components
- Component 1: [Description]
- Component 2: [Description]
- Component 3: [Description]

## Interactions
Describe how components interact with each other.

## Technical Details
### Database Schema
### API Endpoints
### Infrastructure

## Security Considerations

## Performance Considerations

Would you like me to expand on any particular section?`;
  } else if (type === 'api') {
    return `Here's an example API documentation structure for "${documentContext.title}":

# API Reference

## Authentication
How to authenticate with the API.

## Endpoints

### GET /resource
Retrieve a list of resources.

#### Parameters
| Name | Type | Description |
|------|------|-------------|
| param1 | string | Description |

#### Response
\`\`\`json
{
  "success": true,
  "data": []
}
\`\`\`

### POST /resource
Create a new resource.

Would you like me to provide more specific examples for your API?`;
  } else {
    return `Here's a general example structure for your "${documentContext.title}" document:

# Document Title

## Introduction
Brief introduction to the topic.

## Key Concepts
- Concept 1: [Description]
- Concept 2: [Description]

## How to Use
Step-by-step instructions.

## Examples
Practical examples of usage.

## Reference
Additional information and references.

Would you like me to provide more specific content for any of these sections?`;
  }
}

/**
 * Generate structure response for chat
 */
function generateStructureResponse(documentContext) {
  const { type, purpose } = documentContext;
  
  if (type === 'guide') {
    return `For your "${documentContext.title}" guide, I recommend this structure:

1. **Introduction**
   - What is this guide about?
   - Who is it for?
   - What will they learn?

2. **Prerequisites**
   - Required knowledge
   - Required tools/software
   - Setup instructions

3. **Step-by-Step Guide**
   - Step 1: [Detail]
   - Step 2: [Detail]
   - Step 3: [Detail]

4. **Examples**
   - Example 1: [Detail]
   - Example 2: [Detail]

5. **Troubleshooting**
   - Common issues and solutions

6. **Further Reading**
   - Related documentation
   - External resources

This structure works well for ${purpose} purposes, as it provides clear progression from basics to advanced topics.`;
  } else if (type === 'reference') {
    return `For your "${documentContext.title}" reference, I recommend this structure:

1. **Overview**
   - Purpose of this reference
   - How to use this document

2. **Quick Reference**
   - Key information in table/list format
   - Common patterns or formulas

3. **Detailed Reference**
   - Item 1: [Detail]
   - Item 2: [Detail]
   - Item 3: [Detail]

4. **Examples**
   - Example 1: [Detail]
   - Example 2: [Detail]

5. **Appendix**
   - Additional information
   - Related resources

This structure is effective for reference documentation as it provides both quick-access information and comprehensive details.`;
  } else {
    return `For your "${documentContext.title}" document, here's a recommended structure:

1. **Introduction**
   - Purpose of the document
   - Intended audience
   - Document scope

2. **Background**
   - Context and history
   - Problem statement
   - Current situation

3. **Main Content**
   - Section 1: [Detail]
   - Section 2: [Detail]
   - Section 3: [Detail]

4. **Implementation/Usage**
   - How to apply this information
   - Steps or procedures

5. **Conclusion/Summary**
   - Key takeaways
   - Next steps

6. **References**
   - Related documents
   - External resources

Would you like me to suggest specific content for any of these sections based on your topic?`;
  }
}

/**
 * Generate best practices response for chat
 */
function generateBestPracticesResponse(documentContext) {
  const { type, purpose } = documentContext;
  
  if (type === 'architecture') {
    return `Here are best practices for your "${documentContext.title}" architecture document:

1. **Start with a High-Level Overview**
   - Include a system diagram
   - Explain the main components and their relationships
   - State the key design principles

2. **Be Specific About Components**
   - Define clear boundaries
   - Specify interfaces between components
   - Document dependencies

3. **Address Non-Functional Requirements**
   - Explain how the architecture supports scalability
   - Document security considerations
   - Include performance characteristics

4. **Include Decision Records**
   - Document why key architectural decisions were made
   - Include alternatives that were considered
   - Explain trade-offs

5. **Keep Technical Debt Visible**
   - Note known limitations
   - Document areas for future improvement

Would you like more specific guidance for your architecture document?`;
  } else if (type === 'api') {
    return `Here are best practices for your "${documentContext.title}" API documentation:

1. **Provide Clear Examples**
   - Include request and response examples for each endpoint
   - Show examples in multiple programming languages if relevant
   - Include both success and error scenarios

2. **Document Authentication Clearly**
   - Explain authentication methods in detail
   - Include code examples for authentication
   - Document token lifetimes and refresh procedures

3. **Be Explicit About Errors**
   - List all possible error codes
   - Provide clear error messages
   - Include troubleshooting guidance

4. **Document Rate Limits and Performance**
   - Specify any rate limits
   - Document expected response times
   - Include pagination information for list endpoints

5. **Keep Versioning Information Current**
   - Document the current API version
   - Explain backward compatibility
   - Include deprecation notices where relevant

Would you like more specific advice for your API documentation?`;
  } else {
    return `Here are general best practices for your "${documentContext.title}" document:

1. **Start with a Clear Purpose Statement**
   - What is this document for?
   - Who should read it?
   - What will readers gain?

2. **Use Consistent Formatting**
   - Apply heading hierarchy logically
   - Use lists for steps or collections of items
   - Add tables for structured information
   - Include code blocks with syntax highlighting

3. **Include Visuals Where Helpful**
   - Diagrams for complex concepts
   - Screenshots for UI references
   - Flowcharts for processes

4. **Make the Document Scannable**
   - Use descriptive headings
   - Add a table of contents for longer documents
   - Bold key terms or important information

5. **End with Next Steps**
   - What should the reader do next?
   - Where can they get more information?
   - How can they provide feedback?

Would you like more specific advice for your documentation?`;
  }
}

/**
 * Generate help response for chat
 */
function generateHelpResponse(documentContext) {
  return `I'm here to help you create your "${documentContext.title}" document. Here's what I can assist with:

1. **Document Structure**
   - Suggest appropriate sections and organization
   - Provide outlines tailored to your document type

2. **Content Generation**
   - Help generate specific sections
   - Provide examples and templates

3. **Best Practices**
   - Offer guidance on documentation standards
   - Suggest improvements for clarity and completeness

4. **Metadata Suggestions**
   - Recommend appropriate tags, categories, and other metadata
   - Help with proper file organization

What specific aspect of your document would you like help with today?`;
}

/**
 * Generate default response for chat
 */
function generateDefaultResponse(message, documentContext) {
  return `I understand you're working on "${documentContext.title}". Based on your message about "${message}", I recommend focusing on making your document clear, concise, and valuable to the reader.

For ${documentContext.type} documentation, it's important to include:
- Clear explanations of concepts
- Practical examples
- Visual aids where appropriate
- Consistent formatting

If you have a specific question or need help with a particular aspect of your document, please let me know, and I'll provide more targeted assistance.`;
}