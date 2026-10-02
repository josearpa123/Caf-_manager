'use client';

import { useEffect, useState, type FormEvent } from 'react';
import type { Proveedor, ProveedorCoincidencia } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

interface AltaExpressProveedorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Lo que el operador ya había escrito en el buscador: se reparte entre cédula o nombre.
  textoInicial: string;
  onCreado: (proveedor: ProveedorCoincidencia) => void;
}

const TIPOS = ['CC', 'NIT', 'CE', 'TI', 'PASAPORTE'] as const;

// Alta exprés (CU-01 flujo 2a): lo mínimo para seguir con la recepción sin
// perder lo digitado. El resto de datos del proveedor se completa después.
export function AltaExpressProveedor({
  open,
  onOpenChange,
  textoInicial,
  onCreado,
}: AltaExpressProveedorProps) {
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>('CC');
  const [numero, setNumero] = useState('');
  const [apodo, setApodo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!open) return;
    const texto = textoInicial.trim();
    const esNumero = /^[\d.\s-]+$/.test(texto);
    setNumero(esNumero ? texto.replace(/\D/g, '') : '');
    setNombre(esNumero ? '' : texto);
    setTipo('CC');
    setApodo('');
    setError(null);
  }, [open, textoInicial]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim() || !numero.trim()) {
      setError('Escribe el nombre y la cédula');
      return;
    }
    setGuardando(true);
    try {
      const p = await api.post<Proveedor>('/proveedores', {
        tipoIdentificacion: tipo,
        numeroIdentificacion: numero.trim(),
        nombre: nombre.trim(),
        apodo: apodo.trim() || undefined,
      });
      onCreado({
        id: p.id,
        nombre: p.nombre,
        apodo: p.apodo ?? null,
        tipoIdentificacion: p.tipoIdentificacion,
        numeroIdentificacion: p.numeroIdentificacion,
        telefono: p.telefono ?? null,
        municipio: p.municipio ?? null,
        ultimoTipoCafe: null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el proveedor');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader onClose={() => onOpenChange(false)}>
            <DialogTitle>Nuevo proveedor</DialogTitle>
            <DialogDescription>
              Solo lo mínimo; lo demás se completa después. Lo que ya digitaste se conserva.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alta-nombre">Nombre</Label>
              <Input
                id="alta-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoFocus={!nombre}
                className="h-11 text-base"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="alta-tipo">Tipo</Label>
                <Select
                  id="alta-tipo"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as (typeof TIPOS)[number])}
                  className="h-11 text-base"
                >
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="alta-numero">Número</Label>
                <Input
                  id="alta-numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  inputMode="numeric"
                  autoFocus={!!nombre}
                  className="h-11 text-base"
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alta-apodo">Apodo (opcional)</Label>
              <Input
                id="alta-apodo"
                value={apodo}
                onChange={(e) => setApodo(e.target.value)}
                className="h-11 text-base"
                autoComplete="off"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar y seguir'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
