import { z } from 'zod';

export const dataReportSchema = z.object({
  reason: z.string().trim().min(10, 'Describe el problema con al menos 10 caracteres.').max(500, 'Maximo 500 caracteres.'),
});

export const accountActionSchema = z.object({
  uid: z.string().trim().min(10, 'UID invalido'),
  requestId: z.string().trim().optional(),
});

export type DataReportInput = z.infer<typeof dataReportSchema>;
export type AccountActionInput = z.infer<typeof accountActionSchema>;
