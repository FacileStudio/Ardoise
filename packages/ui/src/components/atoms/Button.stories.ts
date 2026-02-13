import type { Meta, StoryObj } from '@storybook/svelte';
import Button from './Button.svelte';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
} satisfies Meta<Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    intent: 'primary',
    size: 'md',
    disabled: false,
  },
  render: (args) => ({
    Component: Button,
    props: args,
    slot: 'Primary Button',
  }),
};

export const Secondary: Story = {
  args: {
    intent: 'secondary',
    size: 'md',
  },
  render: (args) => ({
    Component: Button,
    props: args,
    slot: 'Secondary Button',
  }),
};

export const Danger: Story = {
  args: {
    intent: 'danger',
    size: 'md',
  },
  render: (args) => ({
    Component: Button,
    props: args,
    slot: 'Danger Button',
  }),
};

export const Ghost: Story = {
  args: {
    intent: 'ghost',
    size: 'md',
  },
  render: (args) => ({
    Component: Button,
    props: args,
    slot: 'Ghost Button',
  }),
};

export const Small: Story = {
  args: {
    intent: 'primary',
    size: 'sm',
  },
  render: (args) => ({
    Component: Button,
    props: args,
    slot: 'Small Button',
  }),
};

export const Large: Story = {
  args: {
    intent: 'primary',
    size: 'lg',
  },
  render: (args) => ({
    Component: Button,
    props: args,
    slot: 'Large Button',
  }),
};

export const Disabled: Story = {
  args: {
    intent: 'primary',
    size: 'md',
    disabled: true,
  },
  render: (args) => ({
    Component: Button,
    props: args,
    slot: 'Disabled Button',
  }),
};
