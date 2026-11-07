import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { createVersionHandler, resolveVersion } from './version';

describe('version handler', () => {
  it('serves the version of the root package.json', async () => {
    const root = new URL('../../../../package.json', import.meta.url);
    const expected = JSON.parse(readFileSync(root, 'utf8')).version;
    const app = new Hono().get('/version', createVersionHandler());
    const res = await app.request('/version');
    expect(await res.json()).toEqual({ version: expected });
    expect(resolveVersion()).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
