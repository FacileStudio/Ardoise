import type { PrismaClient, Contact } from '@repo/database';

export const contactService = {
  create: async (db: PrismaClient, data: Omit<Contact, 'id' | 'createdAt'>) => {
    const contact = await db.contact.create({ data });
    return {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      createdAt: contact.createdAt,
    };
  },

  list: async (db: PrismaClient) => {
    const contacts = await db.contact.findMany({ orderBy: { createdAt: 'desc' } });
    return contacts.map((contact) => ({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      createdAt: contact.createdAt,
    }));
  },

  delete: async (db: PrismaClient, id: string) => {
    const contact = await db.contact.delete({ where: { id } });
    return {
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName,
      lastName: contact.lastName,
      createdAt: contact.createdAt,
    };
  },
};
