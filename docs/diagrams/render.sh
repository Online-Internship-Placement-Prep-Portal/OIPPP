#!/usr/bin/env bash
# Run with bash; the GitHub web upload does not need an executable file mode.
set -euo pipefail
: "${PLANTUML_JAR:?Set PLANTUML_JAR to a local PlantUML 1.2025.2 JAR}"
if [[ ! -f "$PLANTUML_JAR" ]]; then
  printf 'PlantUML JAR not found: %s\n' "$PLANTUML_JAR" >&2
  exit 1
fi
jar="$(cd "$(dirname "$PLANTUML_JAR")" && pwd)/$(basename "$PLANTUML_JAR")"
cd "$(dirname "$0")"
java -jar "$jar" -failfast2 -tpng component.puml er.puml use_case.puml seq_test_attempt.puml
for diagram in component er use_case seq_test_attempt; do
  test -s "${diagram}.png"
  printf 'Rendered %s.png\n' "$diagram"
done
