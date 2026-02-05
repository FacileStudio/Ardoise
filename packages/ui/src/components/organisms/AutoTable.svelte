<script lang="ts">
    import { downloadCSV, toast } from '@repo/utils';
    import 'iconify-icon';

    export let entityName: string;
    export let data: unknown[];

    function handleExport() {
        try {
            downloadCSV(data, `export-${entityName}-${new Date().toISOString().split('T')[0]}`);
            toast.push("Export réussi !", "success");
        } catch (_e) {
            toast.push("Erreur lors de l'export", "error");
        }
    }
</script>

<div class="flex justify-between items-center mb-6">
    <h2 class="text-xl font-black italic uppercase tracking-tighter">Gestion {entityName}</h2>

    <button
        on:click={handleExport}
        class="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-black text-xs hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
    >
        <iconify-icon icon="solar:file-download-bold" width="18"></iconify-icon>
        EXPORTER CSV
    </button>
</div>
