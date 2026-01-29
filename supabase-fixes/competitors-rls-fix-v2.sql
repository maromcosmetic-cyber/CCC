-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert competitors" ON competitors;
DROP POLICY IF EXISTS "Users can view their project competitors" ON competitors;
DROP POLICY IF EXISTS "Users can update their project competitors" ON competitors;
DROP POLICY IF EXISTS "Users can delete their project competitors" ON competitors;

-- Enable RLS
ALTER TABLE competitors ENABLE ROW LEVEL SECURITY;

-- Allow users to INSERT competitors for their own projects
CREATE POLICY "Users can insert competitors for their projects"
ON competitors
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = competitors.project_id
        AND projects.user_id = auth.uid()
    )
);

-- Allow users to SELECT competitors for their own projects
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

-- Allow users to UPDATE competitors for their own projects
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

-- Allow users to DELETE competitors for their own projects
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

