<script lang="ts">
  import type { EntityConfig } from '@repo/admin';
  import { cn } from '@repo/utils';
  import Toggle from '../../components/atoms/Toggle.svelte';
  import 'iconify-icon';

  let {
    config,
    data = {},
    onSubmit,
    onCancel,
    mode = 'create',
    class: className = '',
  }: {
    config: EntityConfig;
    data?: Record<string, unknown>;
    onSubmit: (_data: Record<string, unknown>) => void;
    onCancel: () => void;
    mode?: 'create' | 'edit';
    class?: string;
  } = $props();

  let formData = $derived.by(() => ({ ...data }));
  let errors = $state<Record<string, string>>({});
  let isSubmitting = $state(false);

  function handleSubmit(e: Event) {
    e.preventDefault();
    errors = {};

    config.fields.forEach((field) => {
      if (field.required && !formData[field.name]) {
        errors[field.name] = `${field.label} is required`;
      }
    });

    if (Object.keys(errors).length > 0) return;

    isSubmitting = true;
    onSubmit(formData);
  }

  const getIcon = (type: string) => {
    const icons: Record<string, string> = {
      string: 'solar:pen-new-square-linear',
      email: 'solar:letter-linear',
      number: 'solar:hashtag-linear',
      boolean: 'solar:check-circle-linear',
      date: 'solar:calendar-minimalistic-linear',
      select: 'solar:list-arrow-down-linear',
      json: 'solar:code-circle-linear',
    };
    return icons[type] || icons.string;
  };
</script>

<form onsubmit={handleSubmit} class={cn('space-y-8 bg-white p-6 rounded-3xl', className)}>
  <div class="border-b border-neutral-100 pb-4">
    <h3 class="text-lg font-bold text-neutral-900 capitalize">{mode} {config.name}</h3>
    <p class="text-xs text-neutral-400">Fill in the information below.</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
    {#each config.fields as field (field.name)}
      <div class="flex flex-col gap-2 {field.type === 'json' ? 'md:col-span-2' : ''}">
        <label
          for={field.name}
          class="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-neutral-400"
        >
          <iconify-icon icon={getIcon(field.type)} width="16" class="text-neutral-300"
          ></iconify-icon>
          {field.label}
          {#if field.required}<span class="text-red-400">*</span>{/if}
        </label>

        <div class="relative">
          {#if field.type === 'boolean'}
            <div class="flex items-center h-11 px-1">
              <Toggle bind:checked={formData[field.name] as boolean} size="md" />
              <span class="ml-3 text-sm font-medium text-neutral-600">Enable {field.label}</span>
            </div>
          {:else if field.type === 'select'}
            <select
              id={field.name}
              bind:value={formData[field.name]}
              disabled={isSubmitting}
              class="w-full h-11 px-4 bg-neutral-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-black transition-all appearance-none"
            >
              <option value="">Select {field.label}...</option>
              {#each field.options || [] as opt (opt.value)}
                <option value={opt.value}>{opt.label}</option>
              {/each}
            </select>
            <iconify-icon
              icon="solar:alt-arrow-down-linear"
              class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400"
              width="18"
            ></iconify-icon>
          {:else if field.type === 'json'}
            <textarea
              id={field.name}
              bind:value={formData[field.name]}
              rows="4"
              class="w-full p-4 bg-neutral-50 border-none rounded-2xl text-sm font-mono focus:ring-2 focus:ring-black transition-all"
              placeholder={`{"key": "value"}`}
            ></textarea>
          {:else}
            <input
              id={field.name}
              type={field.type === 'email'
                ? 'email'
                : field.type === 'number'
                  ? 'number'
                  : field.type === 'date'
                    ? 'date'
                    : 'text'}
              bind:value={formData[field.name]}
              disabled={isSubmitting}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              class={cn(
                'w-full h-11 px-4 bg-neutral-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-black transition-all',
                errors[field.name] && 'ring-2 ring-red-100 bg-red-50/30'
              )}
            />
          {/if}
        </div>

        {#if errors[field.name]}
          <span class="text-[10px] font-bold text-red-500 flex items-center gap-1 px-1">
            <iconify-icon icon="solar:danger-circle-bold" width="12"></iconify-icon>
            {errors[field.name]}
          </span>
        {/if}
      </div>
    {/each}
  </div>

  <div class="flex items-center justify-end gap-3 pt-6 border-top border-neutral-100">
    <button
      type="button"
      onclick={onCancel}
      class="h-11 px-6 rounded-2xl text-sm font-bold text-neutral-500 hover:bg-neutral-100 transition-all"
    >
      Cancel
    </button>

    <button
      type="submit"
      disabled={isSubmitting}
      class="h-11 px-8 rounded-2xl bg-black text-white text-sm font-bold shadow-lg shadow-black/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
    >
      {#if isSubmitting}
        <iconify-icon icon="line-md:loading-twotone-loop" width="18"></iconify-icon>
        Saving...
      {:else}
        <iconify-icon
          icon={mode === 'create' ? 'solar:add-circle-bold' : 'solar:check-circle-bold'}
          width="18"
        ></iconify-icon>
        {mode === 'create' ? 'Create' : 'Update'}
      {/if}
    </button>
  </div>
</form>
