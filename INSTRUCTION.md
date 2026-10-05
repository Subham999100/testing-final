# Clyptus Job Portal — Setup & Run

## 1. Clone

`ash
git clone https://github.com/Subham999100/testing-final.git
cd testing-final
`
---
## 2. Docker

docker compose -f ./docker/docker-compose.yml up -d

docker ps
---
## 3. Database

cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed:org
---
## 4. Backend

npm run start:dev
---
## 5. Frontend

cd ../frontend
npm install
npm run dev
---
## 6. Run Everything

Terminal 1 – Docker (Postgres)
docker compose -f ./docker/docker-compose.yml up -d

Terminal 2 – Backend
cd backend && npm install && npm run prisma:generate && npm run prisma:migrate && npm run start:dev

Terminal 3 – Frontend
cd ../frontend && npm install && npm run dev

Endpoints:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Swagger UI: http://localhost:3000/api
- Database: localhost:5434
