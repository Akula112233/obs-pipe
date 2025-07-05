-- Create vector_instances table
CREATE TABLE vector_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    port INTEGER NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE vector_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own vector instances"
    ON vector_instances
    FOR ALL
    USING (auth.uid() = user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vector_instances_updated_at
    BEFORE UPDATE ON vector_instances
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create unique index on port to prevent conflicts
CREATE UNIQUE INDEX vector_instances_port_idx ON vector_instances(port); 