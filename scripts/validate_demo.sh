#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Backend tests"
(cd "${ROOT_DIR}/backend" && npm test)

echo "[2/4] Frontend build"
(cd "${ROOT_DIR}/frontend" && npm run build)

echo "[3/4] ML smoke test"
(cd "${ROOT_DIR}/ml" && python smoke_test.py)

echo "[4/4] Package submission"
"${ROOT_DIR}/scripts/package_submission.sh"

echo "Validation complete"
