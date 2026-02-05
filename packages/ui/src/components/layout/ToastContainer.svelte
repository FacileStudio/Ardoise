<script lang="ts">
    import { toast } from '@repo/utils';
    import { flip } from 'svelte/animate';
    import { fly } from 'svelte/transition';
    import 'iconify-icon';

    const icons = {
        success: 'solar:check-circle-bold',
        error: 'solar:danger-circle-bold',
        info: 'solar:info-circle-bold',
        warning: 'solar:bell-bold'
    };

    const colors = {
        success: 'bg-white border-emerald-100 text-emerald-600 shadow-emerald-100/50',
        error: 'bg-white border-rose-100 text-rose-600 shadow-rose-100/50',
        info: 'bg-white border-indigo-100 text-indigo-600 shadow-indigo-100/50',
        warning: 'bg-white border-amber-100 text-amber-600 shadow-amber-100/50'
    };
</script>

<div class="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 w-full max-w-[320px]">
    {#each $toast as t (t.id)}
        <div
            animate:flip={{ duration: 300 }}
            in:fly={{ x: 50, duration: 400 }}
            out:fly={{ x: 50, duration: 300 }}
            class="flex items-center gap-4 p-4 rounded-[24px] border shadow-2xl {colors[t.type]}"
        >
            <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-50">
                <iconify-icon icon={icons[t.type]} width="24"></iconify-icon>
            </div>

            <div class="flex-1 min-w-0">
                <p class="text-[11px] font-black uppercase tracking-tight leading-tight italic line-clamp-2">
                    {t.message}
                </p>
            </div>

            <button
                on:click={() => toast.remove(t.id)}
                class="text-slate-300 hover:text-slate-900 transition-colors p-1"
                aria-label="Close notification"
            >
                <iconify-icon icon="solar:close-circle-bold" width="18"></iconify-icon>
            </button>
        </div>
    {/each}
</div>
