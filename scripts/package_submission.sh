#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${1:-/tmp/zerowastex-packages}"
OUTPUT_FILE="${OUTPUT_DIR}/zerowastex-sih26259-submission.zip"

mkdir -p "${OUTPUT_DIR}"
rm -f "${OUTPUT_FILE}"

cd "${ROOT_DIR}"

zip -r "${OUTPUT_FILE}" . \
  -x "*.git*" \
  -x "dist/*" \
  -x "*/dist/*" \
  -x "*/node_modules/*" \
  -x "*/.venv/*" \
  -x "*/venv/*" \
  -x "*/__pycache__/*" \
  -x "*/.pytest_cache/*" \
  -x "*/weights/*" \
  -x "*/runs/*" \
  -x "*.log" \
  -x "*.sqlite" \
  -x "*.db" \
  -x "*.env" \
  -x "*.DS_Store" \
  -x "*.zip"

echo "Created ${OUTPUT_FILE}"
