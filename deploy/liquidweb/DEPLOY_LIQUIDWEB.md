# Deploy a Liquid Web (Ubuntu 24.04)

Project: posvental
Server IP: 50.28.103.1
App port: 3002
Domain: www.posexercise.com

## 1) DNS in Namecheap

Create/verify these records:

- Type `A`, Host `@`, Value `50.28.103.1`, TTL `Automatic`
- Type `A`, Host `www`, Value `50.28.103.1`, TTL `Automatic`

Wait until DNS propagation is complete.

## 2) First-time server setup

Run on server as root or sudo:

```bash
apt update
apt install -y curl git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm i -g pm2
```

## 3) Deploy app source

```bash
mkdir -p /var/www
cd /var/www

# If first deploy
git clone https://github.com/Mike861205/posvental.git

cd /var/www/posvental
git pull origin main
npm ci
```

## 4) Configure production environment

Create `/var/www/posvental/.env`:

```env
DATABASE_URL="YOUR_PRODUCTION_DATABASE_URL"
NEXTAUTH_URL="https://www.posexercise.com"
NEXTAUTH_SECRET="YOUR_LONG_RANDOM_SECRET"
```

Optional payment keys if needed:

```env
# STRIPE_SECRET_KEY=
# MP_ACCESS_TOKEN=
```

Generate strong secret example:

```bash
openssl rand -base64 48
```

## 5) Build and Prisma sync

```bash
cd /var/www/posvental
npm run db:push
npx prisma generate --no-engine
npm run build
```

## 6) Start with PM2 on port 3002

```bash
cd /var/www/posvental
pm2 start deploy/liquidweb/ecosystem.config.cjs
pm2 save
pm2 startup
```

Useful PM2 commands:

```bash
pm2 status
pm2 logs posexercise --lines 120
pm2 restart posexercise
```

## 7) Nginx reverse proxy

```bash
cp /var/www/posvental/deploy/liquidweb/nginx.posexercise.com.conf /etc/nginx/sites-available/posexercise.com
ln -sf /etc/nginx/sites-available/posexercise.com /etc/nginx/sites-enabled/posexercise.com
nginx -t
systemctl reload nginx
```

## 8) SSL (Let's Encrypt)

```bash
certbot --nginx -d posexercise.com -d www.posexercise.com
```

Verify auto-renew:

```bash
systemctl status certbot.timer
```

## 9) Smoke checks

```bash
curl -I http://127.0.0.1:3002
curl -I https://www.posexercise.com
```

Then open:

- https://www.posexercise.com
- https://www.posexercise.com/login

## 10) Update workflow

When you push changes to GitHub:

```bash
cd /var/www/posvental
git pull origin main
npm ci
npm run db:push
npx prisma generate --no-engine
npm run build
pm2 restart posexercise
```
