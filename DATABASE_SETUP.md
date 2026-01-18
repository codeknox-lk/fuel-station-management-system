# Database Setup Guide
## PostgreSQL + Prisma Setup

---

## ✅ What's Already Done

1. ✅ Prisma installed
2. ✅ Prisma schema created with all models
3. ✅ Prisma client utility created (`src/lib/db.ts`)
4. ✅ Database connection configuration ready

---

## 📋 Next Steps

### Step 1: Install PostgreSQL

**Option A: Using Homebrew (macOS)**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Option B: Using Docker (Recommended for Development)**
```bash
docker run --name fuel-station-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fuel_station_db \
  -p 5432:5432 \
  -d postgres:15

# To stop: docker stop fuel-station-postgres
# To start: docker start fuel-station-postgres
# To remove: docker rm fuel-station-postgres
```

**Option C: Download PostgreSQL**
- Download from: https://www.postgresql.org/download/
- Install and create a database named `fuel_station_db`

---

### Step 2: Create .env File

Copy `.env.example` to `.env` and update the DATABASE_URL:

```bash
cd shed-admin
cp .env.example .env
```

Then edit `.env` with your database credentials:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fuel_station_db?schema=public"
```

**For local PostgreSQL:**
```env
DATABASE_URL="postgresql://your_username:your_password@localhost:5432/fuel_station_db?schema=public"
```

---

### Step 3: Create Database

**If using PostgreSQL directly:**
```bash
createdb fuel_station_db
# or
psql -U postgres
CREATE DATABASE fuel_station_db;
\q
```

**If using Docker (database created automatically):**
- The database `fuel_station_db` is created automatically when you start the container

---

### Step 4: Run Prisma Migrations

```bash
cd shed-admin

# Generate Prisma Client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# This will:
# 1. Create all tables based on schema.prisma
# 2. Generate Prisma Client
# 3. Apply migrations to database
```

---

### Step 5: (Optional) Seed Database

Create a seed file to populate initial data:

```bash
# Create seed script
touch prisma/seed.ts
```

The seed script (`prisma/seed.ts`) will populate the database with initial data including stations, users, banks, tanks, pumps, and sample data.

---

### Step 6: Verify Setup

```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# This opens a web interface at http://localhost:5555
# You can view and edit data directly
```

---

## 🛠️ Prisma Commands Reference

```bash
# Generate Prisma Client (after schema changes)
npx prisma generate

# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio

# Format schema file
npx prisma format

# Validate schema
npx prisma validate
```

---

## 📁 Database Schema Overview

The schema includes these main models:

### Core
- `User` - System users (OWNER, MANAGER, ACCOUNTS)
- `Station` - Fuel stations

### Operations
- `Shift` - Work shifts
- `ShiftTemplate` - Shift templates
- `ShiftAssignment` - Pumper assignments
- `Tank` - Fuel storage tanks
- `Pump` - Fuel pumps
- `Nozzle` - Pump nozzles

### Financial
- `Expense` - Expenses
- `Deposit` - Bank deposits
- `LoanExternal` - External loans
- `LoanPumper` - Pumper loans
- `Cheque` - Cheque management

### Credit
- `CreditCustomer` - Credit customers
- `CreditSale` - Credit sales
- `CreditPayment` - Credit payments

### POS
- `PosTerminal` - POS terminals
- `PosBatch` - POS batches

### Settings
- `Bank` - Banks
- `Price` - Fuel prices
- `Pumper` - Pumpers/Employees

### Audits
- `MeterAudit` - Meter audits
- `TestPour` - Test pours
- `AuditLog` - System audit logs

---

## 🔍 Troubleshooting

### Error: "DATABASE_URL is not set"
- Make sure `.env` file exists in `shed-admin/` directory
- Check that `DATABASE_URL` is properly formatted

### Error: "Connection refused"
- Make sure PostgreSQL is running
- Check PostgreSQL is listening on port 5432
- Verify credentials in DATABASE_URL

### Error: "Database does not exist"
- Create the database first
- Check database name in DATABASE_URL

### Error: "Schema does not exist"
- Prisma will create the schema automatically
- Check that `?schema=public` is in the DATABASE_URL

---

## 🚀 Quick Start (Docker)

If you have Docker installed, you can quickly start a PostgreSQL database:

```bash
# Start PostgreSQL in Docker
docker run --name fuel-station-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=fuel_station_db \
  -p 5432:5432 \
  -d postgres:15

# Create .env file
cd shed-admin
cp .env.example .env

# Run migrations
npx prisma generate
npx prisma migrate dev --name init

# Start Prisma Studio (optional)
npx prisma studio
```

---

## 📝 Next Steps After Database Setup

1. **Update API Routes** - Replace seed file calls with Prisma queries
2. **Test Migrations** - Verify all tables are created correctly
3. **Seed Data** - Populate database with initial data
4. **Update Authentication** - Use database for user authentication
5. **Test Endpoints** - Verify all API endpoints work with database

---

**Status:** Ready for database setup - follow steps above!

