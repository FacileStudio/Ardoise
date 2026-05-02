import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const filePath = resolve(import.meta.dir, '../src/zod/index.ts');

const replacements: Array<[string, string]> = [
  [
    "export const DecimalJsLikeSchema = z.object({\n  d: z.array(z.number()),\n  e: z.number(),\n  s: z.number(),\n  toFixed: z.any(),\n});",
    "export const DecimalJsLikeSchema = z.object({\n  d: z.array(z.number()),\n  e: z.number(),\n  s: z.number(),\n  toFixed: z.any(),\n}) as unknown as z.ZodType<Prisma.DecimalJsLike>;",
  ],
  [
    "export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value);",
    "export const NullableJsonNullValueInputSchema = z.enum(['DbNull','JsonNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value) as unknown as z.ZodType<Prisma.NullableJsonNullValueInput>;",
  ],
  [
    "export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value));",
    "export const JsonNullValueInputSchema = z.enum(['JsonNull',]).transform((value) => (value === 'JsonNull' ? Prisma.JsonNull : value)) as unknown as z.ZodType<Prisma.JsonNullValueInput>;",
  ],
  [
    "export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value === 'AnyNull' ? Prisma.AnyNull : value);",
    "export const JsonNullValueFilterSchema = z.enum(['DbNull','JsonNull','AnyNull',]).transform((value) => value === 'JsonNull' ? Prisma.JsonNull : value === 'DbNull' ? Prisma.DbNull : value === 'AnyNull' ? Prisma.AnyNull : value) as unknown as z.ZodType<Prisma.JsonNullValueFilter>;",
  ],
];

let contents = readFileSync(filePath, 'utf8');

for (const [before, after] of replacements) {
  if (!contents.includes(before) && !contents.includes(after)) {
    throw new Error(`Expected snippet not found in ${filePath}`);
  }

  contents = contents.replace(before, after);
}

writeFileSync(filePath, contents);
