<script lang="ts">
	import { Modal } from '@facile/muse';

	interface Props {
		show: boolean;
		pdfBase64: string;
		title?: string;
		onclose: () => void;
	}

	let { show = $bindable(), pdfBase64, title = 'Aperçu du document', onclose }: Props = $props();
</script>

<Modal bind:open={show} {title} showClose onClose={onclose} class="max-w-6xl">
	<iframe
		src="data:application/pdf;base64,{pdfBase64}"
		class="h-[75dvh] w-full bg-fc-surface"
		title="Aperçu PDF"
	></iframe>
</Modal>
