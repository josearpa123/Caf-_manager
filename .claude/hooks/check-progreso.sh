#!/usr/bin/env bash
# Stop hook: revisa si hay cambios de código sin reflejar en docs/PROGRESO.md
# y bloquea el fin del turno pidiendo que se documenten con la skill
# "documentar-progreso". Ver .claude/skills/documentar-progreso/SKILL.md.
set -euo pipefail

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || true

if [ ! -f docs/PROGRESO.md ] || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

json_reason() {
  node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0,"utf8")))' <<< "$1"
}

DIRTY_OTHER="$(git status --porcelain -- . ':(exclude)docs/PROGRESO.md' 2>/dev/null || true)"
DIRTY_DOC="$(git status --porcelain -- docs/PROGRESO.md 2>/dev/null || true)"

if [ -n "$DIRTY_OTHER" ] && [ -z "$DIRTY_DOC" ]; then
  FILES="$(echo "$DIRTY_OTHER" | awk '{print $2}' | head -15 | tr '\n' ' ')"
  REASON="Hay cambios sin commitear que no están reflejados en docs/PROGRESO.md (archivos: ${FILES}). Antes de terminar, usa la skill 'documentar-progreso' para agregar/actualizar la entrada de esta sesión."
  echo "{\"decision\":\"block\",\"reason\":$(json_reason "$REASON")}"
  exit 0
fi

# Si PROGRESO.md ya tiene un cambio pendiente (aunque no esté commiteado
# todavía), se considera atendido por esta sesión: no exigimos además que
# el historial de commits esté al día.
if [ -z "$DIRTY_DOC" ]; then
  LAST_DOC_COMMIT="$(git log -1 --format=%H -- docs/PROGRESO.md 2>/dev/null || true)"
  if [ -n "$LAST_DOC_COMMIT" ]; then
    UNDOCUMENTED="$(git log "${LAST_DOC_COMMIT}"..HEAD --name-only --pretty=format: -- . ':(exclude)docs/PROGRESO.md' 2>/dev/null | grep -v '^$' || true)"
    if [ -n "$UNDOCUMENTED" ]; then
      REASON="Hay commits posteriores al último cambio de docs/PROGRESO.md que no quedaron documentados. Antes de terminar, usa la skill 'documentar-progreso' para ponerla al día."
      echo "{\"decision\":\"block\",\"reason\":$(json_reason "$REASON")}"
      exit 0
    fi
  fi
fi

exit 0
