<script lang="ts">
    import { locale, setLocale } from '@repo/i18n/svelte';
    import 'iconify-icon';

    const locales = [
        { code: 'en' as const, label: 'English', flag: 'twemoji:flag-united-states' },
        { code: 'fr' as const, label: 'Français', flag: 'twemoji:flag-france' }
    ];
</script>

<div class="flex items-center gap-2">
    {#each locales as localeOption}
        <button
            on:click={() => setLocale(localeOption.code)}
            class="flex items-center gap-2 px-3 py-2 rounded-lg transition-all {$locale === localeOption.code
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}"
            aria-label={`Switch to ${localeOption.label}`}
        >
            <iconify-icon icon={localeOption.flag} width="20"></iconify-icon>
            <span class="text-sm font-medium">{localeOption.label}</span>
        </button>
    {/each}
</div>
