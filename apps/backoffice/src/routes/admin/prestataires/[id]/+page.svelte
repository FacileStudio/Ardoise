<script lang="ts">
	import { trpc } from '$lib/trpc';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { Spinner, Badge, Card } from '@repo/ui';
	import { logger } from '@repo/logger';
	import 'iconify-icon';

	let providerId = $derived($page.params.id);
	let pageLoading = $state(true);
	let provider: any = $state(null);

	onMount(async () => {
		await fetchProvider();
	});

	async function fetchProvider() {
		pageLoading = true;
		try {
			provider = await trpc.provider.get.query({ id: providerId });
		} catch (err) {
			logger.error({ err }, 'Failed to fetch provider');
		} finally {
			pageLoading = false;
		}
	}

	function formatDate(date: Date | string | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		}).format(new Date(date));
	}

	function formatDateShort(date: Date | string | null) {
		if (!date) return '-';
		return new Intl.DateTimeFormat('fr-FR', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		}).format(new Date(date));
	}
</script>

<div class="p-8 max-w-[1400px] mx-auto space-y-6">
	{#if pageLoading}
		<div class="py-20 flex justify-center">
			<Spinner size="xl" />
		</div>
	{:else if provider}
		<header class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<button
					onclick={() => goto('/admin/prestataires')}
					class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
					title="Back to providers"
				>
					<iconify-icon icon="solar:arrow-left-bold" width="24"></iconify-icon>
				</button>
				<div>
					<h1 class="text-3xl font-black text-slate-900 tracking-tighter">
						{provider.name}
					</h1>
					{#if provider.legalName}
						<p class="text-slate-500 text-sm mt-1">{provider.legalName}</p>
					{/if}
				</div>
			</div>
		</header>

		<div class="grid grid-cols-3 gap-6">
			<div class="col-span-2 space-y-6">
				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-6">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
								<iconify-icon icon="solar:buildings-2-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Provider Information</h2>
								<p class="text-sm text-slate-500">Company details</p>
							</div>
						</div>

						<div class="space-y-4">
							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">Provider Name</div>
								<div class="text-lg font-bold text-slate-900">{provider.name}</div>
							</div>

							{#if provider.legalName}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Legal Name</div>
									<div class="text-sm text-slate-700">{provider.legalName}</div>
								</div>
							{/if}

							{#if provider.siret}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">SIRET</div>
									<div class="font-mono text-sm text-slate-700">{provider.siret}</div>
								</div>
							{/if}

							{#if provider.address || provider.city || provider.country}
								<div>
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Address</div>
									<div class="text-sm text-slate-600">
										{#if provider.address}
											<div>{provider.address}</div>
										{/if}
										{#if provider.city}
											<div>{provider.city}</div>
										{/if}
										<div>{provider.country}</div>
									</div>
								</div>
							{/if}

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-2">VAT Rate</div>
								<div class="text-lg font-black text-[#291334]">{provider.tvaRate}%</div>
							</div>
						</div>
					</div>
				</Card>

				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-6">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
								<iconify-icon icon="solar:user-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Contact</h2>
								<p class="text-sm text-slate-500">Contact information</p>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-4">
							{#if provider.email}
								<div class="col-span-2">
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Email</div>
									<div class="font-bold text-slate-900">{provider.email}</div>
								</div>
							{/if}

							{#if provider.phone}
								<div class="col-span-2">
									<div class="text-xs font-black uppercase text-slate-400 mb-2">Phone</div>
									<div class="font-bold text-slate-900">{provider.phone}</div>
								</div>
							{/if}

							{#if !provider.email && !provider.phone}
								<div class="col-span-2 text-sm text-slate-500 italic">
									No contact information available
								</div>
							{/if}
						</div>
					</div>
				</Card>

				{#if provider.bankName || provider.iban || provider.bic}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-6">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
									<iconify-icon icon="solar:card-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Bank Details</h2>
									<p class="text-sm text-slate-500">Payment information</p>
								</div>
							</div>

							<div class="space-y-4">
								{#if provider.bankName}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-2">Bank</div>
										<div class="font-bold text-slate-900">{provider.bankName}</div>
									</div>
								{/if}

								{#if provider.iban}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-2">IBAN</div>
										<div class="font-mono text-sm text-slate-700 bg-slate-50 p-2 rounded-lg break-all">
											{provider.iban}
										</div>
									</div>
								{/if}

								{#if provider.bic}
									<div>
										<div class="text-xs font-black uppercase text-slate-400 mb-2">BIC</div>
										<div class="font-mono text-sm text-slate-700">{provider.bic}</div>
									</div>
								{/if}
							</div>
						</div>
					</Card>
				{/if}

				{#if provider.documents && provider.documents.length > 0}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-[#FEC129]/10 flex items-center justify-center text-[#FEC129]">
									<iconify-icon icon="solar:document-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Documents</h2>
									<p class="text-sm text-slate-500">{provider.documents.length} {provider.documents.length > 1 ? 'documents' : 'document'}</p>
								</div>
							</div>

							<div class="space-y-3">
								{#each provider.documents as document (document.id)}
									<div class="flex items-center gap-4 p-4 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl border border-slate-200 hover:border-[#FEC129] transition-all cursor-pointer" onclick={() => goto(`/admin/documents/${document.id}`)}>
										<div class="p-3 bg-white rounded-xl shadow-sm">
											<iconify-icon
												icon="solar:document-bold"
												width="24"
												class="text-[#291334]"
											></iconify-icon>
										</div>
										<div class="flex-1">
											<div class="flex items-center justify-between mb-1">
												<span class="text-lg font-black text-slate-900">{document.documentNumber || 'Document'}</span>
											</div>
											<div class="text-xs text-slate-500">
												Created: {formatDateShort(document.createdAt)}
											</div>
										</div>
										<div class="p-2 text-[#291334]">
											<iconify-icon icon="solar:eye-bold" width="18"></iconify-icon>
										</div>
									</div>
								{/each}
							</div>
						</div>
					</Card>
				{/if}
			</div>

			<div class="space-y-6">
				<Card padding="lg" rounded="lg" shadow="md">
					<div class="space-y-4">
						<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
							<div class="w-12 h-12 rounded-2xl bg-[#291334]/10 flex items-center justify-center text-[#291334]">
								<iconify-icon icon="solar:calendar-bold" width="24"></iconify-icon>
							</div>
							<div>
								<h2 class="text-xl font-black text-[#291334]">Dates</h2>
							</div>
						</div>

						<div class="space-y-3">
							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-1">Created</div>
								<div class="text-sm text-slate-700">{formatDate(provider.createdAt)}</div>
							</div>

							<div>
								<div class="text-xs font-black uppercase text-slate-400 mb-1">Last Updated</div>
								<div class="text-sm text-slate-700">{formatDate(provider.updatedAt)}</div>
							</div>
						</div>
					</div>
				</Card>

				{#if provider.logoUrl}
					<Card padding="lg" rounded="lg" shadow="md">
						<div class="space-y-4">
							<div class="flex items-center gap-3 pb-4 border-b border-slate-100">
								<div class="w-12 h-12 rounded-2xl bg-[#FEC129]/10 flex items-center justify-center text-[#FEC129]">
									<iconify-icon icon="solar:gallery-bold" width="24"></iconify-icon>
								</div>
								<div>
									<h2 class="text-xl font-black text-[#291334]">Logo</h2>
								</div>
							</div>

							<div class="bg-slate-50 rounded-xl p-4 flex items-center justify-center">
								<img src={provider.logoUrl} alt={provider.name} class="max-w-full max-h-32 object-contain" />
							</div>
						</div>
					</Card>
				{/if}
			</div>
		</div>
	{:else}
		<div class="text-center py-20">
			<iconify-icon icon="solar:buildings-2-bold" width="64" class="text-slate-300"></iconify-icon>
			<h2 class="text-2xl font-black text-slate-900 mt-4">Provider not found</h2>
			<p class="text-slate-500 mt-2">This provider does not exist or has been deleted.</p>
			<button
				onclick={() => goto('/admin/prestataires')}
				class="mt-6 px-6 py-3 bg-[#291334] text-white rounded-xl font-bold hover:shadow-lg transition-all"
			>
				Back to providers
			</button>
		</div>
	{/if}
</div>
