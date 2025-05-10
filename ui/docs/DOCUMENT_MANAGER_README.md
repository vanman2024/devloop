# Document Manager System

The Document Manager system provides a comprehensive solution for discovering, categorizing, and managing documentation across the DevLoop project. It includes AI-powered document content generation capabilities.

## Features

- **Document Discovery**: Automatically finds and indexes documentation files throughout the codebase
- **Document Categorization**: Organizes documents by category, component, and tags
- **Document Viewer**: Multiple viewing modes including editor, markdown preview, and simple mode
- **Document Editing**: Side-by-side Markdown editor with live preview
- **Document Creation**: Create new documents with an intuitive interface
- **AI-Powered Assistance**: Generate comprehensive document content using AI

## Usage

### Starting the Document Server

The Document Manager requires a server component to handle AI-powered document generation. You can start it using:

```bash
# Start the simple document server (port 3002)
cd /mnt/c/Users/angel/devloop/system-core/ui-system/react-app
node server/simple-server.js

# Or use the npm script
npm run docs-server
```

### Using the Document Manager in React

The Document Manager is accessible through the `DocumentManager` component:

```jsx
import DocumentManager from './components/docs/DocumentManager';

function App() {
  return (
    <div className="app">
      <DocumentManager />
    </div>
  );
}
```

### Creating New Documents with AI

1. Click the "Create Document" button in the Document Manager
2. Fill in the document title and description
3. Toggle the "Use AI Assistance" option to enable AI-powered content generation
4. Select a document type and purpose
5. Submit the form to create a new document with AI-generated content

## Architecture

The Document Manager consists of these key components:

1. **DocumentManagerService**: Core service for document discovery and management
2. **DocumentManager**: Main React component that coordinates the UI
3. **DocumentBrowser**: Component for browsing and filtering documents
4. **DocumentViewer**: Component for viewing documents with multiple modes
5. **Document Server**: Express server handling AI document generation

## Testing

You can test the document generation API using:

```bash
# Test the simple document generation server
cd /mnt/c/Users/angel/devloop/system-core/ui-system/react-app
node server/simple-test.js

# Or use the npm script
npm run test-docs-api
```

## Future Enhancements

1. **Real AI Integration**: Enhance with complete Claude API integration
2. **Document Analytics**: Track document usage and suggest improvements
3. **Version History**: Track changes to documents over time
4. **Document Templates**: Create and use templates for common document types
5. **Collaborative Editing**: Real-time collaborative document editing