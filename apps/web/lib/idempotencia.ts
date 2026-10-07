import { useRef } from 'react';

export function nuevaLlave(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

// Mismo cuerpo → misma llave (un reintento por mala señal no duplica); cuerpo distinto →
// llave nueva (ADR-007: misma llave con otro cuerpo daría 409).
export function useLlaveIdempotencia() {
  const intento = useRef<{ llave: string; huella: string } | null>(null);
  return (cuerpo: unknown): { 'Idempotency-Key': string } => {
    const huella = JSON.stringify(cuerpo);
    if (!intento.current || intento.current.huella !== huella) {
      intento.current = { llave: nuevaLlave(), huella };
    }
    return { 'Idempotency-Key': intento.current.llave };
  };
}
