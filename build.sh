#!/usr/bin/env bash
# Combines src/*.gs into dist/Code.gs (single file for copy-paste install).
set -e
cd "$(dirname "$0")"
mkdir -p dist
OUT=dist/Code.gs
VERSION=$(grep -o "APP_VERSION = '[^']*'" src/Config.gs | cut -d"'" -f2)
{
  echo "/**"
  echo " * Gmail Email Scraper v${VERSION} — single-file build."
  echo " * Generated from src/ by build.sh. Paste this whole file into Extensions → Apps Script."
  echo " * See README.md for full usage."
  echo " */"
  for f in Config Utils Settings Filters Output Scraper Menu; do
    echo ""
    echo "// ======================================================================"
    echo "// ${f}.gs"
    echo "// ======================================================================"
    cat "src/${f}.gs"
  done
} > "$OUT"
echo "Built $OUT ($(wc -l < "$OUT") lines)"
