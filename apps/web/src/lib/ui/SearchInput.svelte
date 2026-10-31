<script lang="ts">
  import { Icon, Input } from '@facile/muse';
  import { cn } from '@repo/utils';
  import { icons } from '$lib/icons';

  let {
    value = $bindable(''),
    placeholder = 'Rechercher...',
    class: className = '',
    oninput,
  }: {
    value?: string;
    placeholder?: string;
    class?: string;
    oninput?: () => void;
  } = $props();
</script>

<div class={cn('relative', className)}>
  <Icon
    icon={icons.search}
    size={16}
    class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fc-fg-muted"
  />
  <Input type="text" bind:value {placeholder} {oninput} aria-label={placeholder} class="pl-9" />
</div>
