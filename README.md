# TopNet Frotas

Aplicacao web para controle de frota e abastecimentos, com backend Django e frontend React.

## Stack
- Backend: Django + Django REST Framework + PostgreSQL
- Frontend: Vite + React + TypeScript
- Realtime/Jobs: Celery + Redis (opcional para dev)

## Como rodar (dev)

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Variaveis de ambiente
Crie um arquivo `.env` em `backend/` se precisar sobrescrever os defaults:
```
SECRET_KEY=change-me
DEBUG=True
DB_NAME=fleetfuel
DB_USER=postgres
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=5432
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

## Licenca
Privado.
