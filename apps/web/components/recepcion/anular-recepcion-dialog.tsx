'use client';

import { useRef, useState } from 'react';
import type { Recepcion } from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { nuevaLlave } from '@/lib/idempotencia';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const MIN_MOTIVO = 10;

interface Props {
  recepcion: Pick<Recepcion, 'id' | 'codigo'>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnulada: (recepcion: Recepcion) => void;
}

// CU-02: anular pide un motivo (mínimo 10 caracteres). Mismo motivo → misma llave de
// idempotencia, así un reintento por mala señal no duplica la anulación (ADR-007).
export function AnularRecepcionDialog({ recepcion, open, onOpenChange, onAnulada }: Props) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intento = useRef<{ llave: string; motivo: string } | null>(null);

  const motivoLimpio = motivo.trim();
  const valido = motivoLimpio.length >= MIN_MOTIVO;

  async function anular() {
    if (!valido || enviando) return;
    if (intento.current?.motivo !== motivoLimpio) {
      intento.current = { llave: nuevaLlave(), motivo: motivoLimpio };
    }
    setEnviando(true);
    setError(null);
    try {
      const anulada = await api.post<Recepcion>(
        `/recepcion/${recepcion.id}/anular`,
        { motivo: motivoLimpio },
        { 'Idempotency-Key': intento.current.llave },
      );
      onOpenChange(false);
      onAnulada(anulada);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo anular la recepción');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !enviando && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader onClose={() => !enviando && onOpenChange(false)}>
          <DialogTitle>Anular {recepcion.codigo}</DialogTitle>
          <DialogDescription>
            La recepción no se borra: queda marcada como anulada, el café sale del inventario y
            se anulan los pagos y anticipos aplicados a ella. Esto no se puede deshacer; si fue
            un error, registra una recepción nueva.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-2">
          <Label htmlFor="motivo-anulacion">Motivo (obligatorio)</Label>
          <textarea
            id="motivo-anulacion"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            maxLength={500}
            autoFocus
            placeholder="Ej.: se digitó mal el peso"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {!valido && motivo.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Escribe al menos {MIN_MOTIVO} caracteres.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={anular} disabled={!valido || enviando}>
            {enviando ? 'Anulando…' : 'Anular recepción'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
