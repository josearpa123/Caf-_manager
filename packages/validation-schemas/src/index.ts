import { z } from 'zod';
import { TipoIdentificacion } from '@coffee-manager/shared-types';

export const proveedorSchema = z.object({
  tipoIdentificacion: z.nativeEnum(TipoIdentificacion),
  numeroIdentificacion: z.string().trim().min(1, 'Requerido'),
  nombre: z.string().trim().min(1, 'Requerido'),
  telefono: z.string().trim().optional().or(z.literal('')),
  whatsapp: z.string().trim().optional().or(z.literal('')),
  vereda: z.string().trim().optional().or(z.literal('')),
  municipio: z.string().trim().optional().or(z.literal('')),
  departamento: z.string().trim().optional().or(z.literal('')),
  notas: z.string().trim().optional().or(z.literal('')),
});

export type ProveedorFormValues = z.infer<typeof proveedorSchema>;

