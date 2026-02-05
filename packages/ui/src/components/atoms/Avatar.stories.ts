import type { Meta, StoryObj } from '@storybook/svelte';
import Avatar from './Avatar.svelte';

const meta = {
  title: 'Atoms/Avatar',
  component: Avatar,
  tags: ['autodocs'],
  argTypes: {
    src: {
      control: 'text',
      description: 'The image source URL',
    },
    alt: {
      control: 'text',
      description: 'Alt text for the image',
    },
    initials: {
      control: 'text',
      description: 'Initials to display when no image is provided',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'The size of the avatar',
    },
    color: {
      control: 'select',
      options: ['blue', 'purple', 'green', 'orange', 'slate'],
      description: 'The gradient color when displaying initials',
    },
  },
} satisfies Meta<Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithInitials: Story = {
  args: {
    src: null,
    initials: 'JD',
    size: 'md',
    color: 'blue',
    alt: '',
  },
};

export const Small: Story = {
  args: {
    src: null,
    initials: 'AB',
    size: 'sm',
    color: 'purple',
  },
};

export const Large: Story = {
  args: {
    src: null,
    initials: 'XY',
    size: 'lg',
    color: 'green',
  },
};

export const ExtraLarge: Story = {
  args: {
    src: null,
    initials: 'SK',
    size: 'xl',
    color: 'orange',
  },
};

export const Purple: Story = {
  args: {
    src: null,
    initials: 'MP',
    size: 'md',
    color: 'purple',
  },
};

export const Green: Story = {
  args: {
    src: null,
    initials: 'LG',
    size: 'md',
    color: 'green',
  },
};

export const Orange: Story = {
  args: {
    src: null,
    initials: 'OR',
    size: 'md',
    color: 'orange',
  },
};

export const Slate: Story = {
  args: {
    src: null,
    initials: 'SL',
    size: 'md',
    color: 'slate',
  },
};

export const WithImage: Story = {
  args: {
    src: 'https://i.pravatar.cc/150?img=12',
    alt: 'User avatar',
    size: 'md',
    color: 'blue',
  },
};
