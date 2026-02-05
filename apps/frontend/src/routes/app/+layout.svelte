<script lang="ts">
  import authStore from '$lib/auth-store';
  import { page } from '$app/stores';
  import { Sidebar } from '@repo/ui'; // Ajustez le chemin selon votre structure
  import 'iconify-icon';

  // Centralisation de la configuration du menu
  const menuItems = [
    { label: 'Profil', icon: 'solar:user-bold', href: '/app/profile' },
    { label: 'Messages', icon: 'solar:letter-bold', href: '/app/chat' },
    { label: 'Paramètres', icon: 'solar:settings-bold', href: '/app/settings' },
  ];

  // Extraction des initiales pour le slot avatar
  $: userInitials = $authStore.user?.firstName?.[0] || 'U';
  $: userName = $authStore.user?.firstName || 'Utilisateur';
</script>

<div class="flex min-h-screen bg-white">
  <Sidebar items={menuItems} activeHref={$page.url.pathname}>
    <div
      slot="user-avatar"
      class="w-full h-full flex items-center justify-center bg-black text-white font-black text-xs"
    >
      {userInitials}
    </div>

    <span slot="user-name">
      {userName}
    </span>
  </Sidebar>

  <main class="flex-1 h-screen overflow-y-auto selection:bg-black selection:text-white">
    <slot />
  </main>
</div>

<style>
  /* On s'assure que le body n'a pas de scroll parasite */
  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
