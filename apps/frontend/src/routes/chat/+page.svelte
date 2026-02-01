<script lang="ts">
import { trpc } from '$lib/trpc';
import { auth } from '$lib/stores/auth';
import { onMount, onDestroy } from 'svelte';
import { fade, fly, slide } from 'svelte/transition';

import MessageBubble from '$lib/components/MessageBubble.svelte';
import ChatSidebar from '$lib/components/ChatSidebar.svelte';
import NewChatModal from '$lib/components/NewChatModal.svelte';
import RoomSettingsModal from '$lib/components/RoomSettingsModal.svelte';

let rooms: any[] = [];
let activeRoomId = "";
let activeRoom: any = null;
let messages: any[] = [];
let text = "";

let showNewChatModal = false;
let showSettingsModal = false;
let isSending = false;
let error: string | null = null;
let scrollContainer: HTMLElement;

let typingUsers = new Map<string, string>();
let typingTimeout: any;

let msgSub: any;
let typingSub: any;

onMount(async () => {
        if ($auth.user) await loadRooms();
        });

async function loadRooms() {
    try {
        // 1. Fetch des données
        const fetchedRooms = await trpc.chat.getMyRooms.query();

        // 2. Mise à jour de la liste
        rooms = fetchedRooms;

        // 3. Mise à jour synchronisée de la room active
        if (activeRoomId) {
            const found = rooms.find(r => r.id === activeRoomId);
            if (found) {
                // On utilise l'étalement pour forcer Svelte à voir le changement d'objet
                activeRoom = { ...found };
            } else {
                activeRoom = null;
            }
        }
    } catch (e) {
        console.error("LoadRooms Error:", e);
        showError("Impossible de rafraîchir les conversations");
    }
}

function setupSubscriptions(roomId: string) {
    // On nettoie d'abord les anciennes souscriptions si elles existent
    if (msgSub) msgSub.unsubscribe();
    if (typingSub) typingSub.unsubscribe();

    // Souscription aux messages
    msgSub = trpc.chat.onMessage.subscribe({ roomId }, {
onData: (msg) => {
messages = [...messages, msg];
scrollToBottom();
}
});

// Souscription aux indicateurs de saisie
typingSub = trpc.chat.onTyping.subscribe({ roomId }, {
onData: (data) => {
if (data.userId === $auth.user?.id) return;
if (data.isTyping) {
typingUsers.set(data.userId, data.userName);
} else {
typingUsers.delete(data.userId);
}
typingUsers = typingUsers; // Déclenche la réactivité Svelte
}
});
}
async function selectRoom(id: string) {
    // A. Reset immédiat pour éviter les conflits d'UI
    activeRoomId = id;
    activeRoom = null; // On vide temporairement pour forcer le rechargement
    messages = [];

    // B. Attendre le chargement complet des data
    await loadRooms();

    // C. Une fois chargé, on vérifie si la room existe
    activeRoom = rooms.find(r => r.id === id);

    if (!activeRoom) {
        showError("Données du salon introuvables");
        return;
    }

    // D. Lancer les souscriptions seulement après avoir l'objet activeRoom
    try {
        const history = await trpc.chat.getHistory.query({ roomId: id });
        messages = [...history].reverse();

        // Initialiser les subs (onMessage, onTyping...) ici
        setupSubscriptions(id);

        scrollToBottom();
    } catch (err) {
        console.error("Sync error:", err);
        showError("Erreur de synchronisation");
    }
}

function handleInput() {
    if (!activeRoomId) return;
    if (typingTimeout) clearTimeout(typingTimeout);
    trpc.chat.setTyping.mutate({ roomId: activeRoomId, isTyping: true });
    typingTimeout = setTimeout(() => {
            trpc.chat.setTyping.mutate({ roomId: activeRoomId, isTyping: false });
            }, 2000);
}

async function sendMessage() {
    if (!text.trim() || isSending || !activeRoomId) return;
    isSending = true;
    const content = text;
    text = "";
    try {
        await trpc.chat.send.mutate({ roomId: activeRoomId, text: content });
        trpc.chat.setTyping.mutate({ roomId: activeRoomId, isTyping: false });
    } catch (e) {
        text = content;
        showError("Envoi échoué");
    } finally {
        isSending = false;
    }
}

function showError(msg: string) {
    error = msg;
    setTimeout(() => error = null, 3000);
}

function scrollToBottom() {
    if (scrollContainer) {
        setTimeout(() => {
                scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
                }, 50);
    }
}

onDestroy(() => {
        if (msgSub) msgSub.unsubscribe();
        if (typingSub) typingSub.unsubscribe();
        });
</script>

{#if error}
<div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]" transition:fly={{ y: 50 }}>
<div class="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold flex items-center gap-3 border border-white/10">
<div class="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
{error}
</div>
</div>
{/if}

{#if showNewChatModal}
<NewChatModal
on:close={() => showNewChatModal = false}
on:created={(e) => selectRoom(e.detail)}
/>
{/if}

{#if showSettingsModal && activeRoom}
<RoomSettingsModal
room={activeRoom}
currentUserId={$auth.user?.id || ''}
on:close={() => showSettingsModal = false}
on:refresh={loadRooms}
on:left={() => { activeRoomId = ""; activeRoom = null; showSettingsModal = false; loadRooms(); }}
/>
{/if}

<div class="h-[calc(100vh-40px)] flex bg-slate-50/50 overflow-hidden m-5 rounded-[40px] border border-white shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">

<ChatSidebar
{rooms}
{activeRoomId}
onRoomSelect={selectRoom}
onNewChat={() => showNewChatModal = true}
/>

<main class="flex-1 flex flex-col bg-white relative">
{#if activeRoomId && activeRoom}
<header class="p-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
<div class="flex items-center gap-3">
<div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
<div>
<h2 class="font-black text-slate-800 tracking-tight leading-none">
{activeRoom.name || 'Discussion Privée'}
</h2>
</div>
</div>

<button on:click={() => showSettingsModal = true} class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" aria-label="Réglages" title="Réglages">
<iconify-icon icon="solar:settings-bold" width="24"></iconify-icon>
</button>
</header>

<div bind:this={scrollContainer} class="flex-1 overflow-y-auto px-4 py-6 space-y-1 scrollbar-hide">
{#each messages as msg (msg.id)}
<div in:fly={{ y: 10, duration: 200 }}>
<MessageBubble {msg} isMe={msg.userId === $auth.user?.id} />
</div>
{/each}
</div>

<div class="p-6 pt-0">
<div class="h-6 px-4">
{#if typingUsers.size > 0}
<div in:slide class="flex items-center gap-2 text-[11px] font-black text-indigo-500 uppercase tracking-tighter italic">
<span class="flex gap-0.5">
<span class="w-1 h-1 bg-indigo-500 rounded-full animate-bounce"></span>
<span class="w-1 h-1 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
</span>
{Array.from(typingUsers.values())[0]} écrit...
</div>
{/if}
</div>

<form on:submit|preventDefault={sendMessage} class="bg-slate-100/80 backdrop-blur-sm p-2 rounded-[30px] flex items-center gap-2 border border-white shadow-inner focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
<button type="button" class="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition" aria-label="Fichiers" title="Ajouter">
<iconify-icon icon="solar:paperclip-2-bold" width="24"></iconify-icon>
</button>

<input
bind:value={text}
on:input={handleInput}
placeholder="Écrire un message..."
disabled={isSending}
class="flex-1 bg-transparent border-none px-2 py-3 text-sm focus:ring-0 outline-none text-slate-800 font-medium disabled:opacity-50"
/>

<button type="submit" disabled={!text.trim() || isSending} class="bg-indigo-600 text-white w-11 h-11 rounded-[22px] shadow-lg shadow-indigo-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:grayscale" aria-label="Envoyer" title="Envoyer">
{#if isSending}
<iconify-icon icon="line-md:loading-twotone-loop" width="20"></iconify-icon>
{:else}
<iconify-icon icon="solar:rocket-bold" width="20"></iconify-icon>
{/if}
</button>
</form>
</div>
{:else}
<div class="flex-1 flex flex-col items-center justify-center p-12 text-center" in:fade>
<div class="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center text-indigo-600 mb-6">
<iconify-icon icon="solar:chat-round-unread-bold-duotone" width="48"></iconify-icon>
</div>
<h2 class="text-2xl font-black text-slate-800 mb-2">Sélectionnez un chat</h2>
<p class="text-slate-400 max-w-xs mb-8 text-sm font-medium">Ou commencez une nouvelle aventure avec vos contacts.</p>
<button on:click={() => showNewChatModal = true} class="flex items-center gap-3 bg-indigo-600 text-white px-8 py-4 rounded-[24px] font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 active:scale-95">
Nouvelle discussion
</button>
</div>
{/if}
</main>
</div>

<style>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
