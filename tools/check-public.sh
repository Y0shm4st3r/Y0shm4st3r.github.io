#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
#  check-public.sh - busca datos privados antes de publicar.
#  Uso manual:   tools/check-public.sh            (revisa todos los archivos del repo)
#  Como hook:    ln -s ../../tools/check-public.sh .git/hooks/pre-commit
#                (entonces revisa solo lo que vas a commitear)
#  Sale con código 1 si encuentra algo → git cancela el commit.
# ─────────────────────────────────────────────────────────────────────
set -u

# Qué archivos revisar: en un hook, los "staged"; si no, todos los versionados.
if [ -n "${GIT_INDEX_FILE:-}" ]; then
  mapfile -t FILES < <(git diff --cached --name-only --diff-filter=ACM)
else
  mapfile -t FILES < <(git ls-files 2>/dev/null)
fi
# Repo recién creado (nada en el índice) o sin git: revisar el disco completo.
if [ ${#FILES[@]} -eq 0 ] && [ -z "${GIT_INDEX_FILE:-}" ]; then
  mapfile -t FILES < <(find . -type f -not -path './_site/*' -not -path './.git/*' -not -path './vendor/*' -not -path './.jekyll-cache/*')
fi

# Patrones (regex extendida). Añade los tuyos al final.
PATTERNS=(
  '\b10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\b'                    # IPs privadas 10.x
  '\b192\.168\.[0-9]{1,3}\.[0-9]{1,3}\b'                          # IPs privadas 192.168.x
  '\b172\.(1[6-9]|2[0-9]|3[01])\.[0-9]{1,3}\.[0-9]{1,3}\b'        # IPs privadas 172.16-31.x
  '\b100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\.[0-9]{1,3}\.[0-9]{1,3}\b'  # Tailscale / CGNAT
  '\b([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}\b'                        # direcciones MAC
  '0x5000c5[0-9a-fA-F]+'                                          # WWN de discos
  '\b(ZC1[0-9A-Z]{5}|Z29[0-9A-Z]{5})\b'                           # seriales de discos
  '(api[_-]?key|secret|password|passwd|token)[[:space:]]*[:=]'    # credenciales
  '(^|[[:space:]"'"'"'=:(~])/home/[a-z0-9_-]+'                     # rutas con usuario (no "Bed/Home/Level")
  '\(?[0-9]{3}\)?[ .-][0-9]{3}-[0-9]{4}\b'                          # teléfonos (xxx) xxx-xxxx
)

# Patrones PRIVADOS (hostnames, prefijos de VPN, seriales…): uno por línea en
# .private-patterns - ese archivo está en .gitignore, así la lista misma no se publica.
if [ -f .private-patterns ]; then
  while IFS= read -r line; do
    case "$line" in ''|'#'*) continue;; esac
    PATTERNS+=("$line")
  done < .private-patterns
fi

hits=0
TMP=$(mktemp); trap 'rm -f "$TMP"' EXIT
for f in "${FILES[@]}"; do
  f="${f#./}"
  [ -f "$f" ] || continue
  case "$f" in *.png|*.jpg|*.jpeg|*.webp|*.ico|*.bin|tools/check-public.sh|.private-patterns) continue;; esac
  src="$f"
  if [[ "$f" == *.pdf ]]; then
    # El texto de un PDF va en streams comprimidos: grep sobre el binario no lo ve.
    # pdftotext (paquete poppler) lo extrae a texto plano y ahí sí se puede buscar.
    if ! command -v pdftotext >/dev/null; then
      echo "⚠  $f: no se puede revisar un PDF sin pdftotext (sudo pacman -S poppler)"; hits=$((hits+1)); continue
    fi
    pdftotext -q "$f" "$TMP" 2>/dev/null; src="$TMP"
  fi
  for p in "${PATTERNS[@]}"; do
    # -n número de línea · -i sin distinguir mayúsculas · -E regex extendida
    if out=$(grep -niE "$p" "$src"); then
      echo "⚠  $p   ($f)"; echo "$out" | sed 's/^/     /'; hits=$((hits+1))
    fi
  done
done

if [ "$hits" -gt 0 ]; then
  echo; echo "✗ $hits patrón(es) con coincidencias. Revisa antes de publicar."
  echo "  Si es un falso positivo, ajusta el patrón en tools/check-public.sh."
  exit 1
fi
echo "✓ Nada privado encontrado en ${#FILES[@]} archivo(s)."
