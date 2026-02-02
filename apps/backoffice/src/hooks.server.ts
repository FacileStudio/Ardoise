import { redirect, type Handle } from '@sveltejs/kit';
import { prisma } from '@repo/database';
import { AuthManager } from '@repo/auth';
import { env } from '$env/dynamic/private';

const authManager = new AuthManager({
  encryptionSecret: env.ENCRYPTION_SECRET,
});

export const handle: Handle = async ({ event, resolve }) => {
  const url = event.url.pathname;

  // Protection des routes /admin
  if (url.startsWith('/admin')) {
    // 1. On récupère le token (ajuste le nom du cookie selon ta config)
    const token = event.cookies.get('auth_token');

    if (!token) {
      throw redirect(302, '/');
    }

    // 2. On vérifie et décode le token via l'AuthManager
    const decoded = await authManager.verifyToken(token);

    if (!decoded || !decoded.id) {
      throw redirect(302, '/');
    }

    // 3. On check le rôle dans la DB
    // Note: Si tu as mis le role dans le payload JWT, tu peux éviter cet appel DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      throw redirect(302, '/');
    }

    event.locals.user = { id: decoded.id, role: user.role };
  }

  return resolve(event);
};
