name: Deploy to Web Server

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: self-hosted

    steps:
      - name: Deploy locally on runner
        run: |
          cd /var/www/YTech-Web-Application
          ./deploy.sh
