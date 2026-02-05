<script lang="ts">
    import { uploadFileSimple } from '@repo/storage-client';
    import { toast } from '@repo/utils';
    import { logger } from '@repo/logger';
    import 'iconify-icon';

    export let value: string = "";
    export let label = "Image de couverture";
    export let folder = "uploads";

    export let getPresignedUrl: (filename: string, folder: string) => Promise<string>;

    let uploading = false;
    let previewUrl = value;
    let fileInput: HTMLInputElement;

    async function handleFileChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        previewUrl = URL.createObjectURL(file);
        uploading = true;

        try {
            const presignedUrl = await getPresignedUrl(file.name, folder);
            const finalUrl = await uploadFileSimple(file, presignedUrl);

            value = finalUrl;
            toast.push("Image envoyée !", "success");
        } catch (error) {
            logger.error({ err: error }, "Image upload failed");
            toast.push("Erreur lors de l'upload", "error");
            previewUrl = value;
        } finally {
            uploading = false;
        }
    }
</script>

<div class="flex flex-col gap-2 w-full">
    <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">
        {label}
    </span>

    <div
        class="relative h-48 w-full rounded-[32px] border-2 border-dashed border-slate-100 bg-slate-50/50 overflow-hidden group hover:border-indigo-200 transition-all"
    >
        {#if previewUrl}
            <img
                src={previewUrl}
                alt="Preview"
                class="w-full h-full object-cover {uploading ? 'opacity-40 blur-sm' : ''}"
            />
        {:else}
            <div class="flex flex-col items-center justify-center h-full gap-2 text-slate-400">
                <iconify-icon icon="solar:cloud-upload-bold-duotone" width="40"></iconify-icon>
                <p class="text-[10px] font-black uppercase italic">Cliquez pour uploader</p>
            </div>
        {/if}

        {#if uploading}
            <div class="absolute inset-0 flex items-center justify-center bg-white/20 backdrop-blur-sm">
                <iconify-icon icon="line-md:loading-twotone-loop" width="32" class="text-indigo-600"></iconify-icon>
            </div>
        {/if}

        {#if previewUrl && !uploading}
            <button
                type="button"
                on:click|preventDefault={() => { value = ""; previewUrl = ""; }}
                class="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full text-rose-500 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove image"
            >
                <iconify-icon icon="solar:trash-bin-trash-bold" width="20"></iconify-icon>
            </button>
        {/if}

        <input
            type="file"
            bind:this={fileInput}
            on:change={handleFileChange}
            accept="image/*"
            class="absolute inset-0 opacity-0 cursor-pointer"
        />
    </div>
</div>
