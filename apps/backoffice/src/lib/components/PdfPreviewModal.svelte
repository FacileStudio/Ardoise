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
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
			<div class="flex justify-between items-center p-4 border-b">
				<h2 class="text-xl font-bold">{title}</h2>
				<button onclick={onclose} class="text-gray-500 hover:text-gray-700">
					<iconify-icon icon="mdi:close" width="24"></iconify-icon>
				</button>
			</div>
			<div class="flex-1 overflow-auto p-4">
				<iframe
					src="data:application/pdf;base64,{pdfBase64}"
					class="w-full h-full"
					title="PDF Preview"
				></iframe>
			</div>
		</div>
	</div>
{/if}
