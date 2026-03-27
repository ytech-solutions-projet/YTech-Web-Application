#!/bin/bash
set -e

echo "[1/7] Go to repo"
cd /var/www/YTech-Web-Application

echo "[2/7] Pull latest code"
git pull origin main

echo "[3/7] Install frontend deps"
cd frontend
npm install

echo "[4/7] Build frontend"
npm run build

echo "[5/7] Deploy frontend to Nginx web root"
sudo rsync -av --delete build/ /var/www/html/

echo "[6/7] Install backend deps"
cd ../backend
npm install

echo "[7/7] Restart backend and reload Nginx"
pm2 restart ytech-backend --update-env
sudo nginx -t
sudo systemctl reload nginx

echo "Deploy finished successfully"
