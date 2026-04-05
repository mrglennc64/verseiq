#!/usr/bin/env bash
set -euo pipefail

APP_USER="verseiq"
APP_ROOT="/var/www/useverseiq.com"
APP_DIR="$APP_ROOT/app"
DOMAIN="useverseiq.com"
WWW_DOMAIN="www.useverseiq.com"
SERVICE_NAME="useverseiq"

apt update
apt install -y curl gnupg2 ca-certificates lsb-release nginx

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  adduser --system --group --home "$APP_ROOT" "$APP_USER"
fi

mkdir -p "$APP_DIR"
mkdir -p "$APP_ROOT/shared"
chown -R "$APP_USER:$APP_USER" "$APP_ROOT"

cat > /etc/nginx/sites-available/$DOMAIN <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN $WWW_DOMAIN;

    access_log /var/log/nginx/$DOMAIN.access.log;
    error_log /var/log/nginx/$DOMAIN.error.log;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-enabled/default

cat > /etc/systemd/system/$SERVICE_NAME.service <<EOF
[Unit]
Description=VerseIQ Next.js app
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
nginx -t
systemctl enable nginx
systemctl restart nginx

echo
echo "Setup complete."
echo "Upload the app into: $APP_DIR"
echo "Create .env.local with Spotify credentials in: $APP_DIR/.env.local"
echo "Then run as $APP_USER: cd $APP_DIR && npm install && npm run build"
echo "Then enable and start: systemctl enable $SERVICE_NAME && systemctl start $SERVICE_NAME"