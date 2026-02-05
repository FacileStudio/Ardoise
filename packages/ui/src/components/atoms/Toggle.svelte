<script lang="ts">
	let {
		checked = $bindable(false),
		disabled = false,
		size = 'md'
	}: {
		checked?: boolean;
		disabled?: boolean;
		size?: 'sm' | 'md' | 'lg';
	} = $props();

	const sizes = {
		sm: {
			width: 44,
			height: 24,
			circleSize: 20,
			translateX: 20
		},
		md: {
			width: 56,
			height: 28,
			circleSize: 24,
			translateX: 28
		},
		lg: {
			width: 64,
			height: 32,
			circleSize: 28,
			translateX: 32
		}
	};

	const currentSize = $derived(sizes[size]);

	function toggle() {
		if (!disabled) {
			checked = !checked;
		}
	}
</script>

<button
	type="button"
	role="switch"
	aria-checked={checked}
	onclick={toggle}
	disabled={disabled}
	class="relative inline-flex items-center rounded-full transition-all duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed {checked ? 'bg-indigo-600' : 'bg-slate-200'}"
	style="width: {currentSize.width}px; height: {currentSize.height}px; padding: 2px;"
>
	<span
		class="inline-block rounded-full bg-white shadow-lg transition-transform duration-300 ease-in-out"
		style="width: {currentSize.circleSize}px; height: {currentSize.circleSize}px; transform: translateX({checked ? currentSize.translateX : 0}px);"
	/>
</button>
