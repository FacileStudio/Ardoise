<script lang="ts">
  import { z } from 'zod';
  import { zod } from 'sveltekit-superforms/adapters';
  import { superForm, defaults } from 'sveltekit-superforms/client';
  import { toast } from '@repo/utils';
  import 'iconify-icon';

  import Button from '../atoms/Button.svelte';
  import ImageUpload from './ImageUpload.svelte';

  export let schema: z.ZodObject<z.ZodRawShape, "strip", z.ZodTypeAny>;
  export let initialData: Record<string, unknown> = {};
  export let onSubmit: (_data: Record<string, unknown>) => Promise<void>;
  export let submitLabel = "Enregistrer";
  export let getPresignedUrl: (_filename: string, _folder: string) => Promise<string> = async () => "";

  // @ts-expect-error - Type instantiation is excessively deep with dynamic schemas, but runtime behavior is correct
  const adapter = zod(schema);

  const { form, errors, constraints, enhance, delayed } = superForm(
    defaults(initialData, adapter),
    {
      validators: adapter,
      SPA: true,
      async onUpdate({ form }) {
        if (form.valid) {
          try {
            await onSubmit(form.data);
          } catch {
            toast.push("Erreur lors de la sauvegarde", "error");
          }
        }
      }
    }
  );

  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  const fields = Object.keys(shape);

  function getFieldType(fieldName: string) {
    const fieldSchema = shape[fieldName];
    const typeName = fieldSchema?._def?.typeName;

    if (fieldName.toLowerCase().includes('image')) return 'image';
    if (typeName === 'ZodNumber') return 'number';
    if (typeName === 'ZodBoolean') return 'checkbox';
    if (typeName === 'ZodEnum' || typeName === 'ZodNativeEnum') return 'select';

    return 'text';
  }

  function getEnumOptions(fieldName: string): string[] {
    const fieldSchema = shape[fieldName];
    const def = fieldSchema._def;

    if (def.typeName === 'ZodEnum') return def.values;
    if (def.typeName === 'ZodNativeEnum') return Object.values(def.values);
    return [];
  }
</script>

<form use:enhance class="space-y-6 rounded-xl border border-border bg-background p-6">
  <div class="grid grid-cols-1 gap-5">
    {#each fields as field (field)}
      {#if field !== 'id' && field !== 'createdAt' && field !== 'updatedAt'}
        <div class="flex flex-col gap-2">
          <label for={field} class="text-xs font-medium text-muted-foreground ml-1">
            {field}
          </label>

          {#if getFieldType(field) === 'image'}
            <ImageUpload bind:value={$form[field]} {getPresignedUrl} />

          {:else if getFieldType(field) === 'select'}
            <div class="relative flex items-center">
              <select
                id={field}
                bind:value={$form[field]}
                class="w-full h-9 px-3 rounded-lg border border-border bg-transparent text-sm font-medium text-foreground appearance-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
              >
                <option value="" disabled selected>Sélectionner une option</option>
                {#each getEnumOptions(field) as option (option)}
                  <option value={option}>{option}</option>
                {/each}
              </select>
              <div class="absolute right-3 pointer-events-none text-muted-foreground">
                <iconify-icon icon="solar:alt-arrow-down-bold" width="16"></iconify-icon>
              </div>
            </div>

          {:else if getFieldType(field) === 'checkbox'}
            <label class="flex items-center gap-3 cursor-pointer p-2">
              <input
                type="checkbox"
                id={field}
                bind:checked={$form[field]}
                class="w-5 h-5 rounded border-border text-foreground focus:ring-ring transition-all"
              />
              <span class="text-sm font-medium text-muted-foreground">Activer {field}</span>
            </label>

          {:else if getFieldType(field) === 'number'}
            <input
              type="number"
              id={field}
              bind:value={$form[field]}
              class="h-9 w-full px-3 rounded-lg border {$errors[field] ? 'border-destructive' : 'border-border'} bg-transparent text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
              {...$constraints[field]}
            />

          {:else}
            <input
              type="text"
              id={field}
              bind:value={$form[field]}
              class="h-9 w-full px-3 rounded-lg border {$errors[field] ? 'border-destructive' : 'border-border'} bg-transparent text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-all"
              {...$constraints[field]}
            />
          {/if}

          {#if $errors[field]}
            <span class="text-xs font-medium text-destructive ml-1">{$errors[field]}</span>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  <div class="pt-4">
    <Button type="submit" size="md" class="w-full" disabled={$delayed}>
      {#if $delayed}
        <iconify-icon icon="line-md:loading-twotone-loop" class="mr-2"></iconify-icon>
      {/if}
      {submitLabel}
    </Button>
  </div>
</form>

<style>
  select {
    background-image: none;
  }
</style>
