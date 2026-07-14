# TurfX Backend (Nashik MVP)

NestJS + Prisma + PostgreSQL 17/PostGIS + Redis.

See `../Implementation plan/` for the full specs. The definitive schema is `PART_2_5_DATABASE_DESIGN/part_2.5.2_CONSOLIDATED_SCHEMA.md`; task list lives in `Implementation plan/BUILDER_HANDOFF_BRIEF.md`; module layout in `PART_4_BACKEND_IMPLEMENTATION/part_4.0_backend_blueprint.md`.

## Quickstart

```bash
docker-compose up -d       # Postgres + Redis
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev
curl localhost:3000/health
```

Progress checklist: `PROGRESS.md`.
