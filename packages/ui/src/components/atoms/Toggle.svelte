<script lang="ts">
  let {
    checked = $bindable(false),
    disabled = false,
    size = 'md',
    class: className = '',
    label = 'Toggle switch',
  }: {
    checked?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    class?: string;
    label?: string;
  } = $props();

  // We only use Tailwind for the "look" (colors/sizes)
  // We'll use simple math for the "movement"
  const sizes = {
    sm: { track: 'h-5 w-9', knob: 'h-3.5 w-3.5', offset: 16 },
    md: { track: 'h-6 w-11', knob: 'h-4 w-4', offset: 20 },
    lg: { track: 'h-8 w-14', knob: 'h-6 w-6', offset: 24 },
  };

  const current = $derived(sizes[size]);
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={() => !disabled && (checked = !checked)}
  class="
    group relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent
    transition-colors duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]
    focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2
    disabled:cursor-not-allowed disabled:opacity-50
    {checked ? 'bg-black' : 'bg-neutral-200'}
    {current.track}
    {className}
  "
>
  <div class="relative w-full h-full flex items-center px-1">
    <span
      class="
        pointer-events-none block rounded-full bg-white shadow-sm
        transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
        group-active:scale-x-125
        {current.knob}
      "
      style:transform={checked ? `translateX(${current.offset}px)` : 'translateX(0px)'}
    ></span>
  </div>
</button>
