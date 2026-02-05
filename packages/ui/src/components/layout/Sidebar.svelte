<script lang="ts">
  import 'iconify-icon';
  export let items: { label: string, icon: string, href: string }[] = [];
  export let activeHref = "/";
</script>

<aside class="w-72 h-screen sticky top-0 bg-slate-50 border-r border-slate-100 p-6 flex flex-col">
  <div class="mb-12 px-4">
    <h1 class="text-2xl font-black italic tracking-tighter uppercase text-indigo-600">
      Admin<span class="text-slate-900">Panel</span>
    </h1>
  </div>

  <nav class="flex-1 space-y-2">
    {#each items as item}
      <a
        href={item.href}
        class="flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all
        {activeHref === item.href ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-100/50'}"
      >
        <iconify-icon icon={item.icon} width="24"></iconify-icon>
        <span class="uppercase tracking-tight text-xs">{item.label}</span>
      </a>
    {/each}
  </nav>

  <div class="mt-auto p-4 bg-white rounded-[28px] border border-slate-100 flex items-center gap-3 shadow-sm">
    <div class="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 overflow-hidden">
       <slot name="user-avatar" />
    </div>
    <div class="flex-1 min-w-0">
      <p class="text-[10px] font-black uppercase text-slate-900 truncate"><slot name="user-name" /></p>
      <p class="text-[9px] font-bold text-slate-400 uppercase italic">Administrateur</p>
    </div>
  </div>
</aside>
