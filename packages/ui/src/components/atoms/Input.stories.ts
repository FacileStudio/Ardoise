import type { Meta, StoryObj } from '@storybook/svelte';
import Input from './Input.svelte';

const meta = {
  title: 'Atoms/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'tel', 'url'],
      description: 'The input type',
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text',
    },
    error: {
      control: 'boolean',
      description: 'Whether the input is in an error state',
    },
    value: {
      control: 'text',
      description: 'The input value',
    },
  },
} satisfies Meta<Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
    error: false,
    value: '',
  },
};

export const WithValue: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
    value: 'Hello World',
  },
};

export const Error: Story = {
  args: {
    type: 'text',
    placeholder: 'Enter text...',
    error: true,
    value: 'Invalid input',
  },
};

export const Email: Story = {
  args: {
    type: 'email',
    placeholder: 'Enter your email...',
  },
};

export const Password: Story = {
  args: {
    type: 'password',
    placeholder: 'Enter your password...',
  },
};

export const Number: Story = {
  args: {
    type: 'number',
    placeholder: 'Enter a number...',
  },
};
