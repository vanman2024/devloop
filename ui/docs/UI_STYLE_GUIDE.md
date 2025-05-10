# Devloop UI Style Guide

This style guide provides conventions and best practices for developing UI components in the Devloop application.

## Component Development

### Component Creation

1. **Location**: Place new components in the appropriate subdirectory under `src/components/`
2. **Naming**: Use PascalCase for component files (e.g., `FeatureCard.jsx`)
3. **Structure**: Export one primary component per file
4. **Documentation**: Include JSDoc comments describing the component's purpose and props

### Component Structure Pattern

```jsx
import React from 'react';
import PropTypes from 'prop-types'; // If using prop validation

/**
 * ComponentName - Brief description of the component
 * 
 * Detailed description of what the component does and when to use it
 */
const ComponentName = ({ prop1, prop2, children }) => {
  // Component logic

  return (
    <div className="component-name">
      {/* Component structure */}
    </div>
  );
};

// Optional prop validation
ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
  children: PropTypes.node
};

// Optional default props
ComponentName.defaultProps = {
  prop2: 0,
  children: null
};

export default ComponentName;
```

### Component Reuse

- Extract reusable pieces into their own components
- Consider composition over inheritance
- Use React's Context API for state that needs to be accessed by many components

## Styling Approaches

### CSS Organization

1. **Component-specific styles**: Include styles directly with the component
2. **Global styles**: Use `src/index.css` for application-wide styles
3. **Tailwind CSS**: Utilize Tailwind utility classes when appropriate
4. **CSS-in-JS**: For dynamic styling based on props or state

### Class Naming

- Use kebab-case for CSS class names (e.g., `feature-card`)
- Add descriptive modifiers with hyphens (e.g., `feature-card-highlighted`)
- Consider using namespace prefixes for common elements (e.g., `btn-primary`, `card-feature`)

## State Management

### Component State

- Use the useState hook for simple component state
- Extract complex state logic to custom hooks
- Consider useReducer for complex state transitions

### Application State

- Use context for state that spans multiple components
- Keep state as close as possible to where it's used
- Document state structure in comments

## Common Patterns

### Error Handling

- Use ErrorBoundary components to catch errors
- Provide helpful error messages and recovery options
- Log errors through appropriate service

### Loading States

- Implement consistent loading indicators
- Use skeletons for content loading when appropriate
- Consider optimistic updates for better UX

### Form Handling

- Use controlled components for form inputs
- Extract form logic to custom hooks when complex
- Implement consistent validation patterns

## Accessibility

- Use semantic HTML elements
- Ensure proper keyboard navigation
- Add appropriate ARIA attributes
- Test with screen readers

## Performance Considerations

- Memoize expensive calculations with useMemo
- Prevent unnecessary renders with React.memo and useCallback
- Load large components lazily
- Consider code splitting for routes

## Testing

- Write unit tests for complex component logic
- Test user interactions
- Ensure components render correctly with different props
- Consider testing with accessibility in mind

## Project Structure

```
src/
├── components/        # UI components organized by category
├── pages/             # Page components (top-level routes)
├── services/          # API services
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── context/           # React context providers
├── App.jsx            # Main App component
└── main.jsx           # Entry point
```

## Examples

### Good Component Example

```jsx
import React from 'react';

/**
 * StatusBadge - Displays a colored badge showing status
 * 
 * Use this component to visually indicate the status of an item
 */
const StatusBadge = ({ status, size = 'medium' }) => {
  const statusClasses = {
    completed: 'bg-green-500',
    'in-progress': 'bg-blue-500',
    pending: 'bg-yellow-500',
    blocked: 'bg-red-500'
  };
  
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1',
    large: 'text-base px-4 py-2'
  };
  
  const classes = `
    status-badge
    ${statusClasses[status] || 'bg-gray-500'}
    ${sizeClasses[size]}
    rounded-full
    text-white
    font-medium
    inline-block
  `;
  
  return (
    <span className={classes}>
      {status.replace('-', ' ')}
    </span>
  );
};

export default StatusBadge;
```