# Supabase Setup for Waitlist

This directory contains a SQL script for setting up the waitlist functionality in Supabase.

## Table Setup

The `simplified_waitlist_table.sql` script creates:
- A table for storing waitlist information (email, name, source)
- Indexes for efficient querying

## How to Apply

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the content of `simplified_waitlist_table.sql` and run it
4. Verify the table was created successfully

## Table Structure

The waitlist table has the following structure:

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key, auto-generated |
| email | TEXT | Email address (unique) |
| name | TEXT | User's name (optional) |
| source | TEXT | Source of the signup (default: 'demo_modal') |
| created_at | TIMESTAMPTZ | Timestamp of creation |
| updated_at | TIMESTAMPTZ | Timestamp of last update |

## Accessing Waitlist Data

To view or export the waitlist data, you can:

1. Use the Supabase dashboard to run queries on the waitlist table
2. Use the Supabase client API to access the data programmatically 