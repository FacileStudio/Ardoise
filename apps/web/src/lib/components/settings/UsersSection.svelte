<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import {
    Avatar,
    Badge,
    Button,
    Card,
    ConfirmModal,
    EmptyState,
    Input,
    SettingsSection,
    Spinner,
    Table,
    Tabs,
    toast,
  } from '@facile/muse';
  import { logger } from '@repo/logger';
  import { trpc } from '$lib/trpc';
  import { icons } from '$lib/icons';
  import PendingInvitations from '$lib/components/PendingInvitations.svelte';
  import type { User } from '$lib/types';

  let loading = $state(true);
  let users: User[] = $state([]);
  let search = $state('');
  let role = $state<'all' | 'admin' | 'user'>('all');
  let deleting = $state<User | null>(null);

  const roleTabs = [
    { id: 'all', label: 'Tous' },
    { id: 'admin', label: 'Administrateurs' },
    { id: 'user', label: 'Utilisateurs' },
  ];

  onMount(fetchUsers);

  async function fetchUsers() {
    try {
      users = await trpc.user.list.query({ role: 'all' });
    } catch (err) {
      logger.error({ err }, 'Failed to fetch users');
      toast.danger('Impossible de charger les utilisateurs');
    } finally {
      loading = false;
    }
  }

  async function confirmDelete() {
    const target = deleting;
    if (!target) return;
    try {
      await trpc.user.delete.mutate({ id: target.id });
      users = users.filter((u) => u.id !== target.id);
      toast.success('Utilisateur supprimé');
    } catch (err) {
      logger.error({ err }, 'Failed to delete user');
      toast.danger('Impossible de supprimer cet utilisateur');
    }
    deleting = null;
  }

  async function toggleRole(user: User) {
    const next = user.role === 'ADMIN' ? 'CLIENT' : 'ADMIN';
    try {
      await trpc.user.update.mutate({ id: user.id, role: next });
      users = users.map((u) => (u.id === user.id ? { ...u, role: next } : u));
    } catch (err) {
      logger.error({ err }, 'Failed to update user role');
      toast.danger('Impossible de modifier le rôle');
    }
  }

  const term = $derived(search.toLowerCase().trim());
  const filtered = $derived(
    users.filter((user) => {
      if (role === 'admin' && user.role !== 'ADMIN') return false;
      if (role === 'user' && user.role === 'ADMIN') return false;
      if (!term) return true;
      const haystack = `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase();
      return term.split(' ').every((word) => haystack.includes(word));
    })
  );

  function formatDate(date: Date | string | null) {
    return date ? new Date(date).toLocaleDateString('fr-FR') : '-';
  }
</script>

<SettingsSection
  bare
  title="Utilisateurs"
  description="Les personnes qui ont accès à cette instance d'Ardoise."
>
  {#snippet actions()}
    <Button icon={icons.plus} href={resolve('/admin/users/create')}>Nouvel utilisateur</Button>
  {/snippet}

  <PendingInvitations />

  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Tabs
      items={roleTabs}
      bind:value={role}
      label="Filtrer par rôle"
    />
    <Input bind:value={search} placeholder="Rechercher un utilisateur" class="sm:max-w-64" />
  </div>

  {#if loading}
    <div class="flex min-h-[20dvh] items-center justify-center"><Spinner size="lg" /></div>
  {:else if filtered.length === 0}
    <EmptyState
      bare
      icon={icons.usersGroup}
      title="Aucun utilisateur"
      description="Ajustez la recherche ou le filtre de rôle."
    />
  {:else}
    <Table class="hidden md:block">
      <thead>
        <tr>
          <th scope="col">Utilisateur</th>
          <th scope="col">Statut</th>
          <th scope="col">Rôle</th>
          <th scope="col">Inscription</th>
          <th scope="col" class="text-right"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as user (user.id)}
          <tr>
            <td>
              <a
                href={resolve(`/admin/users/${user.id}`)}
                class="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fc-ring"
              >
                <Avatar
                  name={`${user.firstName} ${user.lastName}`}
                  src={user.avatar?.url}
                  size="sm"
                />
                <span class="flex min-w-0 flex-col">
                  <span class="font-medium text-fc-fg">{user.firstName} {user.lastName}</span>
                  <span class="text-fc-xs text-fc-fg-muted">{user.email}</span>
                </span>
              </a>
            </td>
            <td>
              <Badge tone={(user.status || 'ACTIVE') === 'ACTIVE' ? 'success' : 'neutral'}>
                {(user.status || 'ACTIVE') === 'ACTIVE' ? 'Actif' : user.status}
              </Badge>
            </td>
            <td>
              <Badge tone={user.role === 'ADMIN' ? 'admin' : 'neutral'}>
                {user.role === 'ADMIN' ? 'Administrateur' : 'Utilisateur'}
              </Badge>
            </td>
            <td class="text-fc-fg-muted">{formatDate(user.createdAt)}</td>
            <td class="text-right">
              <Button variant="ghost" size="sm" onclick={() => toggleRole(user)}>
                {user.role === 'ADMIN' ? 'Rétrograder' : 'Promouvoir'}
              </Button>
              <Button
                variant="ghost-danger"
                size="sm"
                icon={icons.remove}
                aria-label="Supprimer l'utilisateur"
                onclick={() => (deleting = user)}
              />
            </td>
          </tr>
        {/each}
      </tbody>
    </Table>

    <div class="flex flex-col gap-3 md:hidden">
      {#each filtered as user (user.id)}
        <Card href={resolve(`/admin/users/${user.id}`)} class="flex items-center gap-3">
          <Avatar name={`${user.firstName} ${user.lastName}`} src={user.avatar?.url} size="sm" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate font-medium text-fc-fg">{user.firstName} {user.lastName}</span>
            <span class="truncate text-fc-xs text-fc-fg-muted">{user.email}</span>
          </span>
          <Badge tone={user.role === 'ADMIN' ? 'admin' : 'neutral'}>
            {user.role === 'ADMIN' ? 'Admin' : 'Utilisateur'}
          </Badge>
        </Card>
      {/each}
    </div>
  {/if}
</SettingsSection>

<ConfirmModal
  open={deleting !== null}
  title="Supprimer cet utilisateur ?"
  description={deleting
    ? `${deleting.firstName} ${deleting.lastName} perdra l'accès à Ardoise immédiatement. Cette action est définitive.`
    : ''}
  confirmLabel="Supprimer"
  cancelLabel="Annuler"
  tone="danger"
  onConfirm={confirmDelete}
  onCancel={() => (deleting = null)}
/>
