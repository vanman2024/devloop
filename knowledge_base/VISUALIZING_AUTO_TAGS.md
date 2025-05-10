# Visualizing Auto-Generated Tags in the DocumentManager UI

This guide explains how to use the DocumentManager UI to visualize and work with AI-generated tags.

## Overview

The DocumentManager UI already supports tag management through the TagManager component. The AI-generated tags are automatically integrated with this system, allowing you to visualize, filter, and manage both manual and AI-generated tags.

## Accessing the DocumentManager

1. Launch the UI application
2. Navigate to the DocumentManager page
3. The DocumentManager provides a comprehensive interface for browsing, searching, and managing all documentation

## Working with AI-Generated Tags

### Viewing Tags

When you select a document in the DocumentManager:

1. The right panel will display the document's information
2. The TagManager component at the top of the document view shows all tags
3. AI-generated tags are displayed alongside manual tags
4. The special "ai-generated" badge indicates tags that were automatically created

![Tag Visualization Example](../ui/docs/images/tag-visualization.png)

### Filtering by Tags

You can filter documents by tags:

1. Click on any tag in the DocumentManager interface
2. The document list will filter to show only documents with that tag
3. You can combine multiple tags for more specific filtering
4. The filter panel on the left sidebar also allows tag-based filtering

### Understanding Tag Types

The system displays different types of tags with visual indicators:

- **Manual Tags**: Added by users, displayed in blue
- **AI-Generated Tags**: Created by the auto-tagging system, displayed in green with the AI badge
- **Category Tags**: Higher-level organization, displayed in purple
- **Technical Domain Tags**: Domain-specific indicators, displayed in orange

### Tag Management

You can manage tags directly in the UI:

1. **Add Tags**: Click the "+" button in the TagManager to add new manual tags
2. **Remove Tags**: Click the "x" on any tag to remove it
3. **Edit Tags**: Click on a tag to edit its text
4. **Promote AI Tags**: Convert an AI-generated tag to a manual tag by accepting it

## Advanced Features

### Tag Insights

The DocumentManager provides insights about tags:

1. **Tag Cloud**: Shows the most common tags across all documents
2. **Related Tags**: When selecting a tag, suggests related tags often used together
3. **Tag Statistics**: Shows tag usage statistics and coverage

### Tag-Based Search

The search functionality in DocumentManager is enhanced by tags:

1. Search for specific terms within documents
2. Filter search results by tags
3. Use tag-based operators in search (e.g., "tag:architecture")

## Integration with AI Document Assistant

The DocumentManager includes an AI Document Assistant that:

1. Can suggest additional tags based on document content
2. Provides explanation of why certain tags were applied
3. Offers recommendations for related documents based on tags
4. Helps identify potential tagging inconsistencies

## Example Workflow

A typical workflow for working with auto-tagged documents:

1. Upload a document through the knowledge API (auto-tagging happens)
2. Open the DocumentManager UI and locate the document
3. Review the AI-generated tags in the TagManager
4. Keep useful tags and remove any irrelevant ones
5. Add any additional manual tags if needed
6. Use the tag-based filtering to find related documents
7. Leverage the AI Document Assistant for deeper tag analysis

## Technical Notes

- All tag changes in the UI are saved back to the knowledge base metadata
- Tag updates trigger recalculation of document relationships in the knowledge graph
- The UI checks for new documents and tags periodically to stay in sync
- Tag visualization settings can be customized in user preferences