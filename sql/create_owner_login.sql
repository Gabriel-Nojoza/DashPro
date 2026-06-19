-- Cria ou atualiza o login do dono do sistema (super_admin).
-- Troque email, nome e senha antes de executar no SQL Editor do Supabase.

INSERT INTO users (
    name,
    email,
    hashed_password,
    role,
    company_id,
    is_active
) VALUES (
    'Dono do Sistema',
    'admin@dashpro.com',
    crypt('Admin@123', gen_salt('bf')),
    'super_admin',
    NULL,
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    hashed_password = EXCLUDED.hashed_password,
    role = 'super_admin',
    company_id = NULL,
    is_active = TRUE,
    updated_at = NOW();
