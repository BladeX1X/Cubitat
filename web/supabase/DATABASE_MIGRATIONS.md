# Supabase Database Migrations

This folder contains database schema definitions and migrations for the Cubitat project.

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended if you have CLI DB access)
If you are an agent or pipeline with access to the Supabase CLI and database password:
```bash
# Push migrations to production database
supabase db push --db-url "postgres://postgres:[YOUR_DB_PASSWORD]@db.tohjzoncoosvjbjcakdl.supabase.co:5432/postgres"
```

### Option 2: Manual SQL Editor (Fallback)
Copy and run the contents of the latest migration files in the SQL Editor on the Supabase Dashboard.

---

## Active Migrations Log

### 1. Property Reports System (`20260706000000_create_property_reports.sql`)
**Target Table**: `public.property_reports`  
**Purpose**: Store user flags/reports for suspicious properties, enabling RLS for public insertions and restricted admin views/modifications.

**SQL Schema & Policies Code**:
```sql
-- Create property reports table
CREATE TABLE IF NOT EXISTS public.property_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert a report
CREATE POLICY "Anyone can insert a report"
ON public.property_reports
FOR INSERT
WITH CHECK (true);

-- Policy: Admin select access
CREATE POLICY "Admins can read all reports"
ON public.property_reports
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy: Admin update access
CREATE POLICY "Admins can update all reports"
ON public.property_reports
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
```
