export * from "@repo/database";

export type { Contact, Prisma } from "@repo/database";

export type ContactCreateInput = Omit<
  import("@repo/database").Contact,
  "id" | "createdAt"
>;
export type ContactUpdateInput = Partial<ContactCreateInput>;

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
