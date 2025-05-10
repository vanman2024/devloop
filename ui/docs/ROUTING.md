# Devloop React UI Routing Architecture

## Overview

The Devloop React UI uses React Router for client-side routing. This architecture ensures that pages stay loaded within the same application context, providing a smoother user experience and preventing unnecessary page reloads.

## Key Features

1. **Single Page Application (SPA) Architecture**
   - The entire application runs in a single HTML context
   - Only the main content area changes when navigating between pages
   - The sidebar and header remain consistent throughout navigation

2. **Lazy Loading**
   - Pages are loaded on-demand using React's `lazy` and `Suspense`
   - This improves initial load time and overall performance
   - A loading spinner is displayed while pages are being loaded

3. **Persistent Layout**
   - The application layout (Sidebar and Header) is maintained outside the route definitions
   - This ensures the UI remains consistent across route changes

4. **Deep Linking Support**
   - Direct navigation to any route is supported
   - The application will load the appropriate page based on the URL
   - Missing routes redirect to the Dashboard page

## Adding New Pages

When adding new pages to the application:

1. Create a new page component in the `src/pages` directory
2. Import the page lazily in `App.jsx`:
   ```jsx
   const NewPage = lazy(() => import('./pages/NewPage.jsx'));
   ```
3. Add a route for the page in the `Routes` component:
   ```jsx
   <Route path="/new-page" element={<NewPage />} />
   ```
4. Add a navigation link in the Sidebar component to the new page

## Page Template

Use the `createPage` utility to maintain consistent page layouts:

```jsx
import React from 'react';
import { createPage } from '../utils/PageUtils';

const MyNewPage = () => {
  return createPage("My New Page", (
    <div className="bg-gray-800 rounded-lg p-6">
      <p className="text-gray-300">Page content goes here</p>
    </div>
  ));
};

export default MyNewPage;
```

## Best Practices

1. **Keep Pages Self-Contained**
   - Pages should load their own data
   - Use local state for page-specific UI state
   - Share global state through context providers

2. **Handle Loading States**
   - Always provide loading indicators for async operations
   - Use the `PageLoading` component for consistent loading states

3. **Error Handling**
   - Handle data fetching errors gracefully
   - Use the `PageError` component for consistent error states

4. **Navigation**
   - Use `Link` and `NavLink` from React Router for navigation
   - Avoid using `window.location` for navigation within the app

5. **Route Parameters**
   - Use route parameters for dynamic content:
     ```jsx
     <Route path="/features/:featureId" element={<FeatureDetails />} />
     ```
   - Access parameters with the `useParams` hook:
     ```jsx
     const { featureId } = useParams();
     ```