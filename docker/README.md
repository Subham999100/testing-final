# Clyptus Job Portal — Local PostgreSQL Database

This directory contains the Docker configuration and instructions for running the Clyptus Job Portal's local PostgreSQL database.

## Directory Structure

docker/
├── docker-compose.yml
└── README.md

- docker-compose.yml — PostgreSQL Docker configuration.
- README.md — Database setup and usage instructions.

## Prerequisites

Install:

- Docker Desktop
- Git

Verify:

```powershell
docker --version
docker compose version
```

## 1. Clone the Repository

```powershell
git clone https://github.com/Clyptus-Soft/Clyptus-software-solutions-job-portal.git
cd Clyptus-software-solutions-job-portal
```

## 2. Start PostgreSQL

From the repository root:

```powershell
docker compose -f .\docker\docker-compose.yml up -d
```

## 3. Verify PostgreSQL

```powershell
docker compose -f .\docker\docker-compose.yml ps
```

Check PostgreSQL directly:

```powershell
docker exec clyptus-postgres pg_isready -U postgres -d clyptus_recruitment
```

Expected:

```text
/var/run/postgresql:5432 - accepting connections
```

## 4. Database Connection

| Setting | Value |
|---|---|
| Host | localhost |
| Port | 5434 |
| Database | clyptus_recruitment |
| Username | postgres |
| Password | postgres |

Connection string:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/clyptus_recruitment?schema=public"
```

Port `5434` is used on the host to avoid conflicts with PostgreSQL installations using port `5432`.

Inside Docker, PostgreSQL still runs on port `5432`.

## 5. Configure Backend

Copy the environment template:

```powershell
Copy-Item .\backend\.env.example .\backend\.env
```

Open:

backend/.env

Set:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/clyptus_recruitment?schema=public"
```

Do not commit `backend/.env`.

## 6. Install Backend Dependencies

```powershell
cd backend
npm install
```

Generate Prisma Client:

```powershell
npx prisma generate
```

Validate Prisma:

```powershell
npx prisma validate
```

## 7. Access PostgreSQL

Open PostgreSQL CLI:

```powershell
docker exec -it clyptus-postgres psql -U postgres -d clyptus_recruitment
```

Useful commands:

```sql
\conninfo
```

```sql
\dt
```

Exit:

```sql
\q
```

## 8. Prisma Studio

From the backend directory:

```powershell
npx prisma studio
```

Prisma Studio:

http://localhost:5555

## Docker Commands

### Start

```powershell
docker compose -f .\docker\docker-compose.yml up -d
```

### Stop

Stops PostgreSQL while preserving database data:

```powershell
docker compose -f .\docker\docker-compose.yml stop
```

### Start Existing Container

```powershell
docker compose -f .\docker\docker-compose.yml start
```

### Status

```powershell
docker compose -f .\docker\docker-compose.yml ps
```

### Logs

```powershell
docker logs clyptus-postgres
```

### Follow Logs

```powershell
docker logs -f clyptus-postgres
```

Press `Ctrl + C` to stop following logs.

### Stop and Remove Container

```powershell
docker compose -f .\docker\docker-compose.yml down
```

The database volume is preserved.

## Reset Database

WARNING: This deletes all local PostgreSQL data.

```powershell
docker compose -f .\docker\docker-compose.yml down -v
```

Then recreate:

```powershell
docker compose -f .\docker\docker-compose.yml up -d
```

## Troubleshooting

### Port 5434 Already in Use

```powershell
netstat -ano | findstr :5434
```

Check Docker:

```powershell
docker ps
```

Do not remove another project's container without identifying it first.

### Container Name Already Exists

Check:

```powershell
docker ps -a --filter "name=clyptus-postgres"
```

If an old Clyptus container is no longer required:

```powershell
docker rm -f clyptus-postgres
```

Then:

```powershell
docker compose -f .\docker\docker-compose.yml up -d
```

### PostgreSQL Not Healthy

```powershell
docker compose -f .\docker\docker-compose.yml ps
```

```powershell
docker logs clyptus-postgres
```

```powershell
docker exec clyptus-postgres pg_isready -U postgres -d clyptus_recruitment
```

### Prisma Cannot Connect

Verify PostgreSQL:

```powershell
docker exec clyptus-postgres pg_isready -U postgres -d clyptus_recruitment
```

Verify `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/clyptus_recruitment?schema=public"
```

Then:

```powershell
cd backend
npx prisma validate
npx prisma generate
```

## Important Rules

### 1. Use the Clyptus Database

Container:

clyptus-postgres

Database:

clyptus_recruitment

Volume:

clyptus-postgres-data

Do not use PostgreSQL containers belonging to other projects.

### 2. Docker Compose Only Provides PostgreSQL

Docker Compose does not automatically:

- Run Prisma migrations
- Seed application data
- Start the NestJS backend
- Start the React frontend

These are separate operations.

### 3. Never Commit Environment Secrets

Do not commit:

backend/.env

Use:

backend/.env.example

as the environment template.

### 4. Database Persistence

This preserves the database volume:

```powershell
docker compose -f .\docker\docker-compose.yml down
```

This deletes the database volume:

```powershell
docker compose -f .\docker\docker-compose.yml down -v
```

## Quick Start

For a new developer:

```powershell
git clone https://github.com/Clyptus-Soft/Clyptus-software-solutions-job-portal.git
cd Clyptus-software-solutions-job-portal
docker compose -f .\docker\docker-compose.yml up -d
docker compose -f .\docker\docker-compose.yml ps
```

Configure:

backend/.env

with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5434/clyptus_recruitment?schema=public"
```

Then:

```powershell
cd backend
npm install
npx prisma generate
npx prisma validate
```

PostgreSQL is now available at:

localhost:5434

## Architecture

```text
NestJS Backend
      |
      v
PrismaService
      |
      v
PrismaClient
      |
      v
DATABASE_URL
      |
      v
localhost:5434
      |
      v
Docker
      |
      v
clyptus-postgres:5432
      |
      v
clyptus_recruitment
      |
      v
PostgreSQL
```

Infrastructure files:

docker/docker-compose.yml

Database schema:

backend/prisma/schema.prisma