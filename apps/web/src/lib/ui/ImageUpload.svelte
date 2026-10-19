<script lang="ts">
    import { uploadFileSimple } from '@repo/storage-client';
    import { toast } from '@facile/muse';
    import { logger } from '@repo/logger';
    import 'iconify-icon';

    type TrpcClient = {
        media: {
            getDownloadUrl: {
                query: (params: { url: string }) => Promise<{ url: string }>;
            };
        };
    };

    interface Props {
        value: string;
        label?: string;
        trpc?: TrpcClient;
        getPresignedUrl: (_filename: string, _folder: string) => Promise<string>;
    }

    let { value = $bindable(""), label = "Image de couverture", trpc = undefined, getPresignedUrl }: Props = $props();

    let uploading = $state(false);
    let previewUrl = $state(value);
    let fileInput: HTMLInputElement;

    function needsSignedUrl(url: string) {
        return url.includes('storageapi.dev') || url.includes('/storage/');
    }

    async function loadPresignedPreview() {
        if (!value || !needsSignedUrl(value) || !trpc) {
            previewUrl = value;
            return;
        }

        try {
            const result = await trpc.media.getDownloadUrl.query({ url: value });
            previewUrl = result.url;
        } catch (err) {
            logger.error({ err }, 'Failed to load presigned URL for preview');
            previewUrl = value;
        }
    }

    $effect(() => {
        loadPresignedPreview();
    });

    async function handleFileChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        previewUrl = URL.createObjectURL(file);
        uploading = true;

        try {
            const presignedUrl = await getPresignedUrl(file.name, "uploads");
            const finalUrl = await uploadFileSimple(file, presignedUrl);

            value = finalUrl;
            toast.success("Image envoyée !");
        } catch (error) {
            logger.error({ err: error }, "Image upload failed");
            toast.danger("Erreur lors de l'upload");
            previewUrl = value;
        } finally {
            uploading = false;
        }
    }
</script>

<div class="flex flex-col gap-2 w-full max-w-md">
    <span class="text-xs font-medium text-muted-foreground ml-1">
        {label}
    </span>

    <div
        class="relative h-48 w-full rounded-xl border-2 border-dashed border-border bg-muted/50 overflow-hidden group hover:border-foreground/50 transition-all"
    >
        {#if previewUrl}
            <img
                src={previewUrl}
                alt="Preview"
                class="w-full h-full object-contain {uploading ? 'opacity-40 blur-sm' : ''}"
            />
        {:else}
            <div class="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
                <iconify-icon icon="solar:cloud-upload-bold-duotone" width="40"></iconify-icon>
                <p class="text-xs font-medium">Cliquez pour uploader</p>
            </div>
        {/if}

        {#if uploading}
            <div class="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
                <iconify-icon icon="line-md:loading-twotone-loop" width="32" class="text-foreground"></iconify-icon>
            </div>
        {/if}

        {#if previewUrl && !uploading}
            <button
                type="button"
                onclick={(e) => { e.preventDefault(); value = ""; previewUrl = ""; }}
                class="absolute top-3 right-3 bg-background/90 backdrop-blur-sm p-2 rounded-lg border border-border text-destructive shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
            >
                <iconify-icon icon="solar:trash-bin-trash-bold" width="18"></iconify-icon>
            </button>
        {/if}

        <input
            type="file"
            bind:this={fileInput}
            onchange={handleFileChange}
            accept="image/*"
            class="absolute inset-0 opacity-0 cursor-pointer"
        />
    </div>
</div>
