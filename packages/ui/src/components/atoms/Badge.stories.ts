import type { Meta, StoryObj } from '@storybook/svelte';
import Badge from './Badge.svelte';

const meta = {
  title: 'Atoms/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['indigo', 'rose', 'amber', 'emerald', 'slate'],
      description: 'The badge color variant',
    },
  },
} satisfies Meta<Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Indigo: Story = {
  args: {
    variant: 'indigo',
  },
  render: (args) => ({
    Component: Badge,
    props: args,
    slot: 'Indigo',
  }),
};

export const Rose: Story = {
  args: {
    variant: 'rose',
  },
  render: (args) => ({
    Component: Badge,
    props: args,
    slot: 'Rose',
  }),
};

export const Amber: Story = {
  args: {
    variant: 'amber',
  },
  render: (args) => ({
    Component: Badge,
    props: args,
    slot: 'Amber',
  }),
};

export const Emerald: Story = {
  args: {
    variant: 'emerald',
  },
  render: (args) => ({
    Component: Badge,
    props: args,
    slot: 'Emerald',
  }),
};

export const Slate: Story = {
  args: {
    variant: 'slate',
  },
  render: (args) => ({
    Component: Badge,
    props: args,
    slot: 'Slate',
  }),
};

export const Status: Story = {
  render: () => ({
    Component: Badge,
    props: { variant: 'emerald' },
    slot: 'Active',
  }),
};
