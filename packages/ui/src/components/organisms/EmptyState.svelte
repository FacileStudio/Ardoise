<script lang="ts">
  import 'iconify-icon';
  export let title: string;
  export let description: string;
  export let icon: string = "solar:inbox-bold";
</script>

<div class="text-center py-16">
  <div class="flex flex-col items-center gap-4">
    <div class="rounded-lg border border-border p-3 text-muted-foreground">
      <iconify-icon {icon} width="32"></iconify-icon>
    </div>
    <h3 class="text-base font-semibold text-foreground">{title}</h3>
    <p class="text-sm text-muted-foreground max-w-md">{description}</p>
    <slot name="action" />
  </div>
</div>
