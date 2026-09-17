#!/bin/bash
set -e
echo "=========================================="
echo "  MAKTAB FULL SERVER SETUP"
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
sudo service postgresql start

# Create databases
echo -e "\n[5b] Creating databases..."
# MUHIM: avval DB paroli va (pastda) JWT_SECRET shu skriptga qattiq yozilgan/berilmagan edi
# ("postgres123" va JWT_SECRET umuman uzatilmagan — natijada backend kodga yozilgan standart
# JWT kalitiga tushib qolardi, bu esa public repo'da ochiq edi). Endi ikkalasi ham repo
# ildizidagi .env fayldan o'qiladi — shu skript ishlatilishidan oldin .env to'ldirilgan bo'lishi shart.
if [ ! -f /home/team/maktab-platforma/.env ]; then
    echo "XATO: /home/team/maktab-platforma/.env topilmadi. Avval .env.example'dan nusxa olib to'ldiring." >&2
    exit 1
fi
set -a; source /home/team/maktab-platforma/.env; set +a
if [ -z "$DB_PASSWORD" ] || [ -z "$JWT_SECRET" ]; then
    echo "XATO: .env faylida DB_PASSWORD va JWT_SECRET to'ldirilgan bo'lishi shart." >&2
    exit 1
fi
sudo -u postgres psql -c "CREATE DATABASE maktabdb;" 2>/dev/null || echo "maktabdb exists"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${DB_PASSWORD}';" 2>/dev/null
echo "PostgreSQL ready!"

# 6. INSTALL NGINX & PM2
echo -e "\n[6/10] Installing Nginx and PM2..."
sudo apt-get install -y nginx
sudo service nginx start
sudo npm install -g pm2

# 7. CLONE PROJECTS
echo -e "\n[7/10] Cloning projects..."
cd /home/team
git clone https://github.com/Jasurbek414/maktablar.git maktab-platforma 2>/dev/null || (cd maktab-platforma && git pull origin main)

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

sudo ln -sf /etc/nginx/sites-available/maktab /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo service nginx reload
echo "Nginx configured!"

# START BACKENDS WITH PM2
echo -e "\n[11/11] Starting Backends with PM2..."

# Maktab Backend
cd /home/team/maktab-platforma/backend
pm2 start "java -jar target/backend-0.0.1-SNAPSHOT.jar --spring.datasource.url=jdbc:postgresql://localhost:5432/maktabdb --spring.datasource.username=postgres --spring.datasource.password=${DB_PASSWORD} --app.jwt.secret=${JWT_SECRET} --spring.jpa.hibernate.ddl-auto=update --server.port=8081" --name "maktab-backend"

pm2 save

echo ""
echo "=========================================="
echo "  SETUP COMPLETE!"
echo "=========================================="
echo "  Maktab: http://localhost:8080"
echo "  Maktab API: http://localhost:8081"
echo "=========================================="
