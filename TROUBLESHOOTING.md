# Troubleshooting Guide - Project Not Loading

## Current Status
- ✅ Prisma Client generated
- ✅ Node processes running
- ⚠️ Server not responding (timeout on localhost:3000)
- ⚠️ Likely stuck during initialization

## Most Common Issues

### 1. **Database Connection Hanging**
**Symptoms:** Server starts but times out, no response

**Solution:**
```bash
# Check if database is accessible
npx prisma db pull

# If that hangs, database might not be running
# Check if PostgreSQL/Docker is running on port 5433
docker ps | grep postgres
# OR
netstat -ano | findstr :5433
```

### 2. **Database Migrations Not Applied**
**Symptoms:** Database exists but tables are missing

**Solution:**
```bash
cd shed-admin
npx prisma migrate deploy
# OR for development:
npx prisma migrate dev
```

### 3. **Prisma Client Not Generated**
**Symptoms:** Import errors, "Cannot find module @prisma/client"

**Solution:**
```bash
cd shed-admin
npx prisma generate
```

### 4. **Database Doesn't Exist**
**Symptoms:** Connection refused or database not found

**Solution:**
```bash
# If using Docker (port 5433):
docker run --name fuel-station-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fuel_station_db \
  -p 5433:5432 \
  -d postgres:15

# Then run migrations:
npx prisma migrate deploy
```

## Quick Diagnostic Steps

1. **Check if database is running:**
   ```bash
   # Check Docker containers
   docker ps
   
   # Check if port 5433 is in use
   netstat -ano | findstr :5433
   ```

2. **Test database connection:**
   ```bash
   cd shed-admin
   npx prisma db pull
   ```

3. **Check Prisma migrations:**
   ```bash
   npx prisma migrate status
   ```

4. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

5. **Restart dev server:**
   ```bash
   # Stop all Node processes
   Get-Process -Name node | Stop-Process -Force
   
   # Start server
   npm run dev
   ```

## If Server Still Won't Start

1. **Check the terminal output** - Look for specific error messages
2. **Check browser console** - Open DevTools (F12) and check for errors
3. **Try accessing directly:**
   - http://localhost:3000/login
   - http://localhost:3000/api/auth/login

## Database Setup (Quick)

If you need to set up the database from scratch:

```bash
# 1. Start PostgreSQL (Docker)
docker run --name fuel-station-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fuel_station_db \
  -p 5433:5432 \
  -d postgres:15

# 2. Apply migrations
cd shed-admin
npx prisma migrate deploy

# 3. (Optional) Seed database
npm run seed

# 4. Start dev server
npm run dev
```

## Still Having Issues?

Check:
1. Is `.env.local` file present and correct?
2. Is DATABASE_URL pointing to the right port (5433)?
3. Are database credentials correct?
4. Is PostgreSQL/Docker actually running?

For more details, see `DATABASE_SETUP.md`



