# @repo/ui

Shared Svelte component library with Tailwind CSS styling.

## Installation

Already installed in the workspace. Import components:

```typescript
import { Button, Card, Input, Modal } from '@repo/ui';
```

## Shared Styles

Import the base Tailwind configuration in your app's CSS file:

```css
@import '@repo/ui/src/styles/tailwind.css';
@import '@fontsource/poppins/400.css';
@import '@fontsource/poppins/600.css';
@import '@fontsource/poppins/700.css';
@import '@fontsource-variable/inter';
```

## Components

### Atoms
- **Alert**: Info, success, warning, danger alerts with optional dismiss
- **Avatar**: User avatars with image or initials
- **Badge**: Status badges with variants
- **Button**: Primary, secondary, danger, ghost buttons
- **Card**: Flexible card container with shadow/padding variants
- **Input**: Styled text inputs
- **LanguageSwitcher**: i18n language selector
- **Spinner**: Loading spinners
- **Tabs**: Tab navigation component

### Molecules
- **Pagination**: Page navigation controls
- **SearchInput**: Search input with icon
- **Stat**: Metric display with trend indicators

### Organisms
- **AutoForm**: Automatic form generation from schema
- **AutoTable**: Data table with sorting/filtering
- **BottomDrawer**: Mobile-friendly bottom sheet
- **ConfirmDialog**: Confirmation modal
- **EmptyState**: Empty state placeholder
- **ImageUpload**: File upload with preview
- **Modal**: Modal dialog

### Layout
- **Sidebar**: Navigation sidebar
- **ToastContainer**: Toast notification system

### Charts (LayerChart-based)
Built with [LayerChart](https://layerchart.com) for native Svelte charting with beautiful defaults.

- **BarChart**: Vertical bar charts with rounded corners
- **LineChart**: Smooth line charts with highlights
- **AreaChart**: Gradient area charts
- **PieChart**: Pie charts with custom colors

#### Chart Usage Example

```svelte
<script>
  import { BarChart, Card } from '@repo/ui';

  const data = [
    { x: 'Jan', y: 4000 },
    { x: 'Feb', y: 3000 },
    { x: 'Mar', y: 2000 },
  ];
</script>

<Card>
  <h2>Monthly Sales</h2>
  <BarChart
    {data}
    x="x"
    y="y"
    height={350}
    color="#4f46e5"
  />
</Card>
```

## Design Tokens

The package provides consistent design tokens:

- **Fonts**: Poppins (titles), Inter (body)
- **Colors**: Primary (indigo), secondary (slate), danger (rose), success (green), warning (amber)
- **Border Radius**: sm (12px), md (16px), lg (24px), xl (32px)
- **Shadows**: sm, md, lg, xl

## Mobile Support

While components are built for Svelte, design tokens can be used in React Native by extracting the Tailwind config values.
