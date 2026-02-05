# Command Palette

A modular, ultra-simple command palette system for rapid development. Execute actions with keyboard shortcuts and fuzzy search.

## Features

- Ultra-simple command registry
- Configurable keyboard shortcuts (default: Cmd/Ctrl + K)
- Fuzzy search through commands
- Category grouping
- Keyboard navigation
- Icon support
- Shortcut display
- Clean, modern UI

## Quick Start

### 1. Add the CommandPalette component to your layout

```svelte
<script lang="ts">
	import { CommandPalette, commandRegistry } from '@repo/ui';
	import { onMount } from 'svelte';

	let paletteOpen = $state(false);

	onMount(() => {
		commandRegistry.registerMultiple([
			{
				id: 'home',
				label: 'Go to Home',
				description: 'Navigate to the homepage',
				icon: 'solar:home-bold',
				category: 'Navigation',
				shortcut: 'Cmd+H',
				action: () => {
					window.location.href = '/';
				}
			},
			{
				id: 'profile',
				label: 'View Profile',
				description: 'Go to your profile page',
				icon: 'solar:user-bold',
				category: 'Navigation',
				action: () => {
					window.location.href = '/profile';
				}
			},
			{
				id: 'theme-dark',
				label: 'Dark Mode',
				description: 'Switch to dark theme',
				icon: 'solar:moon-bold',
				category: 'Settings',
				keywords: ['dark', 'theme', 'night'],
				action: () => {
					document.documentElement.classList.add('dark');
				}
			},
			{
				id: 'logout',
				label: 'Sign Out',
				description: 'Logout from your account',
				icon: 'solar:logout-bold',
				category: 'Account',
				action: async () => {
					await fetch('/api/logout', { method: 'POST' });
					window.location.href = '/login';
				}
			}
		]);
	});
</script>

<CommandPalette bind:open={paletteOpen} />

<!-- Your app content -->
<slot />
```

### 2. Register commands anywhere in your app

```svelte
<script lang="ts">
	import { commandRegistry } from '@repo/ui';
	import { onMount } from 'svelte';

	onMount(() => {
		commandRegistry.register({
			id: 'create-post',
			label: 'Create New Post',
			description: 'Start writing a new blog post',
			icon: 'solar:pen-bold',
			category: 'Content',
			action: () => {
				window.location.href = '/posts/new';
			}
		});

		return () => {
			commandRegistry.unregister('create-post');
		};
	});
</script>
```

## API Reference

### CommandPalette Component

```svelte
<CommandPalette
	bind:open={paletteOpen}
	shortcut="k"
	modifierKey="metaKey"
	placeholder="Search commands..."
/>
```

**Props:**
- `open` (boolean): Controls visibility of the palette
- `shortcut` (string): Key to trigger palette (default: 'k')
- `modifierKey` ('ctrlKey' | 'metaKey'): Modifier key (default: 'metaKey' for Cmd on Mac, use 'ctrlKey' for Ctrl)
- `placeholder` (string): Search input placeholder (default: 'Search commands...')

### Command Interface

```typescript
interface Command {
	id: string;
	label: string;
	description?: string;
	icon?: string;
	shortcut?: string;
	category?: string;
	action: () => void | Promise<void>;
	keywords?: string[];
}
```

### Command Registry Methods

```typescript
commandRegistry.register(command: Command): void
commandRegistry.registerMultiple(commands: Command[]): void
commandRegistry.unregister(id: string): void
commandRegistry.clear(): void
commandRegistry.get(id: string): Command | undefined
commandRegistry.getAll(): Command[]
commandRegistry.getByCategory(category: string): Command[]
commandRegistry.search(query: string): Command[]
commandRegistry.subscribe(listener: () => void): () => void
```

## Examples

### Dynamic Commands Based on Route

```svelte
<script lang="ts">
	import { commandRegistry } from '@repo/ui';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	$effect(() => {
		if ($page.url.pathname === '/admin') {
			commandRegistry.register({
				id: 'admin-users',
				label: 'Manage Users',
				icon: 'solar:users-group-rounded-bold',
				category: 'Admin',
				action: () => {
					window.location.href = '/admin/users';
				}
			});
		} else {
			commandRegistry.unregister('admin-users');
		}
	});
</script>
```

### Commands with Async Actions

```svelte
<script lang="ts">
	import { commandRegistry } from '@repo/ui';

	commandRegistry.register({
		id: 'export-data',
		label: 'Export Data',
		description: 'Download your data as JSON',
		icon: 'solar:download-bold',
		category: 'Data',
		action: async () => {
			const response = await fetch('/api/export');
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'data.json';
			a.click();
		}
	});
</script>
```

### Search Keywords

```svelte
<script lang="ts">
	import { commandRegistry } from '@repo/ui';

	commandRegistry.register({
		id: 'settings',
		label: 'Settings',
		description: 'Manage your preferences',
		icon: 'solar:settings-bold',
		category: 'App',
		keywords: ['preferences', 'config', 'options', 'customize'],
		action: () => {
			window.location.href = '/settings';
		}
	});
</script>
```

## Keyboard Shortcuts

- **Cmd/Ctrl + K**: Open/close command palette
- **↑/↓**: Navigate through commands
- **Enter**: Execute selected command
- **Esc**: Close palette

## Icons

The command palette uses [Iconify](https://iconify.design/) for icons. You can use any icon from:
- Solar (default): `solar:home-bold`
- Material Design Icons: `mdi:home`
- Font Awesome: `fa:home`
- And 100+ other icon sets

Browse icons at [Iconify Icon Sets](https://icon-sets.iconify.design/)

## Tips

1. **Use categories** to organize related commands
2. **Add keywords** to improve searchability
3. **Keep labels short** and action-oriented
4. **Use async actions** for API calls or long-running operations
5. **Unregister commands** when components unmount to avoid memory leaks
6. **Use descriptive IDs** to make debugging easier

## Advanced Usage

### Custom Trigger Button

```svelte
<script lang="ts">
	import { CommandPalette } from '@repo/ui';

	let paletteOpen = $state(false);
</script>

<button on:click={() => paletteOpen = true}>
	Open Commands
</button>

<CommandPalette bind:open={paletteOpen} />
```

### Programmatic Control

```svelte
<script lang="ts">
	import { CommandPalette, commandRegistry } from '@repo/ui';

	let paletteOpen = $state(false);

	function quickNavigate() {
		const homeCommand = commandRegistry.get('home');
		if (homeCommand) {
			homeCommand.action();
		}
	}
</script>
```

### Subscribe to Registry Changes

```svelte
<script lang="ts">
	import { commandRegistry } from '@repo/ui';
	import { onMount } from 'svelte';

	let commandCount = $state(0);

	onMount(() => {
		const unsubscribe = commandRegistry.subscribe(() => {
			commandCount = commandRegistry.getAll().length;
		});

		return unsubscribe;
	});
</script>

<p>Available commands: {commandCount}</p>
```
