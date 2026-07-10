import type { BadgeProps } from '@/components/ui/badge';

// Mapea los tipos de café (recepción e inventario) a una variante de Badge
// consistente en toda la app.
const TIPO_CAFE_VARIANT: Record<string, NonNullable<BadgeProps['variant']>> = {
  PERGAMINO: 'primary',
  MOJADO: 'warning',
  ALMENDRA: 'success',
  PASILLA: 'neutral',
};

export function tipoCafeVariant(tipo: string): NonNullable<BadgeProps['variant']> {
  return TIPO_CAFE_VARIANT[tipo] ?? 'neutral';
}
