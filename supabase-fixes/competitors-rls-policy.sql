-- Fix RLS policy for competitors table
-- Run this in your Supabase SQL Editor

-- Enable RLS if not already enabled
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT competitors
CREATE POLICY "Users can insert competitors"
ON competitors
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to SELECT their own project's competitors
CREATE POLICY "Users can view their project competitors"
ON competitors
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = competitors.project_id
        AND projects.user_id = auth.uid()
    )
);

-- Allow users to UPDATE their own project's competitors
CREATE POLICY "Users can update their project competitors"
ON competitors
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = competitors.project_id
        AND projects.user_id = auth.uid()
    )
);

-- Allow users to DELETE their own project's competitors
CREATE POLICY "Users can delete their project competitors"
ON competitors
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = competitors.project_id
        AND projects.user_id = auth.uid()
    )
);

