import { z } from "zod";

export const emailValidator = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const passwordValidator = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const nameValidator = z
  .string()
  .min(1, "This field is required")
  .max(50, "Name must be less than 50 characters");

export const userSchema = z.object({
  email: emailValidator,
  name: nameValidator,
  password: passwordValidator,
});

export const loginSchema = z.object({
  email: emailValidator,
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: emailValidator,
  password: passwordValidator,
  firstName: nameValidator,
  lastName: nameValidator,
});

export const contactSchema = z.object({
  email: emailValidator,
  firstName: nameValidator,
  lastName: nameValidator,
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const adminLoginSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

export type UserInput = z.infer<typeof userSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
