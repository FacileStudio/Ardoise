import { describe, expect, test } from 'bun:test';
import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { escapeTypstString } from './escape';

const HOSTILE = [
  'Acme "Corp"',
  'back\\slash',
  'ends with backslash\\',
  'a\\"; #text(size: 40pt)[INJECTED]; #let b = "',
  'two\nlines\tand tab',
  'plain',
];

function compilesToSameString(original: string): boolean {
  const dir = mkdtempSync(join(tmpdir(), 'escape-'));
  try {
    writeFileSync(join(dir, 'orig.json'), JSON.stringify([original]));
    writeFileSync(
      join(dir, 'doc.typ'),
      `#let value = "${escapeTypstString(original)}"\n#let orig = json("orig.json")\n#assert.eq(value, orig.at(0))\n`
    );
    execFileSync('typst', ['compile', join(dir, 'doc.typ'), join(dir, 'doc.pdf')], {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('escapeTypstString', () => {
  for (const value of HOSTILE) {
    test(`round-trips ${JSON.stringify(value)}`, () => {
      expect(compilesToSameString(value)).toBe(true);
    });
  }
});
