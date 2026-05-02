import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve(import.meta.dir, '../src/zod/index.ts');

const replacements: Array<{
  next: string;
  pattern: RegExp;
}> = [
  {
    pattern: /export const DecimalJsLikeSchema = z\.object\(\{[\s\S]*?\}\);/,
    next:
      "export const DecimalJsLikeSchema = z.object({\n  d: z.array(z.number()),\n  e: z.number(),\n  s: z.number(),\n  toFixed: z.any(),\n}) as unknown as z.ZodType<Prisma.DecimalJsLike>;",
  },
  {
    pattern:
      /export const NullableJsonNullValueInputSchema = z\.enum\(\['DbNull','JsonNull',\]\)\.transform\(\(value\) => value === 'JsonNull' \? Prisma\.JsonNull : value === 'DbNull' \? Prisma\.DbNull : value\);/,
    next:
      "export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value) as unknown as z.ZodType<Prisma.NullableJsonNullValueInput>;",
  },
  {
    pattern:
      /export const JsonNullValueInputSchema = z\.enum\(\['JsonNull',\]\)\.transform\(\(value\) => \(value === 'JsonNull' \? Prisma\.JsonNull : value\)\);/,
    next:
      "export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value)) as unknown as z.ZodType<Prisma.JsonNullValueInput>;",
  },
  {
    pattern:
      /export const JsonNullValueFilterSchema = z\.enum\(\['DbNull','JsonNull','AnyNull',\]\)\.transform\(\(value\) => value === 'JsonNull' \? Prisma\.JsonNull : value === 'DbNull' \? Prisma\.DbNull : value === 'AnyNull' \? Prisma\.AnyNull : value\);/,
    next:
      "export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value === 'AnyNull' ? Prisma.AnyNull : value) as unknown as z.ZodType<Prisma.JsonNullValueFilter>;",
  },
];

let contents = readFileSync(filePath, 'utf8');

for (const { pattern, next } of replacements) {
  if (!pattern.test(contents) && !contents.includes(next)) {
    throw new Error(`Expected snippet not found in ${filePath}`);
  }

  contents = contents.replace(pattern, next);
}

writeFileSync(filePath, contents);
