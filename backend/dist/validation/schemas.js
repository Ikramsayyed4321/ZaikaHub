import { z } from 'zod';
export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});
export const userSchema = z.object({
    restaurant_id: z.number().int().positive().optional().nullable(),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    password: z.string().min(6).optional(),
    role: z.enum(['admin', 'waiter', 'cashier']),
    is_active: z.boolean().optional(),
});
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().optional().default(''),
    sort: z.string().optional().default('id'),
    direction: z.enum(['asc', 'desc']).optional().default('desc'),
});
