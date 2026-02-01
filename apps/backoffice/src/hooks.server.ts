import { redirect, type Handle } from '@sveltejs/kit';
import { prisma } from '@repo/database';

export const handle: Handle = async ({ event, resolve }) => {
  const url = event.url.pathname;

  if (url.startsWith('/admin')) {
    const sessionToken = event.cookies.get('better-auth.session_token');

    if (!sessionToken) throw redirect(302, '/');

    const sessionInDb = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: {
        user: {
          select: { role: true },
        },
      },
    });

    if (!sessionInDb || sessionInDb.user.role !== 'admin') throw redirect(302, '/');
  }

  return resolve(event);
};
