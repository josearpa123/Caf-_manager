'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Proveedor } from '@coffee-manager/shared-types';
import type { ProveedorFormValues } from '@coffee-manager/validation-schemas';
import { api, ApiError } from '@/lib/api';
import { ProveedorForm } from '@/components/proveedores/proveedor-form';

export default function EditarProveedorPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Proveedor>(`/proveedores/${params.id}`)
      .then(setProveedor)
      .catch((error) =>
        setLoadError(
          error instanceof ApiError ? error.message : 'No se pudo cargar el proveedor',
        ),
      );
  }, [params.id]);

  const onSubmit = async (values: ProveedorFormValues) => {
    setServerError(null);
    try {
      await api.patch(`/proveedores/${params.id}`, values);
      router.push('/proveedores');
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'No se pudo actualizar el proveedor',
      );
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Editar proveedor</h1>
      <div className="mt-6">
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
        {!loadError && !proveedor && (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        )}
        {proveedor && (
          <ProveedorForm
            defaultValues={{
              tipoIdentificacion: proveedor.tipoIdentificacion,
              numeroIdentificacion: proveedor.numeroIdentificacion,
              nombre: proveedor.nombre,
              telefono: proveedor.telefono ?? '',
              whatsapp: proveedor.whatsapp ?? '',
              vereda: proveedor.vereda ?? '',
              municipio: proveedor.municipio ?? '',
              departamento: proveedor.departamento ?? '',
              notas: proveedor.notas ?? '',
            }}
            onSubmit={onSubmit}
            submitLabel="Guardar cambios"
            serverError={serverError}
          />
        )}
      </div>
    </div>
  );
}
