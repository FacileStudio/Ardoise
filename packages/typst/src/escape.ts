const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export function escapeTypstString(value: unknown): string {
  return String(value ?? '')
    .replace(CONTROL_CHARACTERS, '')
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replace(/\r?\n/g, '\\n')
    .replaceAll('\t', '\\t');
}
