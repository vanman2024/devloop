# Feature Card Component

This component provides a standardized way to display feature information in the Devloop system.

## Design Principles

1. **Clear Identity**
   - Feature ID displayed for technical reference
   - User-friendly feature name for readability (not code-style naming)

2. **Status First**
   - Clear visual status indication (color-coded border)
   - Status badge prominent in the card

3. **Information Hierarchy**
   - Most important information (ID, name, status) at the top
   - Supporting details (module, phase, timestamps) in the middle
   - Actions at the bottom

4. **Consistent Styling**
   - Clean, minimal design
   - Consistent spacing and typography
   - Accessible color contrasts

## Component Structure

```jsx
<FeatureCard
  id="feature-460101-inference-engine"
  name="AI Inference Engine"
  description="Core inference processing system with optimized pipeline."
  status="in-progress"
  module="module-core"
  phase="phase-01"
  lastUpdated="2025-04-15T14:30:00Z"
  onRun={() => {}}
  onViewDetails={() => {}}
  onAddEnhancement={() => {}}
/>
```

## Props Reference

| Prop | Type | Description |
|------|------|-------------|
| `id` | string | Technical feature ID (e.g., `feature-460101-inference-engine`) |
| `name` | string | User-friendly feature name (e.g., `AI Inference Engine`) |
| `description` | string | Brief description of the feature |
| `status` | string | Feature status (`completed`, `in-progress`, `pending`, `blocked`) |
| `module` | string | Module containing the feature |
| `phase` | string | Phase containing the module |
| `lastUpdated` | string | ISO timestamp of last update |
| `onRun` | function | Handler for Run button click |
| `onViewDetails` | function | Handler for Details button click |
| `onAddEnhancement` | function | Handler for Add Enhancement button click |

## Status Colors

- `completed` - Green (`bg-green-500`)
- `in-progress` - Blue (`bg-blue-500`)
- `pending` - Yellow (`bg-yellow-500`)
- `blocked` - Red (`bg-red-500`)

## Usage Guidelines

1. **Consistent Display**
   - Use within grid layouts for feature dashboards
   - Maintain consistent width across cards

2. **Naming Conventions**
   - Use clear, meaningful feature names
   - Avoid code-style naming in the display name
   - Example ID: `feature-460101-inference-engine`
   - Example Name: `AI Inference Engine`

3. **Content Length**
   - Keep descriptions concise (2-3 lines maximum)
   - Truncate long text with ellipsis

4. **Interactive Behavior**
   - Implement hover states for better UX
   - Ensure action buttons have clear click targets

## Integration

This component is designed to work with:
- Tailwind CSS for styling
- React for interactivity
- Devloop's feature management system for data