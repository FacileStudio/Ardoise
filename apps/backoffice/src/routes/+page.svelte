<script lang="ts">
    import { goto } from '$app/navigation';
    import authStore from '$lib/auth-store';
    import { trpc } from '$lib/trpc'
    import { isAdmin, loginSchema, type SessionUser } from '@repo/auth-shared';
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
            console.error('Login error:', err);
            error = err.message || "Une erreur est survenue lors de la connexion";
            isLoggingIn = false;
        }
    }
</script>

<main class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    {#if $authStore.loading}
        <iconify-icon icon="line-md:loading-twotone-loop" width="40" class="text-indigo-600"></iconify-icon>
    {:else}
        <div class="max-w-md w-full bg-white p-10 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-slate-100">
            <div class="text-center mb-8">
                <div class="w-16 h-16 bg-indigo-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                    <iconify-icon icon="solar:shield-keyhole-bold" width="32"></iconify-icon>
                </div>
                <h1 class="text-3xl font-black text-slate-900 tracking-tight">Backoffice</h1>
                <p class="text-slate-400 font-medium">Connectez-vous pour gérer le site</p>
            </div>

            <form on:submit|preventDefault={handleLogin} class="space-y-4">
                <div class="space-y-1">
                    <input
                        type="email"
                        bind:value={email}
                        placeholder="Email"
                        class="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-500/20 focus:bg-white transition-all"
                        required
                    />
                </div>
                <div class="space-y-1">
                    <input
                        type="password"
                        bind:value={password}
                        placeholder="Mot de passe"
                        class="w-full p-4 bg-slate-50 rounded-2xl outline-none border-2 border-transparent focus:border-indigo-500/20 focus:bg-white transition-all"
                        required
                    />
                </div>

                {#if error}
                    <div class="bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-2 border border-rose-100">
                        <iconify-icon icon="solar:danger-bold"></iconify-icon>
                        {error}
                    </div>
                {/if}

                <button
                    disabled={isLoggingIn}
                    class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg hover:bg-indigo-600 transition-all disabled:opacity-50 shadow-xl shadow-slate-200 active:scale-[0.98]"
                >
                    {isLoggingIn ? 'Vérification...' : 'Connexion'}
                </button>
            </form>
        </div>
    {/if}
</main>
