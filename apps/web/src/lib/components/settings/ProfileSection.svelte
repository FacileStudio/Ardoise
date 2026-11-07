<script lang="ts">
  import { onMount } from 'svelte';
  import {
    Button,
    Field,
    Input,
    ProfileCard,
    ProfileSection as FacileProfile,
    SettingsRow,
    SettingsSection,
    Spinner,
    toast,
  } from '@facile/muse';
  import type { SessionUser } from '@repo/auth-shared';
  import { logger } from '@repo/logger';
  import authStore from '$lib/auth-store';
  import { trpc } from '$lib/trpc';
  import { icons } from '$lib/icons';

  let { area }: { area: 'admin' | 'client' } = $props();

  type ClientCompany = Awaited<ReturnType<typeof trpc.client.me.query>>;

  let loaded = $state(false);
  let avatarUrl = $state<string | undefined>(undefined);
  let company = $state<ClientCompany | null>(null);

  let firstName = $state($authStore.user?.firstName ?? '');
  let lastName = $state($authStore.user?.lastName ?? '');
  let saving = $state(false);

  const user = $derived($authStore.user);
  const staff = $derived(area === 'admin');
  const dirty = $derived(
    firstName !== (user?.firstName ?? '') || lastName !== (user?.lastName ?? '')
  );
  const fullName = $derived(`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim());

  onMount(async () => {
    const [profile, clientCompany] = await Promise.all([
      trpc.user.me.query().catch(() => null),
      area === 'client' ? trpc.client.me.query().catch(() => null) : Promise.resolve(null),
    ]);
    loaded = true;
    avatarUrl = $authStore.user?.avatarUrl ?? profile?.avatar?.url ?? undefined;
    company = clientCompany;
  });

  $effect(() => {
    firstName = user?.firstName ?? '';
    lastName = user?.lastName ?? '';
  });

  async function saveProfile() {
    saving = true;
    try {
      const updated = await trpc.user.updateProfile.mutate({ firstName, lastName });
      authStore.updateUser(updated as SessionUser);
      toast.success('Profil mis à jour');
    } catch (err) {
      logger.error({ err }, 'Failed to update profile');
      toast.danger('Échec de la mise à jour du profil');
    } finally {
      saving = false;
    }
  }

</script>

{#if !loaded}
  <div class="flex min-h-[30dvh] items-center justify-center"><Spinner size="lg" /></div>
{:else}
  {#if staff}
    <FacileProfile
      name={fullName || user?.email || ''}
      email={user?.email}
      avatar={avatarUrl}
      role="Administrateur"
    />
  {:else}
    <SettingsSection title="Profil" description="Comment vous apparaissez dans Ardoise." bare>
      <ProfileCard name={fullName || user?.email || ''} email={user?.email} avatar={avatarUrl}>
        <div class="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom">
            <Input bind:value={firstName} />
          </Field>
          <Field label="Nom">
            <Input bind:value={lastName} />
          </Field>
        </div>
        <div>
          <Button
            icon={icons.check}
            disabled={saving || !dirty || !firstName.trim() || !lastName.trim()}
            onclick={saveProfile}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </ProfileCard>
    </SettingsSection>
  {/if}

  {#if company}
    <SettingsSection title="Entreprise" description="Informations enregistrées par votre prestataire.">
      <SettingsRow label="Raison sociale">
        <span class="text-fc-sm text-fc-fg">{company.companyName}</span>
      </SettingsRow>
      {#if company.siret}
        <SettingsRow label="SIRET">
          <span class="font-fc-mono text-fc-sm text-fc-fg">{company.siret}</span>
        </SettingsRow>
      {/if}
      <SettingsRow label="Adresse de facturation">
        <span class="text-fc-sm text-fc-fg">
          {[company.billingAddress, company.billingCity, company.billingCountry]
            .filter(Boolean)
            .join(', ') || 'Non renseignée'}
        </span>
      </SettingsRow>
      <SettingsRow
        label="Modifier ces informations"
        description="Contactez-nous directement pour toute correction."
      />
    </SettingsSection>
  {/if}
{/if}
