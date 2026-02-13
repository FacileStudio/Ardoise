<script lang="ts">
  import 'iconify-icon';
  export let title: string;
  export let description: string;
  export let icon: string = "solar:inbox-bold";
</script>

<div class="text-center py-16">
  <div class="flex flex-col items-center gap-4">
    <div class="w-20 h-20 bg-[#FEC129]/20 text-[#291334] rounded-2xl flex items-center justify-center">
      <iconify-icon {icon} width="40"></iconify-icon>
    </div>
    <h3 class="text-2xl font-black text-[#291334]">{title}</h3>
    <p class="text-[#291334]/60 max-w-md">{description}</p>
    <slot name="action" />
  </div>
</div>
