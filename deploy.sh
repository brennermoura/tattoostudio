#!/usr/bin/env bash
set -euo pipefail

REMOTE="tatuapp-api"
REMOTE_DIR="/home/brenner/web/api.danielbrenner.online/private/tatuapp-api"

echo "=== TatuApp Deploy ==="

echo "1. Rodando checks..."
npm run check

echo "2. Copiando API para o servidor..."
scp api/upload-server.mjs "$REMOTE:$REMOTE_DIR/upload-server.mjs"

echo "3. Reiniciando API no PM2..."
ssh "$REMOTE" "export PATH=\$HOME/.nvm/versions/node/v24.15.0/bin:\$PATH && pm2 restart tatuapp-api"

echo "4. Verificando health..."
sleep 2
curl -sf https://api.danielbrenner.online/api/health || echo "WARN: Health check falhou"

echo "=== Deploy concluido ==="