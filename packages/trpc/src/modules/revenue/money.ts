import { Prisma } from '@repo/database';

export type Money = Prisma.Decimal;

export const ZERO = new Prisma.Decimal(0);

export const decimal = (value: unknown): Money => new Prisma.Decimal(String(value ?? 0));

export const sum = (values: Money[]): Money =>
  values.reduce((total, value) => total.plus(value), ZERO);

export const format = (value: Money): string => value.toFixed(2);
