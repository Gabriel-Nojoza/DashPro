# DashPro Business — Backend API

API REST construída com **FastAPI** + **PostgreSQL (Supabase)** para o sistema SaaS de gestão empresarial.

## Stack

- Python 3.11
- FastAPI 0.111
- SQLAlchemy 2.0 (async)
- Pydantic v2
- JWT (python-jose)
- BCrypt (passlib)
- Supabase PostgreSQL

## Estrutura

```
backend/
├── app/
│   ├── main.py              # App FastAPI + routers
│   ├── config.py            # Configurações (.env)
│   ├── database.py          # Engine SQLAlchemy async
│   ├── dependencies.py      # Auth guards + RBAC
│   ├── auth/
│   │   └── security.py      # JWT + bcrypt
│   ├── models/              # SQLAlchemy ORM models
│   │   ├── company.py
│   │   ├── user.py
│   │   ├── client.py
│   │   ├── product.py
│   │   ├── stock.py
│   │   ├── order.py
│   │   ├── whatsapp.py
│   │   ├── plan.py
│   │   └── log.py
│   ├── schemas/             # Pydantic schemas (I/O)
│   ├── routers/             # Endpoints FastAPI
│   │   ├── auth.py
│   │   ├── clients.py
│   │   ├── products.py
│   │   ├── movements.py
│   │   ├── orders.py
│   │   ├── dashboard.py
│   │   ├── whatsapp.py
│   │   ├── companies.py
│   │   ├── users.py
│   │   ├── plans.py
│   │   └── reports.py
│   └── services/
│       └── whatsapp.py      # Evolution API client
├── seed.py                  # Dados iniciais
├── run.py                   # Entrypoint
├── requirements.txt
└── .env.example
```

## Setup

### 1. Clone e configure o ambiente

```bash
cd backend
py -3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Observação: no Windows, evite Python 3.14 neste projeto. Dependências como `pandas==2.2.2` não têm wheel compatível nesse ambiente e a instalação falha.

### 2. Configure o .env

```bash
cp .env.example .env
# Edite o .env com suas credenciais Supabase
```

### 3. Execute o SQL no Supabase

Acesse o SQL Editor do seu projeto Supabase e execute o arquivo `../sql/schema.sql`.

### 4. Popule dados iniciais

```bash
python seed.py
```

### 5. Inicie o servidor

```bash
uvicorn app.main:app --reload --port 8000
```

Acesse: http://localhost:8000/docs

## Credenciais Padrão (após seed)

| Usuário | Email | Senha |
|---------|-------|-------|
| Super Admin | admin@dashpro.com | Admin@123 |
| Company Admin | admin@empresa.com | Admin@123 |
| Funcionário | funcionario@empresa.com | Admin@123 |

## Endpoints principais

### Autenticação
- `POST /auth/login` — Login
- `GET /auth/me` — Dados do usuário autenticado
- `POST /auth/change-password` — Alterar senha

### Clientes
- `GET /clients` — Listar (com filtros)
- `POST /clients` — Criar
- `GET /clients/{id}` — Buscar
- `PUT /clients/{id}` — Atualizar
- `DELETE /clients/{id}` — Excluir

### Produtos
- `GET /products` — Listar
- `POST /products` — Criar
- `GET /products/categories` — Listar categorias
- `PUT /products/{id}` — Atualizar
- `DELETE /products/{id}` — Excluir

### Estoque
- `GET /movements` — Listar movimentações
- `POST /movements` — Registrar movimentação (entrada/saída/ajuste/perda/devolução)

### Pedidos
- `GET /orders` — Listar
- `POST /orders` — Criar
- `GET /orders/{id}` — Buscar
- `PATCH /orders/{id}/status` — Atualizar status (baixa automática no estoque ao entregar)
- `DELETE /orders/{id}` — Excluir

### Dashboard
- `GET /dashboard` — KPIs + gráficos da empresa
- `GET /dashboard/super-admin` — Painel geral SaaS

### WhatsApp
- `GET /whatsapp/settings` — Configurações
- `PUT /whatsapp/settings` — Atualizar configurações
- `POST /whatsapp/test` — Testar conexão
- `POST /whatsapp/send` — Enviar mensagem
- `POST /whatsapp/send-report` — Enviar relatório diário

### Relatórios
- `GET /reports/sales` — Relatório de vendas
- `GET /reports/stock` — Relatório de estoque
- `GET /reports/clients` — Relatório de clientes

### Empresas (super_admin)
- `GET /companies` — Listar todas
- `POST /companies` — Criar empresa
- `PUT /companies/{id}` — Atualizar

### Usuários
- `GET /users` — Listar
- `POST /users` — Criar
- `PUT /users/{id}` — Atualizar
- `DELETE /users/{id}` — Excluir

### Planos & Pagamentos
- `GET /plans` — Listar planos
- `POST /plans` — Criar plano (super_admin)
- `GET /payments` — Listar pagamentos

## RBAC (Papéis)

| Ação | super_admin | company_admin | employee |
|------|:-----------:|:-------------:|:--------:|
| Gerir empresas | ✅ | ❌ | ❌ |
| Gerir planos | ✅ | ❌ | ❌ |
| Gerir usuários | ✅ | ✅ (própria empresa) | ❌ |
| CRUD clientes | ✅ | ✅ | ✅ |
| CRUD produtos | ✅ | ✅ | ✅ |
| Movimentar estoque | ✅ | ✅ | ✅ |
| Criar pedidos | ✅ | ✅ | ✅ |
| Config WhatsApp | ✅ | ✅ | ❌ |
| Dashboard | ✅ | ✅ | ✅ |

## Multi-tenant

Todos os dados são isolados por `company_id`. Cada query filtra automaticamente pelo `company_id` do usuário autenticado via JWT.

## WhatsApp (Evolution API)

Configure em `PUT /whatsapp/settings`:
- `api_url`: URL da sua instância Evolution API
- `api_key`: Chave de autenticação
- `instance`: Nome da instância
- `phone_number` ou `group_id`: Destinatário

Funções disponíveis:
- Relatório diário automático
- Alerta de estoque baixo
- Notificação de pedido entregue
- Envio manual de mensagem
