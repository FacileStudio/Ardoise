import type { Meta, StoryObj } from '@storybook/svelte';
import Button from './Button.svelte';

const meta = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  // @ts-expect-error - Storybook argTypes don't fully support Svelte 5 components yet
  argTypes: {
    intent: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'The visual style of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the button',
    },
    type: {
      control: 'select',
      options: ['button', 'submit'],
      description: 'The HTML button type',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
  },
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
