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
  export let onSubmit: (data: Record<string, unknown>) => Promise<void>;
  export let submitLabel = "Enregistrer";

  const adapter = zod(schema) as unknown;

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

  /**
   * Identifie le type d'input à afficher selon le schéma Zod
   */
  function getFieldType(fieldName: string) {
    const fieldSchema = shape[fieldName];
    const typeName = fieldSchema?._def?.typeName;

    if (fieldName.toLowerCase().includes('image')) return 'image';
    if (typeName === 'ZodNumber') return 'number';
    if (typeName === 'ZodBoolean') return 'checkbox';
    // Support des Enums classiques et Native Enums (Prisma)
    if (typeName === 'ZodEnum' || typeName === 'ZodNativeEnum') return 'select';

    return 'text';
  }

  /**
   * Extrait les options d'un ZodEnum ou ZodNativeEnum
   */
  function getEnumOptions(fieldName: string): string[] {
    const fieldSchema = shape[fieldName];
    const def = fieldSchema._def;

    if (def.typeName === 'ZodEnum') return def.values;
    if (def.typeName === 'ZodNativeEnum') return Object.values(def.values);
    return [];
  }
</script>

<form use:enhance class="space-y-6 bg-white p-8 rounded-[35px] border border-slate-100 shadow-sm">
  <div class="grid grid-cols-1 gap-5">
    {#each fields as field (field)}
      {#if field !== 'id' && field !== 'createdAt' && field !== 'updatedAt'}
        <div class="flex flex-col gap-2">
          <label for={field} class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
            {field}
          </label>

          {#if getFieldType(field) === 'image'}
            <ImageUpload bind:value={$form[field]} />

          {:else if getFieldType(field) === 'select'}
            <div class="relative flex items-center">
              <select
                id={field}
                bind:value={$form[field]}
                class="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-500 outline-none transition-all font-bold text-slate-700 appearance-none"
              >
                <option value="" disabled selected>Sélectionner une option</option>
                {#each getEnumOptions(field) as option (option)}
                  <option value={option}>{option}</option>
                {/each}
              </select>
              <div class="absolute right-5 pointer-events-none text-slate-400">
                <iconify-icon icon="solar:alt-arrow-down-bold" width="16"></iconify-icon>
              </div>
            </div>

          {:else if getFieldType(field) === 'checkbox'}
            <label class="flex items-center gap-3 cursor-pointer p-2">
              <input
                type="checkbox"
                id={field}
                bind:checked={$form[field]}
                class="w-6 h-6 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all"
              />
              <span class="text-xs font-bold text-slate-500 uppercase italic">Activer {field}</span>
            </label>

          {:else if getFieldType(field) === 'number'}
            <input
              type="number"
              id={field}
              bind:value={$form[field]}
              class="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 {$errors[field] ? 'border-rose-200' : 'border-transparent'} focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
              {...$constraints[field]}
            />

          {:else}
            <input
              type="text"
              id={field}
              bind:value={$form[field]}
              class="w-full px-5 py-3 rounded-2xl bg-slate-50 border-2 {$errors[field] ? 'border-rose-200' : 'border-transparent'} focus:border-indigo-500 outline-none transition-all font-bold text-slate-700"
              {...$constraints[field]}
            />
          {/if}

          {#if $errors[field]}
            <span class="text-[10px] font-bold text-rose-500 ml-2 italic">{$errors[field]}</span>
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
  /* Petit hack pour styliser proprement le select sur certains navigateurs */
  select {
    background-image: none;
  }
</style>
