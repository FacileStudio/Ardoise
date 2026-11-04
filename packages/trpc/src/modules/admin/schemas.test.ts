import { describe, expect, it } from 'bun:test';
import { Prisma, type PrismaClient } from '@repo/database';
import { z } from 'zod';
import { AdminService } from './service';
import { adminRouter } from './router';

const delegates = new Proxy({}, { get: () => ({}) }) as unknown as PrismaClient;
const service = new AdminService(delegates);
const entities = service.getAvailableEntities();

function modelOf(entity: string) {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name.toLowerCase() === entity.toLowerCase());
  if (!model) throw new Error(`no Prisma model for ${entity}`);
  return model;
}

function relationKeys(entity: string): string[] {
  const model = modelOf(entity);
  const relations = model.fields.filter((field) => field.kind === 'object');
  return [...relations.map((f) => f.name), ...relations.flatMap((f) => [...(f.relationFromFields ?? [])])];
}

const nested = { connect: { id: 'x' }, create: { email: 'a@b.c' }, update: { role: 'ADMIN' }, deleteMany: {} };

describe('admin engine schemas', () => {
  it('registers at least the user and media entities', () => {
    expect(entities).toEqual(expect.arrayContaining(['user', 'media']));
  });

  it('lets the user update schema write exactly firstName and lastName', () => {
    const { schema } = service.getEntityConfig('user') as unknown as { schema: { update: z.ZodObject } };
    expect(Object.keys(schema.update.shape).sort()).toEqual(['firstName', 'lastName']);
  });

  for (const entity of entities) {
    const { schema } = service.getEntityConfig(entity) as unknown as {
      schema: { create: z.ZodType; update: z.ZodType };
    };

    for (const kind of ['create', 'update'] as const) {
      it(`${entity}.${kind} is a strict object with no relation or foreign key`, () => {
        const target = schema[kind];
        expect(target).toBeInstanceOf(z.ZodObject);
        const object = target as z.ZodObject;
        expect(object.def.catchall).toBeInstanceOf(z.ZodNever);
        const keys = Object.keys(object.shape);
        expect(keys.filter((key) => relationKeys(entity).includes(key))).toEqual([]);
      });

      it(`${entity}.${kind} rejects every relation key and nested write`, () => {
        for (const key of relationKeys(entity)) {
          expect(schema[kind].safeParse({ [key]: nested }).success).toBe(false);
          expect(schema[kind].safeParse({ [key]: 'some-id' }).success).toBe(false);
        }
      });
    }
  }
});

describe('admin media writes', () => {
  const caller = () =>
    adminRouter.createCaller({
      db: new Proxy(
        {},
        {
          get: () =>
            new Proxy(
              {},
              {
                get: () => async () => {
                  throw new Error('the database must not be reached');
                },
              }
            ),
        }
      ),
      user: { id: 'u1', role: 'ADMIN', email: 'a@b.c' },
      log: { debug() {}, error() {}, info() {}, warn() {} },
    } as never);

  for (const relation of ['avatarUser', 'coverUser']) {
    it(`refuses a nested write through ${relation}`, async () => {
      const data = {
        [relation]: {
          update: { email: 'camille@facile.studio', role: 'ADMIN', emailVerified: true, accounts: { deleteMany: {} } },
        },
      };
      await expect(caller().update({ entity: 'media', id: 'm1', data })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      await expect(
        caller().create({ entity: 'media', data: { url: 'u', key: 'k', mimeType: 'image/png', size: 1, ...data } })
      ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  }

  it('refuses linking media to a user by id', async () => {
    await expect(
      caller().update({ entity: 'media', id: 'm1', data: { avatarUserId: 'staff-user' } })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
