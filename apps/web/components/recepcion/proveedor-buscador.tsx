'use client';

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import type { ProveedorCoincidencia } from '@coffee-manager/shared-types';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ProveedorBuscadorProps {
  value: ProveedorCoincidencia | null;
  onSelect: (proveedor: ProveedorCoincidencia | null) => void;
  // El operador pidió crear uno nuevo; recibe lo que ya había escrito.
  onNuevo: (textoEscrito: string) => void;
  className?: string;
}

const ESPERA_MS = 150;

// Buscador de proveedor por cédula, nombre o apodo mientras se escribe.
// Flechas para moverse, Enter para escoger, Escape para cerrar. La última
// opción siempre es "Nuevo proveedor", así el alta exprés queda a una tecla.
export const ProveedorBuscador = forwardRef<HTMLInputElement, ProveedorBuscadorProps>(
  function ProveedorBuscador({ value, onSelect, onNuevo, className }, ref) {
    const listId = useId();
    const [texto, setTexto] = useState('');
    const [resultados, setResultados] = useState<ProveedorCoincidencia[]>([]);
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [falloRed, setFalloRed] = useState(false);
    // Solo vale la respuesta de la última búsqueda lanzada.
    const ultimaBusqueda = useRef(0);

    useEffect(() => {
      const q = texto.trim();
      if (!q) {
        ultimaBusqueda.current++;
        setResultados([]);
        setCargando(false);
        return;
      }
      setCargando(true);
      const temporizador = setTimeout(() => {
        const numero = ++ultimaBusqueda.current;
        api
          .get<ProveedorCoincidencia[]>(`/proveedores/buscar?q=${encodeURIComponent(q)}`)
          .then((filas) => {
            if (numero !== ultimaBusqueda.current) return;
            setResultados(filas);
            setActivo(0);
            setFalloRed(false);
          })
          .catch(() => {
            if (numero !== ultimaBusqueda.current) return;
            setResultados([]);
            setFalloRed(true);
          })
          .finally(() => {
            if (numero === ultimaBusqueda.current) setCargando(false);
          });
      }, ESPERA_MS);
      return () => clearTimeout(temporizador);
    }, [texto]);

    const escoger = (p: ProveedorCoincidencia) => {
      onSelect(p);
      setTexto('');
      setAbierto(false);
    };

    // El último ítem de la lista es "Nuevo proveedor".
    const totalOpciones = resultados.length + 1;
    const indiceNuevo = resultados.length;

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAbierto(true);
        setActivo((i) => (i + 1) % totalOpciones);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivo((i) => (i - 1 + totalOpciones) % totalOpciones);
      } else if (e.key === 'Enter') {
        // Enter aquí escoge; no debe saltar al siguiente campo del formulario.
        e.preventDefault();
        e.stopPropagation();
        if (!texto.trim()) return;
        if (activo === indiceNuevo || resultados.length === 0) {
          if (!cargando) onNuevo(texto.trim());
        } else {
          escoger(resultados[activo]);
        }
      } else if (e.key === 'Escape') {
        setAbierto(false);
      }
    };

    if (value) {
      return (
        <div
          className={cn(
            'flex min-h-12 items-center justify-between gap-3 rounded-md border border-primary/40 bg-primary/5 px-3 py-2',
            className,
          )}
        >
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">
              {value.nombre}
              {value.apodo ? (
                <span className="font-normal text-muted-foreground"> · “{value.apodo}”</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {value.tipoIdentificacion} {value.numeroIdentificacion}
              {value.municipio ? ` · ${value.municipio}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="flex h-9 shrink-0 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-accent"
            aria-label="Cambiar proveedor"
          >
            <X className="h-4 w-4" /> Cambiar
          </button>
        </div>
      );
    }

    const hayTexto = texto.trim().length > 0;
    return (
      <div className={cn('relative', className)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={ref}
          role="combobox"
          aria-expanded={abierto && hayTexto}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Buscar proveedor por cédula, nombre o apodo"
          autoComplete="off"
          autoCapitalize="none"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onBlur={() => setTimeout(() => setAbierto(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Cédula, nombre o apodo…"
          className="flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-3 text-base shadow-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        {abierto && hayTexto && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-card shadow-lg"
          >
            {resultados.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={i === activo}
                // mousedown (no click): el input pierde el foco antes del click.
                onMouseDown={(e) => {
                  e.preventDefault();
                  escoger(p);
                }}
                onMouseEnter={() => setActivo(i)}
                className={cn(
                  'cursor-pointer px-3 py-2.5',
                  i === activo && 'bg-accent text-accent-foreground',
                )}
              >
                <p className="text-sm font-medium">
                  {p.nombre}
                  {p.apodo ? (
                    <span className="font-normal text-muted-foreground"> · “{p.apodo}”</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {p.tipoIdentificacion} {p.numeroIdentificacion}
                  {p.municipio ? ` · ${p.municipio}` : ''}
                </p>
              </li>
            ))}
            {!cargando && resultados.length === 0 && (
              <li className="px-3 py-2 text-xs text-muted-foreground">
                {falloRed ? 'No se pudo buscar. Revisa la conexión.' : 'Sin coincidencias.'}
              </li>
            )}
            <li
              role="option"
              aria-selected={activo === indiceNuevo}
              onMouseDown={(e) => {
                e.preventDefault();
                onNuevo(texto.trim());
              }}
              onMouseEnter={() => setActivo(indiceNuevo)}
              className={cn(
                'flex cursor-pointer items-center gap-2 border-t px-3 py-2.5 text-sm font-medium text-primary',
                activo === indiceNuevo && 'bg-accent',
              )}
            >
              <UserPlus className="h-4 w-4" /> Nuevo proveedor “{texto.trim()}”
            </li>
          </ul>
        )}
      </div>
    );
  },
);
