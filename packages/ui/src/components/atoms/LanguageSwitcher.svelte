<script lang="ts">
  import { locale, setLocale } from '@repo/i18n/svelte';
  import 'iconify-icon';
  import { fade, scale } from 'svelte/transition';

  // Define languages with native names (Endonyms)
  const locales = [
    { code: 'en', label: 'English', native: 'English', flag: 'twemoji:flag-united-states' },
    { code: 'fr', label: 'French', native: 'Français', flag: 'twemoji:flag-france' },
    { code: 'de', label: 'German', native: 'Deutsch', flag: 'twemoji:flag-germany' },
    { code: 'es', label: 'Spanish', native: 'Español', flag: 'twemoji:flag-spain' },
  ] as const;

  let isOpen = $state(false);

  // Find the currently active locale object
  let currentLocale = $derived(locales.find((l) => l.code === $locale) || locales[0]);

  function handleSelect(code: string) {
    setLocale(code);
    isOpen = false;
  }
</script>

<div class="relative inline-block w-full sm:w-64">
  <button
    type="button"
    onclick={() => (isOpen = !isOpen)}
    class="flex items-center justify-between w-full px-4 py-3 bg-white border border-neutral-200 rounded-2xl shadow-sm hover:border-neutral-300 transition-all group"
    aria-haspopup="listbox"
    aria-expanded={isOpen}
  >
    <div class="flex items-center gap-3">
      <div class="flex shrink-0">
        <iconify-icon icon={currentLocale.flag} width="22"></iconify-icon>
      </div>
      <div class="flex flex-col items-start leading-tight">
        <span class="text-xs font-black uppercase tracking-wider text-neutral-400">Language</span>
        <span class="text-sm font-bold text-neutral-900">{currentLocale.native}</span>
      </div>
    </div>
    <iconify-icon
      icon="solar:alt-arrow-down-bold-duotone"
      class="text-neutral-400 transition-transform duration-300 {isOpen ? 'rotate-180' : ''}"
      width="20"
    ></iconify-icon>
  </button>

  {#if isOpen}
    <div
      in:scale={{ start: 0.95, duration: 150 }}
      out:fade={{ duration: 100 }}
      class="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-[24px] shadow-xl shadow-neutral-200/50 overflow-hidden p-1.5"
    >
      <div class="max-h-64 overflow-y-auto custom-scrollbar">
        {#each locales as lang (lang.code)}
          <button
            onclick={() => handleSelect(lang.code)}
            class="flex items-center justify-between w-full px-4 py-3 rounded-[18px] transition-all
            {$locale === lang.code
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-100'}"
          >
            <div class="flex items-center gap-3">
              <iconify-icon icon={lang.flag} width="20"></iconify-icon>
              <div class="flex flex-col items-start">
                <span class="text-sm font-bold">{lang.native}</span>
                {#if $locale !== lang.code}
                  <span class="text-[10px] opacity-60 uppercase font-black tracking-tighter"
                    >{lang.label}</span
                  >
                {/if}
              </div>
            </div>

            {#if $locale === lang.code}
              <iconify-icon icon="solar:check-circle-bold" width="20"></iconify-icon>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div
      class="fixed inset-0 z-40 bg-transparent"
      role="button"
      tabindex="-1"
      onclick={() => (isOpen = false)}
      onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
      aria-label="Close language selector"
    ></div>
  {/if}
</div>

<style>
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e5e5e5;
    border-radius: 10px;
  }
</style>
