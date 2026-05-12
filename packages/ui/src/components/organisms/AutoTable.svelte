<script lang="ts">
    import { downloadCSV, toast } from '@repo/utils';
    import 'iconify-icon';

    export let entityName: string;
    export let data: unknown[];

    function handleExport() {
        downloadCSV(data, `export-${entityName}-${new Date().toISOString().split('T')[0]}`);
        toast.push("Export réussi !", "success");
    }
</script>

<div class="flex justify-between items-center mb-6">
    <h2 class="text-lg font-semibold text-foreground">Gestion {entityName}</h2>

    <button
        on:click={handleExport}
        class="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
    >
        <iconify-icon icon="solar:file-download-bold" width="16"></iconify-icon>
        Exporter CSV
    </button>
</div>
