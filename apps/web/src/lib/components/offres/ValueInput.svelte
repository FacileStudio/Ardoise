<script lang="ts">
  import { Input, Switch } from '@facile/muse';

  let {
    kind,
    value = $bindable(),
    label,
    unit = null,
    disabled = false,
  }: {
    kind: 'bool' | 'limit';
    value: string | boolean;
    label: string;
    unit?: string | null;
    disabled?: boolean;
  } = $props();
</script>

{#if kind === 'bool'}
  <Switch
    bind:checked={() => value === true, (next) => (value = next)}
    {disabled}
    label={value === true ? 'Oui' : 'Non'}
    aria-label={label}
  />
{:else}
  <div class="flex items-center gap-2">
    <Input
      bind:value={() => (typeof value === 'string' ? value : ''), (next) => (value = String(next))}
      {disabled}
      inputmode="numeric"
      placeholder="-1 = illimité"
      aria-label={label}
      class="w-32"
    />
    {#if unit}<span class="text-fc-sm text-fc-fg-muted">{unit}</span>{/if}
  </div>
{/if}
