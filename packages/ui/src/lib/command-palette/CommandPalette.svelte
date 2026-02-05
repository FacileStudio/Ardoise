<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { scale } from 'svelte/transition';
	import { commandRegistry, type Command } from './registry';
	import 'iconify-icon';

	let {
		open = $bindable(false),
		shortcut = 'k',
		modifierKey = 'metaKey' as 'ctrlKey' | 'metaKey',
		placeholder = 'Search commands...'
	}: {
		open?: boolean;
		shortcut?: string;
		modifierKey?: 'ctrlKey' | 'metaKey';
		placeholder?: string;
	} = $props();

	let dialog = $state<HTMLDialogElement>();
	let searchInput = $state<HTMLInputElement>();
	let query = $state('');
	let selectedIndex = $state(0);
	let filteredCommands = $derived(commandRegistry.search(query));
	let groupedCommands = $derived(groupByCategory(filteredCommands));

	$effect(() => {
		if (dialog && open) {
			dialog.showModal();
			searchInput?.focus();
			selectedIndex = 0;
		}
		if (dialog && !open) {
			dialog.close();
			query = '';
		}
	});

	function groupByCategory(commands: Command[]): Map<string, Command[]> {
		const groups = new Map<string, Command[]>();

		commands.forEach(cmd => {
			const category = cmd.category || 'General';
			if (!groups.has(category)) {
				groups.set(category, []);
			}
			groups.get(category)!.push(cmd);
		});

		return groups;
	}

	function close() {
		open = false;
	}

	function executeCommand(command: Command) {
		command.action();
		close();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
			scrollSelectedIntoView();
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
			scrollSelectedIntoView();
		} else if (event.key === 'Enter') {
			event.preventDefault();
			const command = filteredCommands[selectedIndex];
			if (command) executeCommand(command);
		} else if (event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}

	function scrollSelectedIntoView() {
		const selected = document.querySelector('[data-selected="true"]');
		selected?.scrollIntoView({ block: 'nearest' });
	}

	function handleGlobalKeydown(event: KeyboardEvent) {
		if (event[modifierKey] && event.key.toLowerCase() === shortcut.toLowerCase()) {
			event.preventDefault();
			open = !open;
		}
	}

	onMount(() => {
		window.addEventListener('keydown', handleGlobalKeydown);
		const unsubscribe = commandRegistry.subscribe(() => {
			filteredCommands = commandRegistry.search(query);
		});

		return () => {
			window.removeEventListener('keydown', handleGlobalKeydown);
			unsubscribe();
		};
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleGlobalKeydown);
	});
</script>

{#if open}
	<dialog
		bind:this={dialog}
		onclose={close}
		onclick={(e) => e.target === e.currentTarget && close()}
		class="bg-transparent backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm p-4 outline-none"
	>
		<div
			in:scale={{ start: 0.95, duration: 200 }}
			out:scale={{ start: 0.95, duration: 150 }}
			class="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100"
		>
			<div class="p-6 border-b border-slate-50">
				<div class="relative">
					<iconify-icon
						icon="solar:magnifer-bold"
						width="20"
						class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
					></iconify-icon>
					<input
						bind:this={searchInput}
						bind:value={query}
						onkeydown={handleKeydown}
						type="text"
						placeholder={placeholder}
						class="w-full pl-12 pr-4 py-3 text-lg bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-200 focus:bg-white outline-none transition-all"
					/>
				</div>
			</div>

			<div class="max-h-[60vh] overflow-y-auto p-4">
				{#if filteredCommands.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-slate-300">
						<iconify-icon icon="solar:ghost-bold" width="64"></iconify-icon>
						<p class="mt-4 text-sm font-medium">No commands found</p>
					</div>
				{:else}
					{#each [...groupedCommands.entries()] as [category, commands]}
						<div class="mb-6 last:mb-0">
							<h4 class="text-xs font-black uppercase tracking-tighter text-slate-400 mb-2 px-3">
								{category}
							</h4>
							<div class="space-y-1">
								{#each commands as command, index}
									{@const globalIndex = filteredCommands.indexOf(command)}
									<button
										onclick={() => executeCommand(command)}
										data-selected={globalIndex === selectedIndex}
										class="w-full text-left px-4 py-3 rounded-xl transition-all group hover:bg-indigo-50 {globalIndex === selectedIndex ? 'bg-indigo-50' : ''}"
									>
										<div class="flex items-center gap-3">
											{#if command.icon}
												<div class="w-10 h-10 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-indigo-500 group-hover:border-indigo-200 transition-colors">
													<iconify-icon icon={command.icon} width="20"></iconify-icon>
												</div>
											{/if}
											<div class="flex-1 min-w-0">
												<div class="font-bold text-slate-900 truncate">{command.label}</div>
												{#if command.description}
													<div class="text-sm text-slate-400 truncate">{command.description}</div>
												{/if}
											</div>
											{#if command.shortcut}
												<div class="flex items-center gap-1">
													{#each command.shortcut.split('+') as key}
														<kbd class="px-2 py-1 text-xs font-mono bg-slate-100 border border-slate-200 rounded-md text-slate-500">
															{key}
														</kbd>
													{/each}
												</div>
											{/if}
										</div>
									</button>
								{/each}
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<div class="p-4 border-t border-slate-50 bg-slate-50/50">
				<div class="flex items-center justify-between text-xs text-slate-400">
					<div class="flex items-center gap-4">
						<span class="flex items-center gap-1">
							<kbd class="px-2 py-1 bg-white border border-slate-200 rounded-md">↑↓</kbd>
							Navigate
						</span>
						<span class="flex items-center gap-1">
							<kbd class="px-2 py-1 bg-white border border-slate-200 rounded-md">↵</kbd>
							Select
						</span>
						<span class="flex items-center gap-1">
							<kbd class="px-2 py-1 bg-white border border-slate-200 rounded-md">Esc</kbd>
							Close
						</span>
					</div>
					<span class="font-medium">
						{filteredCommands.length} {filteredCommands.length === 1 ? 'command' : 'commands'}
					</span>
				</div>
			</div>
		</div>
	</dialog>
{/if}

<style>
	dialog {
		position: fixed;
		top: 20%;
		left: 50%;
		transform: translate(-50%, 0);
		margin: 0;
		max-height: 90vh;
		max-width: 90vw;
	}

	dialog::backdrop {
		animation: fade 0.2s ease-out;
	}

	@keyframes fade {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
