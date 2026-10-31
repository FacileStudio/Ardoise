<script lang="ts">
    import { uploadFileSimple } from '@repo/storage-client';
    import { Button, Dropzone, Spinner, toast } from '@facile/muse';
    import { icons } from '$lib/icons';
    import { logger } from '@repo/logger';

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

    async function handleFiles(files: File[]) {
        const file = files[0];
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

<div class="flex w-full max-w-md flex-col gap-2">
    {#if label}
        <span class="text-fc-sm font-medium text-fc-fg">{label}</span>
    {/if}

    {#if previewUrl}
        <div class="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-fc-md bg-fc-surface">
            <img
                src={previewUrl}
                alt="Aperçu"
                class="h-full w-full object-contain {uploading ? 'opacity-40' : ''}"
            />
            {#if uploading}
                <div class="absolute inset-0 flex items-center justify-center">
                    <Spinner size="lg" />
                </div>
            {/if}
        </div>
        {#if !uploading}
            <div>
                <Button
                    type="button"
                    variant="ghost-danger"
                    size="sm"
                    icon={icons.remove}
                    onclick={() => { value = ""; previewUrl = ""; }}
                >
                    Retirer l'image
                </Button>
            </div>
        {/if}
    {/if}

    <Dropzone
        accept="image/*"
        disabled={uploading}
        label={previewUrl ? "Déposez une autre image" : "Déposez une image ici"}
        onFiles={handleFiles}
    />
</div>
