<script lang="ts">
    import { trpc } from '$lib/trpc';
    import authStore from '$lib/auth-store';
    import { onMount, onDestroy } from 'svelte';
    import { fly } from 'svelte/transition';

    import ChatSidebar from '$lib/components/ChatSidebar.svelte';
    import ChatMessages from '$lib/components/ChatMessages.svelte';
    import ChatInput from '$lib/components/ChatInput.svelte';
    import NewChatModal from '$lib/components/NewChatModal.svelte';
    import RoomSettingsModal from '$lib/components/RoomSettingsModal.svelte';

    let rooms: any[] = [];
    let activeRoom: any = null;
    let messages: any[] = [];
    let activeRoomId: string = "";
    let isSending: boolean = false;
    let typingUsers: Map<string, string> = new Map();

    let scrollContainer: HTMLElement | undefined = undefined;

    let showNewChatModal = false;
    let showSettingsModal = false;
    let error: string | null = null;
    let typingTimeout: any;
    let subs: { msg?: any; typing?: any } = {};

    onMount(() => {
        loadRooms();
    });

    onDestroy(() => {
        Object.values(subs).forEach(s => s?.unsubscribe());
    });

    async function loadRooms() {
        try {
            rooms = await trpc.chat.getMyRooms.query();
            if (activeRoomId)
                activeRoom = rooms.find(r => r.id === activeRoomId) || null;
        } catch {
            showError("Erreur de chargement");
        }
    }

    async function selectRoom(id: string) {
        activeRoomId = id;
        activeRoom = null;
        messages = [];
        await loadRooms();

        activeRoom = rooms.find(r => r.id === id);
        if (!activeRoom) return showError("Salon introuvable");

        try {
            const history = await trpc.chat.getHistory.query({ roomId: id });
            messages = history.reverse();

            Object.values(subs).forEach(s => s?.unsubscribe());

            subs.msg = trpc.chat.onMessage.subscribe({ roomId: id }, {
                onData: (msg) => {
                    messages = [...messages, msg];
                    scrollToBottom();
                }
            });

            subs.typing = trpc.chat.onTyping.subscribe({ roomId: id }, {
                onData: (data) => {
                    if (data.userId === $authStore.user?.id) return;
                    data.isTyping ? typingUsers.set(data.userId, data.userName) : typingUsers.delete(data.userId);
                    typingUsers = typingUsers;
                }
            });

            scrollToBottom();
        } catch {
            showError("Erreur de synchro");
        }
    }

    async function handleSendMessage(text: string) {
        isSending = true;
        try {
            await trpc.chat.send.mutate({ roomId: activeRoomId, text });
            trpc.chat.setTyping.mutate({ roomId: activeRoomId, isTyping: false });
        } catch {
            showError("Échec de l'envoi");
        } finally {
            isSending = false;
        }
    }

    function handleTyping() {
        if (!activeRoomId) return;
        clearTimeout(typingTimeout);
        trpc.chat.setTyping.mutate({ roomId: activeRoomId, isTyping: true });
        typingTimeout = setTimeout(() => {
            trpc.chat.setTyping.mutate({ roomId: activeRoomId, isTyping: false });
        }, 2000);
    }

    function showError(msg: string) {
        error = msg;
        setTimeout(() => error = null, 3000);
    }

    function scrollToBottom() {
        if (scrollContainer) {
            setTimeout(() => {
                scrollContainer?.scrollTo({
                    top: scrollContainer.scrollHeight,
                    behavior: 'smooth'
                });
            }, 50);
        }
    }
</script>

{#if error}
    <div class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100]" transition:fly={{ y: 50 }}>
        <div class="bg-slate-900 text-white px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-3 font-bold shadow-2xl">
            <div class="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
            {error}
        </div>
    </div>
{/if}

{#if showNewChatModal}
    <NewChatModal on:close={() => showNewChatModal = false} on:created={(e) => selectRoom(e.detail)} />
{/if}

{#if showSettingsModal && activeRoom}
    <RoomSettingsModal
        room={activeRoom}
        currentUserId={$authStore.user?.id || ''}
        on:close={() => showSettingsModal = false}
        on:refresh={loadRooms}
        on:left={() => { activeRoomId = ""; activeRoom = null; showSettingsModal = false; loadRooms(); }}
    />
{/if}

<div class="h-[calc(100vh-40px)] flex bg-slate-50/50 m-5 rounded-[40px] border border-white shadow-2xl overflow-hidden">
    <ChatSidebar {rooms} {activeRoomId} onRoomSelect={selectRoom} onNewChat={() => showNewChatModal = true} />

    <main class="flex-1 flex flex-col bg-white">
        {#if activeRoomId && activeRoom}
            <header class="p-6 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <h2 class="font-black text-slate-800 tracking-tight leading-none">{activeRoom.name || 'Discussion Privée'}</h2>
                </div>
                <button
                    on:click={() => showSettingsModal = true}
                    class="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                    aria-label="Paramètres du salon"
                >
                    <iconify-icon icon="solar:settings-bold" width="24"></iconify-icon>
                </button>
            </header>

            <ChatMessages
                {messages}
                currentUserId={$authStore.user?.id || ''}
                bind:scrollContainer
            />

            <ChatInput
                {isSending}
                {typingUsers}
                onSendMessage={handleSendMessage}
                onTyping={handleTyping}
            />
        {:else}
            <div class="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <div class="w-24 h-24 bg-indigo-50 rounded-[32px] flex items-center justify-center text-indigo-600 mb-6">
                    <iconify-icon icon="solar:chat-round-unread-bold-duotone" width="48"></iconify-icon>
                </div>
                <h2 class="text-2xl font-black text-slate-800 mb-2">Sélectionnez un chat</h2>
                <button on:click={() => showNewChatModal = true} class="mt-4 bg-indigo-600 text-white px-8 py-4 rounded-[24px] font-black hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                    Nouvelle discussion
                </button>
            </div>
        {/if}
    </main>
</div>
