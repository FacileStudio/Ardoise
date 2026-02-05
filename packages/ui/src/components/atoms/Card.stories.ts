import type { Meta, StoryObj } from '@storybook/svelte';
import Card from './Card.svelte';

const meta = {
  title: 'Atoms/Card',
  component: Card,
  tags: ['autodocs'],
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'The padding size',
    },
    rounded: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'The border radius',
    },
    shadow: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: 'The shadow size',
    },
    hover: {
      control: 'select',
      options: ['none', 'lift', 'scale'],
      description: 'The hover effect',
    },
  },
} satisfies Meta<Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    padding: 'md',
    rounded: 'lg',
    shadow: 'md',
    hover: 'none',
  },
  render: (args) => ({
    Component: Card,
    props: args,
    slot: '<h3 class="font-bold text-xl mb-2">Card Title</h3><p class="text-slate-600">This is a default card with medium padding, large rounded corners, and medium shadow.</p>',
  }),
};

export const WithLiftHover: Story = {
  args: {
    padding: 'md',
    rounded: 'lg',
    shadow: 'md',
    hover: 'lift',
  },
  render: (args) => ({
    Component: Card,
    props: args,
    slot: '<h3 class="font-bold text-xl mb-2">Hover to Lift</h3><p class="text-slate-600">This card lifts up when you hover over it.</p>',
  }),
};

export const WithScaleHover: Story = {
  args: {
    padding: 'md',
    rounded: 'lg',
    shadow: 'md',
    hover: 'scale',
  },
  render: (args) => ({
    Component: Card,
    props: args,
    slot: '<h3 class="font-bold text-xl mb-2">Hover to Scale</h3><p class="text-slate-600">This card scales up when you hover over it.</p>',
  }),
};

export const NoPadding: Story = {
  args: {
    padding: 'none',
    rounded: 'lg',
    shadow: 'md',
    hover: 'none',
  },
  render: (args) => ({
    Component: Card,
    props: args,
    slot: '<div class="p-6"><h3 class="font-bold text-xl mb-2">No Padding</h3><p class="text-slate-600">This card has no padding by default. You can add your own padding to the content.</p></div>',
  }),
};

export const LargeShadow: Story = {
  args: {
    padding: 'lg',
    rounded: 'xl',
    shadow: 'lg',
    hover: 'none',
  },
  render: (args) => ({
    Component: Card,
    props: args,
    slot: '<h3 class="font-bold text-xl mb-2">Large Shadow</h3><p class="text-slate-600">This card has a large shadow and extra large rounded corners.</p>',
  }),
};
