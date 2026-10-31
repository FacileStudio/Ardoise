import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return path.endsWith('.ts') && !path.endsWith('.test.ts') ? [path] : [];
  });
}

describe('user rows never leave a module whole', () => {
  const files = sources(import.meta.dir);

  it('never includes the user relation without a projection', () => {
    const offenders = files.filter((file) => /\buser:\s*true\b/.test(readFileSync(file, 'utf8')));

    expect(offenders).toEqual([]);
  });

  it('projects every user relation to a select or an omit of the password', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, 'utf8');
      for (const match of text.matchAll(/(?<![(\w])\buser:\s*\{\s*(\w+)\b(?!:\s*string)/g)) {
        if (!['select', 'omit', 'email', 'firstName', 'lastName', 'id', 'create', 'connect'].includes(match[1])) {
          offenders.push(`${file}: ${match[0]}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
