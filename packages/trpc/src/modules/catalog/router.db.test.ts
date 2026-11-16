import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { prisma } from '@repo/database';
import { lockTestDatabase } from '@repo/database/test-lock';
import { appRouter } from '../../index';

const enabled = !!process.env.TEST_DATABASE_URL;
process.env.ENCRYPTION_SECRET ??= 'catalog-test-encryption-secret-0123456789';

const silent = { debug() {}, error() {}, info() {}, warn() {}, child() { return silent; } };

describe.skipIf(!enabled)('catalog against Postgres', () => {
  const ids: Record<string, string> = {};
  let release: () => Promise<void> = async () => {};
  let caller: ReturnType<typeof appRouter.createCaller>;

  const wipe = () =>
    prisma.$executeRawUnsafe('TRUNCATE "User", "Space", "Client", "Provider", "Mission", "CatalogItem" CASCADE');

  beforeAll(async () => {
    release = await lockTestDatabase(process.env.TEST_DATABASE_URL!);
    await wipe();
    const user = await prisma.user.create({
      data: { email: 'owner@catalog.test', firstName: 'O', lastName: 'W', role: 'MEMBER' },
    });
    const space = await prisma.space.create({
      data: { name: 'S', members: { create: { userId: user.id, role: 'OWNER' } } },
    });
    const client = await prisma.client.create({
      data: { contactFirstName: 'C', contactLastName: 'L', companyName: 'Acme', contactEmail: 'c@catalog.test', spaceId: space.id },
    });
    const mission = await prisma.mission.create({ data: { name: 'M', clientId: client.id, spaceId: space.id } });
    Object.assign(ids, { space: space.id, mission: mission.id });
    caller = appRouter.createCaller({
      req: new Request('http://api.test'),
      resHeaders: new Headers(),
      user: { id: user.id, role: 'MEMBER', email: user.email },
      db: prisma,
      env: { PLATFORM_STAFF_SUBS: '', ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET },
      apiOrigin: 'http://api.test',
      appOrigin: 'http://app.test',
      log: silent,
    } as never);
  }, 600_000);

  afterAll(async () => {
    await release();
  });

  it('keeps the fields an update leaves out', async () => {
    const item = await caller.catalog.create({
      spaceId: ids.space!,
      category: 'Web',
      name: 'Site vitrine',
      quantity: 10,
      unitPrice: 300,
      billing: 'MONTHLY',
    });

    const updated = await caller.catalog.update({ id: item.id, data: { unitPrice: 320 } });

    expect([Number(updated.quantity), updated.unit, updated.billing, updated.category, Number(updated.unitPrice)]).toEqual([
      10,
      'jour',
      'MONTHLY',
      'Web',
      320,
    ]);
  });

  it('hides archived items unless asked, and a deleted item leaves the mission line intact', async () => {
    const item = await caller.catalog.create({ spaceId: ids.space!, name: 'Logo', unitPrice: 3000 });
    await caller.mission.setPrestations({
      id: ids.mission!,
      prestations: [
        { description: 'Logo', quantity: 1, unit: 'forfait', unitPrice: 2500, catalogItemId: item.id, listUnitPrice: 3000 },
      ],
    });
    await caller.catalog.update({ id: item.id, data: { active: false } });

    const visible = await caller.catalog.list({ spaceId: ids.space });
    const all = await caller.catalog.list({ spaceId: ids.space, includeArchived: true });
    await caller.catalog.delete({ id: item.id });
    const line = await prisma.prestation.findFirstOrThrow({ where: { missionId: ids.mission } });

    expect(visible.some((row) => row.id === item.id)).toBe(false);
    expect(all.some((row) => row.id === item.id)).toBe(true);
    expect([line.catalogItemId, Number(line.unitPrice), Number(line.listUnitPrice)]).toEqual([null, 2500, 3000]);
  });
});
