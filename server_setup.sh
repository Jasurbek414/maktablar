#!/bin/bash
set -e
echo "=========================================="
echo "  MAKTAB + GILAM FULL SERVER SETUP"
echo "  Ubuntu 24.04 - From Scratch"
echo "=========================================="

export DEBIAN_FRONTEND=noninteractive

# 1. SYSTEM UPDATE
echo -e "\n[1/10] System update..."
sudo apt-get update -y && sudo apt-get upgrade -y

# 2. INSTALL DEPENDENCIES
echo -e "\n[2/10] Installing dependencies..."
sudo apt-get install -y curl wget git build-essential software-properties-common unzip

# 3. INSTALL NODE.JS 20
echo -e "\n[3/10] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node: $(node -v), NPM: $(npm -v)"

# 4. INSTALL JAVA 17
echo -e "\n[4/10] Installing Java 17 + Maven..."
sudo apt-get install -y openjdk-17-jdk maven
echo "Java: $(java -version 2>&1 | head -1)"

# 5. INSTALL POSTGRESQL
echo -e "\n[5/10] Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create databases
echo -e "\n[5b] Creating databases..."
sudo -u postgres psql -c "CREATE DATABASE maktabdb;" 2>/dev/null || echo "maktabdb exists"
sudo -u postgres psql -c "CREATE DATABASE gilamdb;" 2>/dev/null || echo "gilamdb exists"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres123';" 2>/dev/null
echo "PostgreSQL ready!"

# 6. INSTALL NGINX
echo -e "\n[6/10] Installing Nginx..."
sudo apt-get install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 7. CLONE PROJECTS
echo -e "\n[7/10] Cloning projects..."
cd /home/team
git clone https://github.com/Jasurbek414/maktablar.git maktab-platforma 2>/dev/null || (cd maktab-platforma && git pull origin main)
git clone https://github.com/Jasurbek414/gilam-platforma.git gilam-platforma 2>/dev/null || (cd gilam-platforma && git pull origin main)

# 8. BUILD MAKTAB
echo -e "\n[8/10] Building Maktab Platform..."
cd /home/team/maktab-platforma

# Frontend
cd frontend
npm install
npm run build
cd ..

# Backend
cd backend
mvn clean package -DskipTests
cd ..
echo "Maktab build DONE!"

# 9. BUILD GILAM
echo -e "\n[9/10] Building Gilam Platform..."
cd /home/team/gilam-platforma

# Check structure
if [ -d "frontend" ]; then
  cd frontend && npm install && npm run build && cd ..
fi
if [ -d "backend" ]; then
  cd backend && npm install && cd ..
fi
if [ -f "package.json" ]; then
  npm install
fi
echo "Gilam build DONE!"

# 10. NGINX CONFIG
echo -e "\n[10/10] Configuring Nginx..."

# Maktab
sudo tee /etc/nginx/sites-available/maktab > /dev/null << 'NGINX'
server {
    listen 8080;
    server_name maktab.ecos.uz;
    root /home/team/maktab-platforma/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:8081/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

# Gilam
sudo tee /etc/nginx/sites-available/gilam > /dev/null << 'NGINX'
server {
    listen 8090;
    server_name gilam.ecos.uz;
    root /home/team/gilam-platforma/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/maktab /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/gilam /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
echo "Nginx configured!"

# SYSTEMD SERVICES

# Maktab Backend Service
sudo tee /etc/systemd/system/maktab-backend.service > /dev/null << 'SVC'
[Unit]
Description=Maktab Backend (Spring Boot)
After=network.target postgresql.service

[Service]
User=team
WorkingDirectory=/home/team/maktab-platforma/backend
ExecStart=/usr/bin/java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/maktabdb --spring.datasource.username=postgres --spring.datasource.password=postgres123 --spring.jpa.hibernate.ddl-auto=update --server.port=8081
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

# Gilam Backend Service
sudo tee /etc/systemd/system/gilam-backend.service > /dev/null << 'SVC'
[Unit]
Description=Gilam Backend (Node.js)
After=network.target postgresql.service

[Service]
User=team
WorkingDirectory=/home/team/gilam-platforma/backend
Environment=DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/gilamdb
Environment=PORT=3001
Environment=NODE_ENV=production
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC

sudo systemctl daemon-reload
sudo systemctl enable maktab-backend gilam-backend
sudo systemctl start maktab-backend
sudo systemctl start gilam-backend

echo ""
echo "=========================================="
echo "  SETUP COMPLETE!"
echo "=========================================="
echo "  Maktab: http://localhost:8080"
echo "  Gilam:  http://localhost:8090"
echo "  Maktab API: http://localhost:8081"
echo "  Gilam API:  http://localhost:3001"
echo ""
echo "  Next: Set up Cloudflare tunnels"
echo "=========================================="
