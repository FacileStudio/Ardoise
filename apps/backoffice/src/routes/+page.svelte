<script lang="ts">
    import { goto } from '$app/navigation';
    import authStore from '$lib/auth-store';
    import { trpc } from '$lib/trpc'
    import { isAdmin, loginSchema, type SessionUser } from '@repo/auth-shared';
    import { Button, Input, Alert, Card, Spinner } from '@repo/ui';
    import { logger } from '@repo/logger';
    import 'iconify-icon';

    let email = '', password = '', error = '', isLoggingIn = false;

    async function handleLogin() {
        isLoggingIn = true;
        error = '';

        const validation = loginSchema.safeParse({ email, password });
        if (!validation.success) {
            error = validation.error.issues[0].message;
            isLoggingIn = false;
            return;
        }

        try {
            const { token, user } = await trpc.auth.login.mutate({ email, password });

            if (!isAdmin(user as SessionUser)) {
                error = "Accès refusé : espace réservé aux administrateurs.";
                isLoggingIn = false;
                return;
            }

            authStore.setAuth(
                { token },
                user as SessionUser
            );
            goto('/admin/contacts');
        } catch (err: any) {
            logger.error({ err }, 'Login error');
            error = err.message || "Une erreur est survenue lors de la connexion";
            isLoggingIn = false;
        }
    }
</script>

<main class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    {#if $authStore.loading}
        <Spinner size="xl" />
    {:else}
        <Card padding="lg" rounded="xl" shadow="lg" class="max-w-md w-full">
            <div class="text-center mb-8">
                <div class="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                    <iconify-icon icon="solar:shield-keyhole-bold" width="32"></iconify-icon>
                </div>
                <h1 class="text-3xl font-black text-slate-900 tracking-tight">Backoffice</h1>
                <p class="text-slate-400 font-medium">Connectez-vous pour gérer le site</p>
            </div>

            <form on:submit|preventDefault={handleLogin} class="space-y-4">
                <Input
                    type="email"
                    bind:value={email}
                    placeholder="Email"
                    required
                />
                <Input
                    type="password"
                    bind:value={password}
                    placeholder="Mot de passe"
                    required
                />

                {#if error}
                    <Alert variant="danger">{error}</Alert>
                {/if}

                <Button
                    type="submit"
                    disabled={isLoggingIn}
                    class="w-full text-lg"
                >
                    {isLoggingIn ? 'Vérification...' : 'Connexion'}
                </Button>
            </form>
        </Card>
    {/if}
</main>
