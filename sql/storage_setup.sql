-- ============================================================
-- Supabase Storage - buckets usados pelo DashPro
-- Execute no SQL Editor do Supabase junto com o setup principal.
-- ============================================================

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
) VALUES
    (
        'veiculos',
        'veiculos',
        TRUE,
        10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'dashpro-docs',
        'dashpro-docs',
        FALSE,
        52428800,
        NULL
    )
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read vehicle photos" ON storage.objects;

CREATE POLICY "Public read vehicle photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'veiculos');
