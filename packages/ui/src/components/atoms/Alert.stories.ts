import type { Meta, StoryObj } from '@storybook/svelte';
import Alert from './Alert.svelte';

const meta = {
  title: 'Atoms/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'danger'],
      description: 'The alert variant/type',
    },
    dismissible: {
      control: 'boolean',
      description: 'Whether the alert can be dismissed',
    },
  },
} satisfies Meta<Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: 'info',
    dismissible: false,
  },
  render: (args) => ({
    Component: Alert,
    props: args,
    slot: 'This is an informational message.',
  }),
};

export const Success: Story = {
  args: {
    variant: 'success',
    dismissible: false,
  },
  render: (args) => ({
    Component: Alert,
    props: args,
    slot: 'Your changes have been saved successfully!',
  }),
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    dismissible: false,
  },
  render: (args) => ({
    Component: Alert,
    props: args,
    slot: 'Please review your input before proceeding.',
  }),
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    dismissible: false,
  },
  render: (args) => ({
    Component: Alert,
    props: args,
    slot: 'An error occurred. Please try again.',
  }),
};

export const Dismissible: Story = {
  args: {
    variant: 'info',
    dismissible: true,
  },
  render: (args) => ({
    Component: Alert,
    props: args,
    slot: 'This alert can be dismissed by clicking the X button.',
  }),
};
