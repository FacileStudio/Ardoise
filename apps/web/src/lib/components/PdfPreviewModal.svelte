<script lang="ts">
	interface Props {
		show: boolean;
		pdfBase64: string;
		title?: string;
		onclose: () => void;
	}

	let { show = $bindable(), pdfBase64, title = 'Aperçu du document', onclose }: Props = $props();
</script>

{#if show}
	<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
		<div class="rounded-xl border border-border bg-background shadow-lg w-full max-w-6xl h-[90vh] flex flex-col">
			<div class="flex justify-between items-center px-4 py-3 border-b border-border">
				<h2 class="text-sm font-medium text-foreground">{title}</h2>
				<button onclick={onclose} class="text-muted-foreground hover:bg-muted rounded-md p-1.5 transition-colors" aria-label="Fermer l'aperçu">
					<iconify-icon icon="mdi:close" width="20"></iconify-icon>
				</button>
			</div>
			<div class="flex-1 overflow-auto p-4">
				<iframe
					src="data:application/pdf;base64,{pdfBase64}"
					class="w-full h-full rounded-lg"
					title="PDF Preview"
				></iframe>
			</div>
		</div>
	</div>
{/if}
