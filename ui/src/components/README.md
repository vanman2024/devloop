# UI Components

This directory contains React components used throughout the Devloop UI application.

## Directory Structure

- **Root level**: Common components and those still being migrated to subdirectories
- **activity/**: Components related to activity tracking and monitoring
- **buttons/**: Button components with various styles
- **cards/**: Card components for displaying grouped information
- **charts/**: Data visualization components
- **docs/**: Document management and viewing components
- **examples/**: Example components for reference
- **feature/**: Feature management specific components
- **forms/**: Form-related components
- **health/**: System health monitoring components
- **home/**: Home dashboard components
- **modals/**: Modal dialog components
- **navigation/**: Navigation components (headers, sidebars)
- **project/**: Project management components
- **roadmap/**: Roadmap visualization components
- **status-indicators/**: Loading spinners, status badges, etc.
- **system-health/**: System health monitoring components
- **tables/**: Table and data grid components
- **tasks/**: Task management components

## Component Guidelines

### Naming Conventions

- Use PascalCase for component names (e.g., `FeatureCard.jsx`)
- Include the feature/type in the name when possible (e.g., `DocumentViewer.jsx`)
- Prefix enhanced versions with "Enhanced" (e.g., `EnhancedFeatureCard.jsx`)

### Component Organization

1. **New components** should be placed in the appropriate subdirectory based on their purpose
2. **Shared/common components** should be placed in the most relevant subdirectory
3. **Feature-specific components** should be placed in their feature-specific directory

### Component Structure

- Each component should have a clear, single responsibility
- Document complex components with JSDoc comments
- Consider extracting reusable pieces into separate components

## Modal Components

All modal components should be placed in the `modals/` directory to maintain consistency. If you need to create a new modal component, please add it to this directory.

## Roadmap

Future improvements to component organization:
- Consolidate duplicate components
- Add more detailed documentation
- Create a component library with examples