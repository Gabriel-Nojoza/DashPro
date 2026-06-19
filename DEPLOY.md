# Hospedagem do DashPro

Este projeto usa:

- Frontend: React/Vite (`frontend`)
- Backend: FastAPI (`backend`)
- Banco e arquivos: Supabase
- Bot WhatsApp/PDF: Node (`bot-pdf-baileys`)

## 1. Supabase

1. Abra o Supabase.
2. Rode o arquivo `sql/supabase_full_setup.sql` no SQL Editor.
3. Pegue a senha do banco e monte a URL:

```env
DATABASE_URL=postgresql://postgres:SENHA_DO_BANCO@db.orjwiawqvgutqcoyvqsa.supabase.co:5432/postgres
```

## 2. Backend no Render

Crie um Web Service usando o arquivo `render.yaml`.

Variaveis obrigatorias:

```env
DATABASE_URL=postgresql://postgres:SENHA_DO_BANCO@db.orjwiawqvgutqcoyvqsa.supabase.co:5432/postgres
SUPABASE_URL=https://orjwiawqvgutqcoyvqsa.supabase.co
SUPABASE_KEY=SUA_CHAVE_ANON
SUPABASE_SERVICE_KEY=SUA_CHAVE_SERVICE_ROLE
SECRET_KEY=uma-chave-grande-e-secreta
CORS_ORIGINS=https://SEU-FRONTEND.vercel.app
PDF_BAILEYS_BOT_URL=https://URL-DO-BOT
```

Comando de start:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Depois de publicar, teste:

```text
https://SUA-API.onrender.com/health
https://SUA-API.onrender.com/docs
```

## 3. Frontend na Vercel

Configure:

```text
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

Variavel obrigatoria:

```env
VITE_API_URL=https://SUA-API.onrender.com
```

Depois que a Vercel gerar a URL final, volte no backend e ajuste:

```env
CORS_ORIGINS=https://SEU-FRONTEND.vercel.app
```

## 4. Bot

O `render.yaml` tambem inclui o servico `dashpro-bot`.

Depois de publicar o bot, copie a URL dele para o backend:

```env
PDF_BAILEYS_BOT_URL=https://SEU-BOT.onrender.com
```

## 5. Login inicial

O SQL completo cria:

```text
Email: admin@dashpro.com
Senha: Admin@123
Perfil: super_admin
```

Troque essa senha depois do primeiro acesso.
