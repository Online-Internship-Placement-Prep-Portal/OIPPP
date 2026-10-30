#!/usr/bin/env bash
# Renders every diagram locally with PlantUML 1.2025.2, from a JAR or the official Docker image.
set -euo pipefail
cd "$(dirname "$0")"
diagrams=(component er use_case seq_test_attempt seq_apply seq_status_update)
sources=("${diagrams[@]/%/.puml}")
if [[ -n "${PLANTUML_JAR:-}" ]]; then
  java -jar "$PLANTUML_JAR" -failfast2 -tpng "${sources[@]}"
else
  MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W 2>/dev/null || pwd):/data" -w /data \
    plantuml/plantuml:1.2025.2 -failfast2 -tpng "${sources[@]}"
fi
for diagram in "${diagrams[@]}"; do
  test -s "${diagram}.png"
  printf 'Rendered %s.png\n' "$diagram"
done
