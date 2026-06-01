# Posvental — SaaS Multi-tenant de Suscripciones

SaaS para administrar suscripciones de gimnasios y estudios (Zumba, JumpiFit, CrossFit, Gym, etc.)
con multi-tenant, autenticación, planes, miembros, vencimientos, cobros con **Stripe** y **Mercado Pago**.

## Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + Recharts (gráficos)
- Prisma + PostgreSQL (Neon)
- NextAuth (Credenciales)
- Stripe + Mercado Pago

---

## 1. Setup local

```bash
cd c:\posvental
npm install
cp .env.example .env   # ajusta DATABASE_URL y NEXTAUTH_SECRET
npx prisma db push
npm run dev
```

Abre http://localhost:3000

1. Crea tu cuenta (registra el tenant) en `/signup`.
2. Inicia sesión en `/login`.
3. Vas al `/dashboard`.

### Bases de datos Neon

- **Pruebas**: `ep-divine-bird-aqtsh1px-pooler...` (en `.env`)
- **Producción**: `ep-flat-hill-aqpl6w7p-pooler...` (define `DATABASE_URL` en el servidor)

Para aplicar el schema:
```bash
npx prisma db push
```

---

## 2. Deploy en Liquid Web (Ubuntu)

```bash
# Como root o sudo
apt update && apt install -y curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm i -g pm2

# Clonar el repo
cd /var/www
git clone https://github.com/Mike861205/posvental.git
cd posvental

# Variables de entorno (producción)
cat > .env <<'EOF'
DATABASE_URL="postgresql://neondb_owner:npg_0DLhoUzyd2Vx@ep-flat-hill-aqpl6w7p-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
NEXTAUTH_URL="https://tu-dominio.com"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
EOF

npm ci
npx prisma db push
npm run build
pm2 start "npm run start" --name posvental
pm2 save && pm2 startup
```

### Nginx (proxy 80 → 3000)
```nginx
server {
  listen 80;
  server_name tu-dominio.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d tu-dominio.com
```

---

## 3. Estructura

```
src/
  app/
    api/                # endpoints (auth, signup, members, plans, subscriptions, settings, pay/*)
    dashboard/          # área protegida (multi-tenant por sesión)
    login/  signup/     # auth
  lib/
    prisma.ts  auth.ts  session.ts  utils.ts
  middleware.ts         # protege /dashboard
prisma/
  schema.prisma         # Tenant, User, Member, Plan, Subscription, Payment
```

## 4. Pagos
- En **Configuración** cada tenant pega su `STRIPE_SECRET_KEY` y/o `MP_ACCESS_TOKEN`.
- Endpoints: `POST /api/pay/stripe` y `POST /api/pay/mercadopago` con `{ subscriptionId }`.

## 5. Comandos útiles
```bash
npm run dev          # desarrollo
npm run build        # build prod
npm run start        # arranque prod
npm run db:push      # sync schema a Neon
npm run db:studio    # explorar la BD
```
