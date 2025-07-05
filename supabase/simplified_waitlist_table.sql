-- Create waitlist table for storing interested users
CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    name TEXT,
    source TEXT DEFAULT 'demo_modal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS waitlist_email_idx ON public.waitlist (email);
CREATE INDEX IF NOT EXISTS waitlist_source_idx ON public.waitlist (source); 