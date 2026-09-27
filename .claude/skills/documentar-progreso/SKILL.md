---
name: documentar-progreso
description: Actualiza docs/PROGRESO.md (la bitácora de avance de Coffee Manager) con lo hecho en la sesión actual, siguiendo el formato ya establecido en el archivo. Úsala antes de terminar cualquier sesión que haya tocado schema, backend, frontend, infraestructura o decisiones de producto — incluida cuando el hook de Stop lo pida explícitamente.
---

# Documentar progreso

`docs/PROGRESO.md` es la única fuente de verdad de "qué se hizo y por qué" en
este proyecto entre sesiones de Claude Code. Si algo se hizo pero no quedó
aquí, la próxima sesión no tiene forma de saberlo.

## Cuándo usarla

- Al final de cualquier sesión que haya cambiado schema de Prisma, código de
  `apps/api` o `apps/web`, infraestructura (`docker/`, `.github/`), o tomado
  una decisión de producto/diseño con el usuario.
- Siempre que el hook de `Stop` (`.claude/hooks/check-progreso.sh`) bloquee el
  turno pidiéndolo explícitamente.
- No hace falta para cambios triviales de una sola línea sin decisión detrás
  (typos, formato), pero ante la duda, documentar de más es mejor que de menos.

## Antes de escribir: mira qué cambió de verdad

No confíes solo en lo que recuerdes de la conversación. Corre:

```bash
git status --porcelain
git diff --stat HEAD
git log --oneline -10
```

Si hay migraciones nuevas de Prisma (`apps/api/prisma/migrations/`), o
módulos/endpoints nuevos, asegúrate de que queden nombrados explícitamente —
son el tipo de cosa que más se pierde (ya pasó: migraciones aplicadas sin
documentar en la sesión de préstamos).

## Formato exacto a seguir

Abre `docs/PROGRESO.md` y mira las últimas 2-3 entradas para el tono y nivel
de detalle esperado. Estructura de cada entrada de sesión:

```markdown
## <Título corto de lo que se hizo> (sesión <YYYY-MM-DD>)

<1-3 frases: qué pidió el usuario y qué decisiones de diseño se confirmaron
con él antes de construir, si las hubo — igual que las entradas anteriores
citan las decisiones explícitas del usuario.>

- **Schema**: <modelos/campos/migraciones nuevos, con el nombre exacto de la
  migración>.
- **Backend** (`ruta/al/modulo`): <endpoints nuevos, validaciones, reglas de
  negocio>. Cómo se verificó (curl, tests) si se hizo.
- **Frontend**: <páginas/componentes nuevos o cambiados>.
- Cualquier fix o hallazgo de paso que no sea el pedido principal.

### Pendiente / fuera de alcance
- <qué quedó deliberadamente sin hacer y por qué, para que la próxima sesión
  no lo reintente por error ni asuma que falta por descuido>.
```

Reglas de formato:

1. **Las entradas nuevas van arriba**, justo después de la línea `**Última
   actualización:**` en la línea 5 — el archivo es cronológico inverso (más
   reciente primero). No lo pongas al final del archivo.
2. Actualiza también la línea `**Última actualización:** YYYY-MM-DD` al tope
   del archivo con la fecha de hoy.
3. Sé específico con nombres reales: rutas de archivo, nombres de endpoint,
   nombres de migración, decisiones exactas que confirmó el usuario. Evita
   resúmenes vagos tipo "se mejoró el módulo X".
4. Si la sesión fue sobre tooling/infraestructura (como este mismo hook y
   skill), documéntala igual — el archivo ya incluye sesiones de este tipo
   (ver "Rediseño visual del frontend", "Plan/límites por tenant").
5. Si algo quedó pendiente de una sesión anterior y esta sesión lo resolvió,
   actualiza también la nota "Pendiente" original en vez de duplicarla (ver
   cómo se tachó "No hay acción de rechazar" en una entrada anterior cuando
   se resolvió después).
6. No toques la sección "Cómo retomar en la próxima sesión" salvo que el
   estado general del proyecto (fase, siguiente paso sugerido) haya cambiado
   de verdad.

## Después de escribir

Si el usuario no dijo lo contrario, no hace falta que hagas commit tú mismo
del cambio a `docs/PROGRESO.md` — basta con dejarlo escrito en el working
tree. Si el resto de los cambios de la sesión ya se commitearon, sí conviene
incluir `docs/PROGRESO.md` en ese mismo commit (o uno aparte) para que el
hook de `Stop` no lo vuelva a marcar como pendiente.
