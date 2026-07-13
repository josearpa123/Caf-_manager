import Link from 'next/link';
import { Lock } from 'lucide-react';
import { MODULOS, type Modulo } from '@coffee-manager/shared-types';
import { buttonVariants } from '@/components/ui/button';

// Pantalla para cuando el tenant llega a un módulo que su plan no incluye: el
// menú ya no lo muestra, pero una URL guardada sí llega hasta acá. Sin esto la
// página se renderizaba con sus tablas vacías y parecía que no había datos,
// cuando lo que pasa es que el módulo no está contratado.
export function ModuloBloqueado({ modulo, volverHref }: { modulo: Modulo; volverHref: string }) {
  const info = MODULOS.find((m) => m.value === modulo);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="mt-5 font-display text-[1.65rem] leading-tight tracking-tight">
          {info?.label ?? 'Este módulo'} no está en tu plan
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {info ? `${info.descripcion}. ` : ''}
          No está incluido en el plan de tu empresa, así que aquí no hay nada que mostrar. Si lo
          necesitas, contacta al administrador para habilitarlo.
        </p>
        <Link
          href={volverHref}
          className={`${buttonVariants({ variant: 'outline' })} mt-6`}
        >
          Volver
        </Link>
      </div>
    </div>
  );
}
