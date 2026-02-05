<script lang="ts">
  import Button from '../atoms/Button.svelte';
  import 'iconify-icon';
  export let title: string;
  export let description: string;
  export let icon: string = "solar: Hodgson-bold";
</script>

<div class="flex flex-col items-center justify-center p-12 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-100 text-center">
  <div class="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400 mb-4">
    <iconify-icon {icon} width="32"></iconify-icon>
  </div>
  <h3 class="font-black uppercase tracking-tighter text-slate-900 italic text-lg">{title}</h3>
  <p class="text-xs font-bold text-slate-400 uppercase italic max-w-[200px] mb-6">{description}</p>
  <slot name="action" />
</div>
