# Quick Fix Guide - Project Not Loading

## Issue Identified
The project has the following setup:
- ✅ Prisma Client generated successfully
- ✅ Node processes running (dev server started)
- ✅ `.env.local` file exists with DATABASE_URL on port 5433

## Possible Issues & Solutions

### 1. **Database Connection Issue**
The DATABASE_URL points to port **5433** instead of the default 5432. Make sure:
- PostgreSQL is running on port 5433, OR
- Update DATABASE_URL to the correct port

**Check if database is running:**
```bash
# If using Docker:
docker ps | grep postgres

# If database is not running, start it:
docker start fuel-station-postgres
# OR create a new container:
docker run --name fuel-station-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fuel_station_db -p 5433:5432 -d postgres:15
```

### 2. **Database Migrations Not Applied**
If the database exists but tables don't:
```bash
cd shed-admin
npx prisma migrate deploy
# OR for development:
npx prisma migrate dev
```

### 3. **Server Not Starting Properly**
Stop all Node processes and restart:
```bash
# Stop all Node processes
Get-Process -Name node | Stop-Process -Force

# Restart dev server
cd shed-admin
npm run dev
```

### 4. **Prisma Client Not Generated**
```bash
cd shed-admin
npx prisma generate
```

### 5. **Check Server Logs**
Open the terminal where you ran `npm run dev` and look for errors. Common errors:
- `Can't reach database server` - Database not running
- `Database does not exist` - Need to create database
- `relation "User" does not exist` - Need to run migrations

## Quick Test Commands

```bash
# 1. Check if database is accessible
npx prisma db pull

# 2. Check if migrations are applied
npx prisma migrate status

# 3. Open Prisma Studio to view database
npx prisma studio

# 4. Test database connection
npx prisma db execute --stdin < echo "SELECT 1;"
```

## Most Likely Fix

If the database is on port 5433, make sure:
1. PostgreSQL/Docker container is running on port 5433
2. Database `fuel_station_db` exists
3. Migrations have been applied

If you need to change the port back to 5432, edit `.env.local`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fuel_station_db?schema=public"
```

Then restart the dev server.



