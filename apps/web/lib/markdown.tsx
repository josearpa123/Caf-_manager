import { Fragment, type ReactNode } from 'react';

// Renderizador mínimo de Markdown para el manual (sin dependencias): títulos
// (#, ##, ###), párrafos, listas con viñetas o numeradas, citas (>), línea
// (---), **negrita**, `código` y [enlaces](url). No es un Markdown completo:
// el manual se escribe dentro de estas reglas.

export function slug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type Bloque =
  | { tipo: 'h1' | 'h2' | 'h3'; texto: string }
  | { tipo: 'p'; texto: string }
  | { tipo: 'cita'; texto: string }
  | { tipo: 'ul' | 'ol'; items: string[] }
  | { tipo: 'hr' };

function parsear(fuente: string): Bloque[] {
  const lineas = fuente.replace(/\r\n/g, '\n').split('\n');
  const bloques: Bloque[] = [];
  let parrafo: string[] = [];
  let cita: string[] = [];
  let lista: { tipo: 'ul' | 'ol'; items: string[] } | null = null;

  const cerrar = () => {
    if (parrafo.length) bloques.push({ tipo: 'p', texto: parrafo.join(' ') });
    if (cita.length) bloques.push({ tipo: 'cita', texto: cita.join(' ') });
    if (lista) bloques.push(lista);
    parrafo = [];
    cita = [];
    lista = null;
  };

  for (const cruda of lineas) {
    const linea = cruda.trimEnd();
    const titulo = /^(#{1,3})\s+(.*)$/.exec(linea);
    const viñeta = /^[-*]\s+(.*)$/.exec(linea);
    const numerada = /^\d+\.\s+(.*)$/.exec(linea);
    const comoCita = /^>\s?(.*)$/.exec(linea);
    const sangrada = /^\s{2,}(\S.*)$/.exec(linea);

    if (linea.trim() === '') {
      cerrar();
    } else if (/^---+$/.test(linea)) {
      cerrar();
      bloques.push({ tipo: 'hr' });
    } else if (titulo) {
      cerrar();
      bloques.push({
        tipo: `h${titulo[1].length}` as 'h1' | 'h2' | 'h3',
        texto: titulo[2],
      });
    } else if (viñeta || numerada) {
      const tipo = viñeta ? 'ul' : 'ol';
      const texto = (viñeta ?? numerada)![1];
      if (lista && lista.tipo !== tipo) cerrar();
      if (parrafo.length || cita.length) cerrar();
      if (!lista) lista = { tipo, items: [] };
      lista.items.push(texto);
    } else if (sangrada && lista) {
      // continuación del ítem anterior
      lista.items[lista.items.length - 1] += ` ${sangrada[1]}`;
    } else if (comoCita) {
      if (parrafo.length || lista) cerrar();
      cita.push(comoCita[1]);
    } else {
      if (cita.length || lista) cerrar();
      parrafo.push(linea.trim());
    }
  }
  cerrar();
  return bloques;
}

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function Inline({ texto }: { texto: string }) {
  const partes = texto.split(INLINE).filter((p) => p !== '');
  return (
    <>
      {partes.map((parte, i) => {
        if (parte.startsWith('**') && parte.endsWith('**')) {
          return <strong key={i}>{parte.slice(2, -2)}</strong>;
        }
        if (parte.startsWith('`') && parte.endsWith('`')) {
          return (
            <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">
              {parte.slice(1, -1)}
            </code>
          );
        }
        const enlace = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(parte);
        if (enlace) {
          return (
            <a key={i} href={enlace[2]} className="text-primary underline">
              {enlace[1]}
            </a>
          );
        }
        return <Fragment key={i}>{parte}</Fragment>;
      })}
    </>
  );
}

// Títulos de segundo nivel, para el índice.
export function titulosDelManual(fuente: string): { id: string; texto: string }[] {
  return parsear(fuente)
    .filter((b): b is { tipo: 'h2'; texto: string } => b.tipo === 'h2')
    .map((b) => ({ id: slug(b.texto), texto: b.texto }));
}

export function Markdown({ fuente }: { fuente: string }): ReactNode {
  return (
    <div className="flex flex-col gap-3 text-[0.95rem] leading-relaxed">
      {parsear(fuente).map((b, i) => {
        switch (b.tipo) {
          case 'h1':
            return null; // el título ya lo pone la página
          case 'h2':
            return (
              <h2
                key={i}
                id={slug(b.texto)}
                className="mt-6 scroll-mt-20 border-t pt-6 font-display text-xl tracking-tight"
              >
                {b.texto}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} id={slug(b.texto)} className="mt-3 scroll-mt-20 text-base font-semibold">
                {b.texto}
              </h3>
            );
          case 'p':
            return (
              <p key={i}>
                <Inline texto={b.texto} />
              </p>
            );
          case 'cita':
            return (
              <p key={i} className="rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3 text-sm">
                <Inline texto={b.texto} />
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="ml-5 list-disc space-y-1.5">
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inline texto={item} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="ml-5 list-decimal space-y-1.5">
                {b.items.map((item, j) => (
                  <li key={j}>
                    <Inline texto={item} />
                  </li>
                ))}
              </ol>
            );
          case 'hr':
            return <hr key={i} className="my-4" />;
        }
      })}
    </div>
  );
}
