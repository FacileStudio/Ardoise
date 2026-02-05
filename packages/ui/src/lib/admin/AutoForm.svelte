<script lang="ts">
  import type { EntityConfig, FieldConfig } from '@repo/admin';
  import 'iconify-icon';

  export let config: EntityConfig;
  export let data: any = {};
  export let onSubmit: (data: any) => void;
  export let onCancel: () => void;
  export let mode: 'create' | 'edit' = 'create';

  let formData: any = { ...data };
  let errors: Record<string, string> = {};
  let isSubmitting = false;

  function handleSubmit(e: Event) {
    e.preventDefault();
    errors = {};

    for (const field of config.fields) {
      if (field.required && !formData[field.name]) {
        errors[field.name] = `${field.label} is required`;
      }
    }

    if (Object.keys(errors).length > 0) {
      return;
    }

    isSubmitting = true;
    onSubmit(formData);
  }

  function renderField(field: FieldConfig) {
    const value = formData[field.name] ?? '';
    const error = errors[field.name];

    return { field, value, error };
  }

  function getFieldIcon(type: string): string {
    const iconMap: Record<string, string> = {
      string: 'heroicons:pencil',
      email: 'heroicons:envelope',
      number: 'heroicons:hashtag',
      boolean: 'heroicons:check-circle',
      date: 'heroicons:calendar',
      select: 'heroicons:chevron-down',
      json: 'heroicons:code-bracket',
    };
    return iconMap[type] || 'heroicons:pencil';
  }
</script>

<div class="auto-form">
  <form onsubmit={handleSubmit}>
    <div class="form-fields">
      {#each config.fields as field}
        {@const { error } = renderField(field)}
        <div class="form-field" class:has-error={error}>
          <label for={field.name} class="field-label">
            <iconify-icon icon={getFieldIcon(field.type)} width="18" class="field-icon"></iconify-icon>
            <span class="label-text">
              {field.label}
              {#if field.required}<span class="required">*</span>{/if}
            </span>
          </label>

          <div class="input-wrapper">
            {#if field.type === 'string' || field.type === 'email'}
              <input
                id={field.name}
                type={field.type === 'email' ? 'email' : 'text'}
                bind:value={formData[field.name]}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                required={field.required}
                class:error={error}
                disabled={isSubmitting}
              />
            {:else if field.type === 'number'}
              <input
                id={field.name}
                type="number"
                bind:value={formData[field.name]}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                required={field.required}
                class:error={error}
                disabled={isSubmitting}
              />
            {:else if field.type === 'boolean'}
              <label class="checkbox-wrapper">
                <input
                  id={field.name}
                  type="checkbox"
                  bind:checked={formData[field.name]}
                  disabled={isSubmitting}
                  class="checkbox-input"
                />
                <span class="checkbox-label">
                  <span class="checkbox-box">
                    {#if formData[field.name]}
                      <iconify-icon icon="heroicons:check" width="14"></iconify-icon>
                    {/if}
                  </span>
                  <span class="checkbox-text">Enable {field.label}</span>
                </span>
              </label>
            {:else if field.type === 'date'}
              <input
                id={field.name}
                type="date"
                bind:value={formData[field.name]}
                required={field.required}
                class:error={error}
                disabled={isSubmitting}
              />
            {:else if field.type === 'select'}
              <div class="select-wrapper">
                <select
                  id={field.name}
                  bind:value={formData[field.name]}
                  required={field.required}
                  class:error={error}
                  disabled={isSubmitting}
                >
                  <option value="">Select {field.label}</option>
                  {#each field.options || [] as option}
                    <option value={option.value}>{option.label}</option>
                  {/each}
                </select>
                <iconify-icon icon="heroicons:chevron-down" width="20" class="select-arrow"></iconify-icon>
              </div>
            {:else if field.type === 'json'}
              <textarea
                id={field.name}
                bind:value={formData[field.name]}
                placeholder={field.placeholder || 'Enter JSON object'}
                required={field.required}
                class:error={error}
                disabled={isSubmitting}
                rows="5"
              ></textarea>
            {/if}

            {#if error}
              <div class="error-message">
                <iconify-icon icon="heroicons:exclamation-circle" width="16"></iconify-icon>
                <span>{error}</span>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    <div class="form-actions">
      <button type="button" class="btn-cancel" onclick={onCancel} disabled={isSubmitting}>
        <iconify-icon icon="heroicons:x-mark" width="20"></iconify-icon>
        <span>Cancel</span>
      </button>
      <button type="submit" class="btn-submit" disabled={isSubmitting}>
        {#if isSubmitting}
          <iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
          <span>Saving...</span>
        {:else}
          <iconify-icon icon={mode === 'create' ? 'heroicons:plus-circle' : 'heroicons:check-circle'} width="20"></iconify-icon>
          <span>{mode === 'create' ? 'Create' : 'Update'}</span>
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .auto-form {
    background: white;
  }

  form {
    display: flex;
    flex-direction: column;
  }

  .form-fields {
    display: grid;
    gap: 1.75rem;
    padding: 0.5rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .field-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
  }

  .field-icon {
    color: #6366f1;
  }

  .label-text {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .required {
    color: #ef4444;
    font-size: 1rem;
  }

  .input-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  input[type='text'],
  input[type='email'],
  input[type='number'],
  input[type='date'],
  select,
  textarea {
    padding: 0.75rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.9375rem;
    transition: all 0.2s;
    background: white;
  }

  input:focus,
  select:focus,
  textarea:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  input:disabled,
  select:disabled,
  textarea:disabled {
    background: #f9fafb;
    cursor: not-allowed;
    opacity: 0.6;
  }

  input.error,
  select.error,
  textarea.error {
    border-color: #ef4444;
  }

  .select-wrapper {
    position: relative;
  }

  .select-arrow {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: #6b7280;
  }

  select {
    appearance: none;
    padding-right: 2.5rem;
  }

  .checkbox-wrapper {
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .checkbox-input {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .checkbox-box {
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid #d1d5db;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
    background: white;
  }

  .checkbox-input:checked + .checkbox-label .checkbox-box {
    background: #6366f1;
    border-color: #6366f1;
    color: white;
  }

  .checkbox-input:focus + .checkbox-label .checkbox-box {
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .checkbox-text {
    font-size: 0.9375rem;
    color: #374151;
  }

  textarea {
    font-family: 'Courier New', monospace;
    resize: vertical;
    min-height: 120px;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    color: #ef4444;
    font-size: 0.8125rem;
    font-weight: 500;
  }

  .has-error input,
  .has-error select,
  .has-error textarea {
    border-color: #ef4444;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 2px solid #f3f4f6;
  }

  button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0.9375rem;
    font-weight: 600;
    transition: all 0.2s;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-cancel {
    background: #f3f4f6;
    color: #4b5563;
    border: 1px solid #e5e7eb;
  }

  .btn-cancel:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .btn-submit {
    background: linear-gradient(to bottom right, #6366f1, #8b5cf6);
    color: white;
    box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
  }

  .btn-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(99, 102, 241, 0.3);
  }

  .btn-submit:active:not(:disabled) {
    transform: translateY(0);
  }
</style>
