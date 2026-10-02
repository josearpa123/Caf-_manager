import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PageHeader } from '@/components/shell/page-header';
import { Markdown, titulosDelManual } from '@/lib/markdown';

// El manual vive en content/manual.md (la misma fuente que se lee en el repo) y
// se convierte en página al construir la aplicación.
export const dynamic = 'force-static';

export const metadata = { title: 'Ayuda · Coffee Manager' };

export default function AyudaPage() {
  const fuente = readFileSync(path.join(process.cwd(), 'content', 'manual.md'), 'utf8');
  const indice = titulosDelManual(fuente);

  return (
    <div className="p-4 sm:p-8">
      <PageHeader
        title="Ayuda"
        description="El manual del sistema, con palabras simples."
      />
      <div className="mt-6 grid gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <nav aria-label="Índice del manual" className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            En esta página
          </p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm lg:flex-col">
            {indice.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`} className="text-muted-foreground hover:text-foreground hover:underline">
                  {t.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-3xl">
          <Markdown fuente={fuente} />
        </article>
      </div>
    </div>
  );
}
