import { describe, expect, it } from 'bun:test';
import { injectVariables } from './service';

describe('injectVariables', () => {
  it('does not expand placeholders found inside user supplied values', () => {
    const out = injectVariables('#let a = "{{a}}"\n#let b = "{{b}}"\n#let items = ({{items}})', {
      a: 'x {{b}} {{items}}',
      b: 'real',
      items: '(description: "d", quantity: 1, unit: "u", price: 2),',
    });

    expect(out).toContain('#let a = "x {{b}} {{items}}"');
    expect(out).toContain('#let b = "real"');
  });

  it('escapes quotes and blanks unknown placeholders', () => {
    expect(injectVariables('"{{a}}" "{{missing}}" {{tva_rate}}', { a: 'say "hi"' })).toBe(
      '"say \\"hi\\"" "" 0.00'
    );
  });
});
