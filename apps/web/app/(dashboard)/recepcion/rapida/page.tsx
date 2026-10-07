'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import type {
  PrecioVigente,
  ProveedorCoincidencia,
  RecepcionContexto,
  RetencionPrevia,
} from '@coffee-manager/shared-types';
import { api, ApiError } from '@/lib/api';
import { nuevaLlave } from '@/lib/idempotencia';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/shell/page-header';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { ProveedorBuscador } from '@/components/recepcion/proveedor-buscador';
import { AltaExpressProveedor } from '@/components/recepcion/alta-express-proveedor';
import {
  montoDigitado,
  PAGO_INICIAL,
  PagoEnRecepcion,
  totalAplicado,
  type PagoForm,
} from '@/components/recepcion/pago-en-recepcion';

type Tipo = 'MOJADO' | 'PERGAMINO' | 'PASILLA';

const TIPOS: { valor: Tipo; etiqueta: string }[] = [
  { valor: 'PERGAMINO', etiqueta: 'Pergamino seco' },
  { valor: 'MOJADO', etiqueta: 'Mojado' },
  { valor: 'PASILLA', etiqueta: 'Pasilla' },
];

// Factor FNC: kg de pergamino para una carga de 70 kg de almendra.
const KG_ALMENDRA_POR_CARGA = 70;

const COP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});
const KG = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Acepta coma decimal (se escribe así en Colombia). Vacío o inválido → NaN.
const num = (texto: string) => {
  const t = texto.trim().replace(',', '.');
  return t === '' ? NaN : Number(t);
};
const redondear2 = (n: number) => Math.round(n * 100) / 100;

interface CampoProps {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  sufijo?: string;
  ayuda?: ReactNode;
  disabled?: boolean;
}

// Campo numérico de la pantalla: teclado decimal en el celular, se selecciona
// al entrar y participa de la navegación con Enter (data-nav).
function Campo({ id, etiqueta, valor, onChange, sufijo, ayuda, disabled }: CampoProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{etiqueta}</Label>
      <div className="relative">
        <Input
          id={id}
          data-nav="1"
          inputMode="decimal"
          autoComplete="off"
          enterKeyHint="next"
          value={valor}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.target.select()}
          className={cn('h-12 text-lg', sufijo && 'pr-12')}
        />
        {sufijo && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {sufijo}
          </span>
        )}
      </div>
      {ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

interface RecepcionCreada {
  id: string;
  codigo: string;
  pesoNeto: string | number;
  precioKg: string | number;
  valorTotal: string | number;
  valorRetencion: string | number;
  netoPagar: string | number | null;
}

export default function RecepcionRapidaPage() {
  const formRef = useRef<HTMLFormElement>(null);
  const buscadorRef = useRef<HTMLInputElement>(null);
  const nuevaRef = useRef<HTMLButtonElement>(null);
  // Una llave por intento: reintentar el mismo cuerpo no duplica (ADR-007).
  const intento = useRef<{ llave: string; huella: string } | null>(null);

  const [ctx, setCtx] = useState<RecepcionContexto | null>(null);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  const [proveedor, setProveedor] = useState<ProveedorCoincidencia | null>(null);
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [textoAlta, setTextoAlta] = useState('');
  const [puntoCompraId, setPuntoCompraId] = useState('');
  const [tipo, setTipo] = useState<Tipo>('PERGAMINO');

  const [pesoBruto, setPesoBruto] = useState('');
  const [sacos, setSacos] = useState('');
  const [taraManual, setTaraManual] = useState('');
  const [editarTara, setEditarTara] = useState(false);

  const [humedad, setHumedad] = useState('');
  const [muestra, setMuestra] = useState('');
  const [almendra, setAlmendra] = useState('');
  const [factorManual, setFactorManual] = useState('');
  const [usarFactorManual, setUsarFactorManual] = useState(false);
  const [precioDirecto, setPrecioDirecto] = useState('');
  // Café seco: por calidad (humedad y factor) o a precio por kilo.
  const [modoSeco, setModoSeco] = useState<'CALIDAD' | 'PRECIO_DIRECTO'>('CALIDAD');

  const [precio, setPrecio] = useState<PrecioVigente | null | 'cargando'>(null);
  const [retencion, setRetencion] = useState<RetencionPrevia | null>(null);
  const [pagoForm, setPagoForm] = useState<PagoForm>(PAGO_INICIAL);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [creada, setCreada] = useState<RecepcionCreada | null>(null);
  const [seRegistroPago, setSeRegistroPago] = useState(false);

  useEffect(() => {
    api
      .get<RecepcionContexto>('/recepcion/contexto')
      .then((c) => {
        setCtx(c);
        setModoSeco(c.modoCompraPergamino);
        if (c.puntoCompraIdPorDefecto) setPuntoCompraId(c.puntoCompraIdPorDefecto);
      })
      .catch((e) =>
        setErrorCarga(e instanceof ApiError ? e.message : 'No se pudo cargar la pantalla'),
      );
  }, []);

  useEffect(() => {
    if (ctx && !creada) buscadorRef.current?.focus();
  }, [ctx, creada]);

  // ── Cálculos de vista previa (el servidor recalcula y manda al guardar) ──
  const taraPorSaco = ctx?.taraPorSacoKg ?? null;
  const tara = (() => {
    if (!editarTara && taraPorSaco) {
      const s = num(sacos);
      return Number.isInteger(s) && s > 0 ? redondear2(s * taraPorSaco) : NaN;
    }
    return num(taraManual);
  })();
  const bruto = num(pesoBruto);
  const neto = Number.isFinite(bruto) && Number.isFinite(tara) ? redondear2(bruto - tara) : NaN;

  const factor = (() => {
    if (usarFactorManual) return num(factorManual);
    const m = num(muestra);
    const a = num(almendra);
    return m > 0 && a > 0 ? redondear2((m / a) * KG_ALMENDRA_POR_CARGA) : NaN;
  })();
  const humedadNum = num(humedad);

  // Mojado, pasilla y el café seco "a precio por kilo" llevan el precio digitado.
  const usaPrecioDirecto = tipo !== 'PERGAMINO' || modoSeco === 'PRECIO_DIRECTO';

  // Precio en vivo para pergamino: misma búsqueda que el guardado.
  useEffect(() => {
    if (usaPrecioDirecto || !puntoCompraId || !Number.isFinite(humedadNum) || !Number.isFinite(factor)) {
      setPrecio(null);
      return;
    }
    setPrecio('cargando');
    let vigente = true;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({
        puntoCompraId,
        humedad: String(humedadNum),
        factorRendimiento: String(factor),
      });
      api
        .get<PrecioVigente | null>(`/tabla-precios/precio?${qs}`)
        .then((p) => vigente && setPrecio(p ?? null))
        .catch(() => vigente && setPrecio(null));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [usaPrecioDirecto, puntoCompraId, humedadNum, factor]);

  const precioKg =
    usaPrecioDirecto
      ? num(precioDirecto)
      : precio && precio !== 'cargando'
        ? precio.precioKg
        : NaN;
  const valorTotal = Number.isFinite(neto) && Number.isFinite(precioKg) ? redondear2(neto * precioKg) : NaN;

  // Retención en vivo (solo si el negocio es agente): misma regla del guardado.
  const aplicaRetencion = !!ctx?.esAgenteRetencion && tipo !== 'PASILLA';
  useEffect(() => {
    if (!aplicaRetencion || !Number.isFinite(valorTotal) || valorTotal <= 0) {
      setRetencion(null);
      return;
    }
    let vigente = true;
    const t = setTimeout(() => {
      const qs = new URLSearchParams({ tipoCafe: tipo, valorTotal: String(valorTotal) });
      api
        .get<RetencionPrevia>(`/recepcion/retencion?${qs}`)
        .then((r) => vigente && setRetencion(r))
        .catch(() => vigente && setRetencion(null));
    }, 250);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [aplicaRetencion, tipo, valorTotal]);

  // Neto a pagar de la compra (con retención si aplica): base del pago en el mismo paso.
  const netoAPagar =
    aplicaRetencion && retencion?.aplica ? Number(retencion.netoPagar) : valorTotal;

  // ── Enter avanza al siguiente campo; en el último, guarda ──
  const onFormKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== 'Enter') return;
    const destino = e.target as HTMLElement;
    if (!(destino instanceof HTMLInputElement) || !destino.dataset.nav) return;
    e.preventDefault();
    const campos = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('[data-nav]') ?? [],
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    const i = campos.indexOf(destino);
    if (i >= 0 && i < campos.length - 1) campos[i + 1].focus();
    else formRef.current?.requestSubmit();
  };

  const escogerProveedor = (p: ProveedorCoincidencia | null) => {
    setProveedor(p);
    if (p) {
      if (p.ultimoTipoCafe) setTipo(p.ultimoTipoCafe);
      // Siguiente paso: el peso.
      setTimeout(() => document.getElementById('rr-bruto')?.focus(), 0);
    } else {
      setTimeout(() => buscadorRef.current?.focus(), 0);
    }
  };

  const reiniciar = () => {
    setProveedor(null);
    setPesoBruto('');
    setSacos('');
    setTaraManual('');
    setEditarTara(false);
    setHumedad('');
    setMuestra('');
    setAlmendra('');
    setFactorManual('');
    setPrecioDirecto('');
    setPrecio(null);
    setRetencion(null);
    setPagoForm(PAGO_INICIAL);
    setError(null);
    setCreada(null);
    intento.current = null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!proveedor) return setError('Escoge el proveedor');
    if (!puntoCompraId) return setError('Escoge el punto de compra');
    if (!(bruto > 0)) return setError('Escribe el peso bruto');
    if (!Number.isFinite(tara)) {
      return setError(
        !editarTara && taraPorSaco
          ? 'Escribe el número de sacos (o edita la tara)'
          : 'Escribe la tara',
      );
    }
    if (!(neto > 0)) return setError('El peso neto debe ser mayor a cero: revisa bruto y tara');

    const payload: Record<string, unknown> = {
      proveedorId: proveedor.id,
      puntoCompraId,
      tipoCafe: tipo,
      pesoBruto: bruto,
    };
    const s = num(sacos);
    if (Number.isInteger(s) && s > 0) payload.numeroSacos = s;
    if (editarTara || !taraPorSaco) payload.pesoTara = tara;

    if (!usaPrecioDirecto) {
      if (!Number.isFinite(humedadNum)) return setError('Escribe la humedad');
      if (!Number.isFinite(factor)) {
        return setError(
          usarFactorManual ? 'Escribe el factor' : 'Escribe el peso de la muestra y de la almendra',
        );
      }
      if (precio === 'cargando') return setError('Espera un momento: calculando el precio');
      if (!precio) return setError('No hay tramo de precio para esta calidad. Registra el precio del día.');
      payload.analisisCalidad = usarFactorManual
        ? { humedad: humedadNum, modoFactor: 'MANUAL', factorRendimiento: factor }
        : {
            humedad: humedadNum,
            modoFactor: 'CALCULADO',
            pesoMuestraKg: num(muestra),
            pesoAlmendraMuestraKg: num(almendra),
          };
    } else {
      if (!(precioKg > 0)) return setError('Escribe el precio por kg');
      payload.precioKg = precioKg;
    }

    if (pagoForm.pagarAhora) {
      if (!Number.isFinite(netoAPagar)) return setError('Falta el valor de la compra para poder pagar');
      if (pagoForm.metodo === 'CHEQUE' && !pagoForm.numeroCheque.trim()) {
        return setError('Escribe el número de cheque');
      }
      const aplicado = totalAplicado(pagoForm.aplicado);
      if (aplicado > netoAPagar) {
        return setError('Los anticipos aplicados superan lo que hay que pagar');
      }
      const anticipos = Object.entries(pagoForm.aplicado)
        .map(([anticipoId, texto]) => ({ anticipoId, montoAplicado: montoDigitado(texto) }))
        .filter((a) => a.montoAplicado > 0);
      payload.pago = {
        metodoPago: pagoForm.metodo,
        ...(pagoForm.metodo === 'CHEQUE' ? { numeroCheque: pagoForm.numeroCheque.trim() } : {}),
        ...(anticipos.length > 0 ? { anticipos } : {}),
      };
    }

    // Mismo cuerpo → misma llave (reintento seguro); cuerpo distinto → llave nueva.
    const huella = JSON.stringify(payload);
    if (!intento.current || intento.current.huella !== huella) {
      intento.current = { llave: nuevaLlave(), huella };
    }

    setGuardando(true);
    try {
      const r = await api.post<RecepcionCreada>('/recepcion', payload, {
        'Idempotency-Key': intento.current.llave,
      });
      setCreada(r);
      setSeRegistroPago(!!payload.pago);
      setTimeout(() => nuevaRef.current?.focus(), 0);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Sin conexión. Vuelve a oprimir Guardar: no se duplicará.',
      );
    } finally {
      setGuardando(false);
    }
  };

  if (errorCarga) {
    return (
      <div className="p-4 sm:p-8">
        <PageHeader title="Recepción rápida" />
        <p role="alert" className="mt-6 text-sm text-destructive">
          {errorCarga}
        </p>
      </div>
    );
  }

  if (creada) {
    return (
      <div className="p-4 sm:p-8">
        <PageHeader title="Recepción guardada" />
        <div className="mt-6 max-w-md rounded-lg border bg-card p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Código</p>
          <p className="text-2xl font-semibold">{creada.codigo}</p>
          <p className="mt-1 text-sm text-muted-foreground">{proveedor?.nombre}</p>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Neto</dt>
              <dd className="font-medium">{KG.format(Number(creada.pesoNeto))} kg</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Precio/kg</dt>
              <dd className="font-medium">{COP.format(Number(creada.precioKg))}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-semibold">{COP.format(Number(creada.valorTotal))}</dd>
            </div>
          </dl>
          {Number(creada.valorRetencion) > 0 && (
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Retención en la fuente</dt>
                <dd className="font-medium">{COP.format(Number(creada.valorRetencion))}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Neto a pagar</dt>
                <dd className="text-lg font-semibold">{COP.format(Number(creada.netoPagar))}</dd>
              </div>
            </dl>
          )}
          <p className="mt-4 text-sm font-medium">
            {seRegistroPago ? 'Pago registrado en este paso.' : 'Queda por pagar.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button ref={nuevaRef} type="button" size="lg" onClick={reiniciar} className="h-12 flex-1">
              Nueva recepción
            </Button>
            <Link
              href={`/recepcion/${creada.id}`}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-12')}
            >
              Ver detalle
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const puntos = ctx?.puntosCompra ?? [];

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Recepción rápida"
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/ayuda#comprar-cafe-recepcion"
              className={buttonVariants({ variant: 'ghost', size: 'sm' })}
            >
              ¿Cómo se usa?
            </Link>
          <Link
            href="/recepcion/nueva"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Formulario completo
          </Link>
          </div>
        }
      />

      <form
        ref={formRef}
        onSubmit={onSubmit}
        onKeyDown={onFormKeyDown}
        className="mt-4 flex max-w-xl flex-col gap-5"
        noValidate
      >
        <section className="flex flex-col gap-1.5">
          <Label>Proveedor</Label>
          <ProveedorBuscador
            ref={buscadorRef}
            value={proveedor}
            onSelect={escogerProveedor}
            onNuevo={(texto) => {
              setTextoAlta(texto);
              setAltaAbierta(true);
            }}
          />
        </section>

        {puntos.length > 1 && (
          <section className="flex flex-col gap-1.5">
            <Label htmlFor="rr-punto">Punto de compra</Label>
            <Select
              id="rr-punto"
              value={puntoCompraId}
              onChange={(e) => setPuntoCompraId(e.target.value)}
              className="h-12 text-base"
            >
              <option value="">Selecciona…</option>
              {puntos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </section>
        )}

        <section aria-label="Tipo de café" className="grid grid-cols-3 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.valor}
              type="button"
              onClick={() => setTipo(t.valor)}
              aria-pressed={tipo === t.valor}
              className={cn(
                'min-h-12 rounded-md border px-2 text-sm font-medium transition-colors',
                tipo === t.valor
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent',
              )}
            >
              {t.etiqueta}
            </button>
          ))}
        </section>

        <section className="grid grid-cols-2 gap-3">
          <Campo id="rr-bruto" etiqueta="Peso bruto" sufijo="kg" valor={pesoBruto} onChange={setPesoBruto} />
          {!editarTara && taraPorSaco ? (
            <Campo
              id="rr-sacos"
              etiqueta="Sacos"
              valor={sacos}
              onChange={setSacos}
              ayuda={
                Number.isFinite(tara) ? (
                  <>
                    Tara {KG.format(tara)} kg ·{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setEditarTara(true)}
                    >
                      editar
                    </button>
                  </>
                ) : (
                  <>
                    {KG.format(taraPorSaco)} kg por saco ·{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setEditarTara(true)}
                    >
                      digitar tara
                    </button>
                  </>
                )
              }
            />
          ) : (
            <Campo
              id="rr-tara"
              etiqueta="Tara"
              sufijo="kg"
              valor={taraManual}
              onChange={setTaraManual}
              ayuda={
                taraPorSaco ? (
                  <button type="button" className="underline" onClick={() => setEditarTara(false)}>
                    usar sacos
                  </button>
                ) : (
                  'Configura el peso del saco para calcularla con los sacos.'
                )
              }
            />
          )}
        </section>

        {tipo === 'PERGAMINO' && (
          <section aria-label="Cómo compras el café seco" className="flex flex-col gap-1.5">
            <Label>¿Cómo lo compras?</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['CALIDAD', 'Por calidad'],
                  ['PRECIO_DIRECTO', 'A precio por kilo'],
                ] as const
              ).map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => setModoSeco(valor)}
                  aria-pressed={modoSeco === valor}
                  className={cn(
                    'min-h-11 rounded-md border px-2 text-sm transition-colors',
                    modoSeco === valor
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'border-input bg-background hover:bg-accent',
                  )}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {modoSeco === 'CALIDAD'
                ? 'Mides humedad y factor y el precio sale de la tabla del día.'
                : 'Escribes el precio por kilo que acordaste, sin medir calidad.'}
            </p>
          </section>
        )}

        {!usaPrecioDirecto ? (
          <section className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Campo id="rr-humedad" etiqueta="Humedad" sufijo="%" valor={humedad} onChange={setHumedad} />
              {usarFactorManual ? (
                <Campo
                  id="rr-factor"
                  etiqueta="Factor"
                  valor={factorManual}
                  onChange={setFactorManual}
                  ayuda={
                    <button type="button" className="underline" onClick={() => setUsarFactorManual(false)}>
                      calcular con la muestra
                    </button>
                  }
                />
              ) : (
                <div className="flex flex-col justify-end pb-1 text-sm">
                  <span className="text-muted-foreground">Factor</span>
                  <span className="text-lg font-semibold">
                    {Number.isFinite(factor) ? KG.format(factor) : '—'}
                  </span>
                  <button
                    type="button"
                    className="w-fit text-xs text-muted-foreground underline"
                    onClick={() => setUsarFactorManual(true)}
                  >
                    digitar factor
                  </button>
                </div>
              )}
            </div>
            {!usarFactorManual && (
              <div className="grid grid-cols-2 gap-3">
                <Campo id="rr-muestra" etiqueta="Muestra" sufijo="kg" valor={muestra} onChange={setMuestra} />
                <Campo id="rr-almendra" etiqueta="Almendra" sufijo="kg" valor={almendra} onChange={setAlmendra} />
              </div>
            )}
          </section>
        ) : (
          <section>
            <Campo
              id="rr-precio"
              etiqueta="Precio por kg (negociado)"
              sufijo="$"
              valor={precioDirecto}
              onChange={setPrecioDirecto}
            />
          </section>
        )}

        <section
          aria-live="polite"
          className="rounded-lg border bg-muted/40 p-4"
          data-testid="resumen"
        >
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Neto</p>
              <p className="text-lg font-semibold">{Number.isFinite(neto) ? `${KG.format(neto)} kg` : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Precio/kg</p>
              <p className="text-lg font-semibold">
                {precio === 'cargando' && !usaPrecioDirecto
                  ? '…'
                  : Number.isFinite(precioKg)
                    ? COP.format(precioKg)
                    : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total</p>
              <p className="text-lg font-semibold">
                {Number.isFinite(valorTotal) ? COP.format(valorTotal) : '—'}
              </p>
            </div>
          </div>
          {retencion?.aplica && (
            <div className="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm">
              <div>
                <p className="text-muted-foreground">
                  Retención ({(Number(retencion.tarifaRetencion) * 100).toLocaleString('es-CO')} %)
                </p>
                <p className="text-lg font-semibold">{COP.format(Number(retencion.valorRetencion))}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Neto a pagar</p>
                <p className="text-lg font-semibold">{COP.format(Number(retencion.netoPagar))}</p>
              </div>
            </div>
          )}
          {!usaPrecioDirecto && precio === null && Number.isFinite(factor) && Number.isFinite(humedadNum) && (
            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
              No hay tramo de precio para esta calidad. Registra el precio del día en Precios.
            </p>
          )}
        </section>

        <PagoEnRecepcion
          proveedorId={proveedor?.id ?? null}
          neto={netoAPagar}
          value={pagoForm}
          onChange={setPagoForm}
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={guardando || !ctx} className="h-14 text-base">
          {guardando ? 'Guardando…' : 'Guardar recepción'}
        </Button>
      </form>

      <AltaExpressProveedor
        open={altaAbierta}
        onOpenChange={setAltaAbierta}
        textoInicial={textoAlta}
        onCreado={escogerProveedor}
      />
    </div>
  );
}
