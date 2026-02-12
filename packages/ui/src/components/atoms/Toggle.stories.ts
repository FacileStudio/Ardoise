import type { Meta, StoryObj } from '@storybook/svelte';
import Toggle from './Toggle.svelte';

const meta = {
	title: 'Atoms/Toggle',
	component: Toggle,
	tags: ['autodocs'],
	// @ts-expect-error - Storybook argTypes don't fully support Svelte 5 components yet
	argTypes: {
		checked: {
			control: 'boolean',
			description: 'Whether the toggle is checked/on'
		},
		disabled: {
			control: 'boolean',
			description: 'Whether the toggle is disabled'
		},
		size: {
			control: 'select',
			options: ['sm', 'md', 'lg'],
			description: 'The size of the toggle'
		}
	}
} satisfies Meta<Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
	args: {
		checked: false,
		size: 'md',
		disabled: false
	}
};

export const Checked: Story = {
	args: {
		checked: true,
		size: 'md',
		disabled: false
	}
};

export const Small: Story = {
	args: {
		checked: false,
		size: 'sm',
		disabled: false
	}
};

export const Medium: Story = {
	args: {
		checked: false,
		size: 'md',
		disabled: false
	}
};

export const Large: Story = {
	args: {
		checked: false,
		size: 'lg',
		disabled: false
	}
};

export const SmallChecked: Story = {
	args: {
		checked: true,
		size: 'sm',
		disabled: false
	}
};

export const MediumChecked: Story = {
	args: {
		checked: true,
		size: 'md',
		disabled: false
	}
};

export const LargeChecked: Story = {
	args: {
		checked: true,
		size: 'lg',
		disabled: false
	}
};

export const Disabled: Story = {
	args: {
		checked: false,
		size: 'md',
		disabled: true
	}
};

export const DisabledChecked: Story = {
	args: {
		checked: true,
		size: 'md',
		disabled: true
	}
};
