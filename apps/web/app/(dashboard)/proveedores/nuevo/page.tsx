'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProveedorFormValues } from '@coffee-manager/validation-schemas';
import { api, ApiError } from '@/lib/api';
import { PageHeader } from '@/components/shell/page-header';
import { ProveedorForm } from '@/components/proveedores/proveedor-form';

export default function NuevoProveedorPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const onSubmit = async (values: ProveedorFormValues) => {
    setServerError(null);
    try {
      await api.post('/proveedores', values);
      router.push('/proveedores');
    } catch (error) {
      setServerError(
        error instanceof ApiError ? error.message : 'No se pudo crear el proveedor',
      );
    }
  };

  return (
    <div className="p-8">
      <PageHeader title="Nuevo proveedor" />
      <div className="mt-6">
        <ProveedorForm onSubmit={onSubmit} submitLabel="Crear proveedor" serverError={serverError} />
      </div>
    </div>
  );
}
