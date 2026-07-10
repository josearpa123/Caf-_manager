'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { proveedorSchema, type ProveedorFormValues } from '@coffee-manager/validation-schemas';
import { TipoIdentificacion } from '@coffee-manager/shared-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const TIPO_IDENTIFICACION_LABELS: Record<string, string> = {
  CC: 'Cédula de ciudadanía',
  NIT: 'NIT',
  CE: 'Cédula de extranjería',
  TI: 'Tarjeta de identidad',
  PASAPORTE: 'Pasaporte',
};

interface ProveedorFormProps {
  defaultValues?: Partial<ProveedorFormValues>;
  onSubmit: (values: ProveedorFormValues) => Promise<void>;
  submitLabel: string;
  serverError?: string | null;
}

export function ProveedorForm({
  defaultValues,
  onSubmit,
  submitLabel,
  serverError,
}: ProveedorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProveedorFormValues>({
    resolver: zodResolver(proveedorSchema),
    defaultValues: {
      tipoIdentificacion: TipoIdentificacion.CC,
      numeroIdentificacion: '',
      nombre: '',
      telefono: '',
      whatsapp: '',
      vereda: '',
      municipio: '',
      departamento: '',
      notas: '',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-xl flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tipoIdentificacion">Tipo de identificación</Label>
          <Select id="tipoIdentificacion" {...register('tipoIdentificacion')}>
            {Object.values(TipoIdentificacion).map((tipo) => (
              <option key={tipo} value={tipo}>
                {TIPO_IDENTIFICACION_LABELS[tipo] ?? tipo}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="numeroIdentificacion">Número de identificación</Label>
          <Input id="numeroIdentificacion" {...register('numeroIdentificacion')} />
          {errors.numeroIdentificacion && (
            <p className="text-xs text-destructive">
              {errors.numeroIdentificacion.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nombre">Nombre completo</Label>
        <Input id="nombre" {...register('nombre')} />
        {errors.nombre && (
          <p className="text-xs text-destructive">{errors.nombre.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="telefono">Teléfono</Label>
          <Input id="telefono" {...register('telefono')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="whatsapp">WhatsApp</Label>
          <Input id="whatsapp" {...register('whatsapp')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="vereda">Vereda</Label>
          <Input id="vereda" {...register('vereda')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="municipio">Municipio</Label>
          <Input id="municipio" {...register('municipio')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="departamento">Departamento</Label>
          <Input id="departamento" {...register('departamento')} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notas">Notas</Label>
        <Input id="notas" {...register('notas')} />
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Guardando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
