#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PYTHON="${ROOT_DIR}/venv/bin/python"
PYTEST_CONFIG="${ROOT_DIR}/backend/pytest.ini"

if [[ ! -x "${VENV_PYTHON}" ]]; then
  echo "Virtualenv not found at ${VENV_PYTHON}. Activate your venv first."
  exit 1
fi

export DJANGO_SETTINGS_MODULE="config.settings_test"
export PYTHONPATH="${ROOT_DIR}/backend:${PYTHONPATH:-}"

echo "Running backend tests with pytest..."
set +e
"${VENV_PYTHON}" -m pytest -c "${PYTEST_CONFIG}" --maxfail=1
status=$?
set -e

if [[ ${status} -eq 5 ]]; then
  echo "No tests collected."
  exit 0
fi

exit ${status}
