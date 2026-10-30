import { logger } from '@repo/logger';

const REQUEST_TIMEOUT_MS = 15_000;

export interface NuageConfig {
  url: string;
  token: string;
  spaceFacileId: string;
  spaceName: string;
}

export interface NuageEnv {
  NUAGE_URL?: string;
  NUAGE_API_TOKEN?: string;
  NUAGE_SPACE_FACILE_ID?: string;
  NUAGE_SPACE_NAME?: string;
}

export interface StoreContractInput {
  filename: string;
  pdf: Uint8Array;
  linkedTo: string;
}

export function nuageConfigFromEnv(env: NuageEnv): NuageConfig | null {
  if (!env.NUAGE_URL || !env.NUAGE_API_TOKEN || !env.NUAGE_SPACE_FACILE_ID) return null;
  return {
    url: env.NUAGE_URL.replace(/\/$/, ''),
    token: env.NUAGE_API_TOKEN,
    spaceFacileId: env.NUAGE_SPACE_FACILE_ID,
    spaceName: env.NUAGE_SPACE_NAME || 'Ardoise',
  };
}

const spaceIds = new Map<string, Promise<number>>();

async function ensureSpace(config: NuageConfig): Promise<number> {
  const response = await fetch(
    `${config.url}/api/spaces/by-facile-id/${encodeURIComponent(config.spaceFacileId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: config.spaceName }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }
  );
  if (!response.ok) {
    throw new Error(`space provisioning failed with status ${response.status}`);
  }
  const space = (await response.json()) as { id?: unknown };
  if (typeof space.id !== 'number') {
    throw new Error('space provisioning returned no numeric id');
  }
  return space.id;
}

function resolveSpaceId(config: NuageConfig): Promise<number> {
  const key = `${config.url}|${config.spaceFacileId}`;
  let pending = spaceIds.get(key);
  if (!pending) {
    pending = ensureSpace(config);
    spaceIds.set(key, pending);
    pending.catch(() => spaceIds.delete(key));
  }
  return pending;
}

export async function storeContractInNuage(
  config: NuageConfig | null,
  { filename, pdf, linkedTo }: StoreContractInput
): Promise<void> {
  if (!config) return;
  try {
    const spaceId = await resolveSpaceId(config);
    const form = new FormData();
    form.append('file', new Blob([pdf as BlobPart], { type: 'application/pdf' }), filename);
    form.append('space_id', String(spaceId));
    form.append('linked_to', linkedTo);
    const response = await fetch(`${config.url}/api/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}` },
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`upload failed with status ${response.status}`);
    }
    logger.info({ filename }, 'Contract stored in Nuage');
  } catch (error) {
    logger.warn({ err: error, filename }, 'Could not store contract in Nuage');
  }
}
