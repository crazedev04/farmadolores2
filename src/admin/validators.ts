import { z } from 'zod';

export const dataReportSchema = z.object({
  reason: z.string().trim().min(10, 'Describe el problema con al menos 10 caracteres.').max(500, 'Maximo 500 caracteres.'),
});

export const accountActionSchema = z.object({
  uid: z.string().trim().min(10, 'UID invalido'),
  requestId: z.string().trim().optional(),
});

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .refine((value) => !value || /^https?:\/\//i.test(value), {
    message: 'La URL debe empezar con http:// o https://',
  });

export const farmaciaCrudSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre de la farmacia.'),
  dir: z.string().trim().optional(),
  tel: z.string().trim().optional(),
  detail: z.string().trim().optional(),
  image: optionalUrl,
  gallery: z.string().trim().optional(),
  lat: z.string().trim().optional(),
  lng: z.string().trim().optional(),
}).superRefine((value, ctx) => {
  const hasLat = !!value.lat;
  const hasLng = !!value.lng;
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Debes ingresar latitud y longitud juntas.',
      path: ['lat'],
    });
    return;
  }
  if (hasLat && hasLng) {
    const latNum = Number(value.lat);
    const lngNum = Number(value.lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Latitud y longitud deben ser numeros validos.',
        path: ['lat'],
      });
    }
  }
});

export const emergenciaCrudSchema = farmaciaCrudSchema;

export const localCrudSchema = z.object({
  name: z.string().trim().min(2, 'Ingresa el nombre del negocio.'),
  descrip: z.string().trim().optional(),
  direccion: z.string().trim().optional(),
  tel: z.string().trim().optional(),
  url: optionalUrl,
  image: optionalUrl,
  gallery: z.string().trim().optional(),
});

export type DataReportInput = z.infer<typeof dataReportSchema>;
export type AccountActionInput = z.infer<typeof accountActionSchema>;
export type FarmaciaCrudInput = z.infer<typeof farmaciaCrudSchema>;
export type EmergenciaCrudInput = z.infer<typeof emergenciaCrudSchema>;
export type LocalCrudInput = z.infer<typeof localCrudSchema>;
