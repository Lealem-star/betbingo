#!/bin/bash

# Bet Bingo Server Setup Script
# Run this script on your VPS server after connecting via SSH
# This script will:
# - Install Node.js, PM2, Nginx, Certbot
# - Setup SSH keys for GitHub (if needed)
# - Clone the private repository
# - Install dependencies and build the frontend

set -e  # Exit on error

echo "🚀 Starting Bet Bingo Server Setup..."
echo "======================================"

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install essential tools
echo "📦 Installing essential tools..."
apt install -y curl wget git build-essential

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install Nginx
echo "📦 Installing Nginx..."
apt install -y nginx

# Install Certbot
echo "📦 Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 3001/tcp
ufw --force enable

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www/betbingo
mkdir -p /var/www/betbingo/Bingo-Back/logs

# Setup SSH key for GitHub (if not exists)
echo "🔐 Setting up GitHub authentication..."
if [ ! -f ~/.ssh/id_ed25519 ] && [ ! -f ~/.ssh/id_rsa ]; then
    echo "📝 Generating SSH key for GitHub..."
    ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N "" -C "server@betbingo.com" 2>/dev/null || \
    ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N "" -C "server@betbingo.com"
    
    echo ""
    echo "⚠️  IMPORTANT: Add this SSH key to your GitHub account!"
    echo "📋 Copy the following public key:"
    echo "----------------------------------------"
    if [ -f ~/.ssh/id_ed25519.pub ]; then
        cat ~/.ssh/id_ed25519.pub
    else
        cat ~/.ssh/id_rsa.pub
    fi
    echo "----------------------------------------"
    echo ""
    echo "1. Go to: https://github.com/settings/keys"
    echo "2. Click 'New SSH key'"
    echo "3. Paste the key above"
    echo "4. Press Enter to continue after adding the key..."
    read -r
else
    echo "✅ SSH key already exists"
fi

# Clone repository
echo "📥 Cloning repository..."
cd /var/www/betbingo

# Check if directory is a git repository
if [ -d ".git" ]; then
    echo "✅ Repository already exists, pulling latest changes..."
    git pull betbingo main || echo "⚠️  Could not pull latest changes. Continuing..."
elif [ "$(ls -A /var/www/betbingo 2>/dev/null)" ]; then
    echo "⚠️  Directory is not empty. Please clear it or clone manually."
    echo "   Run: rm -rf /var/www/betbingo/* (if safe to do so)"
    exit 1
else
    # Try SSH first, fallback to HTTPS with token
    echo "🔄 Attempting to clone via SSH..."
    if git clone git@github.com:Lealem-star/betbingo.git . 2>/dev/null; then
        echo "✅ Repository cloned successfully via SSH"
    else
        echo "⚠️  SSH clone failed. Using HTTPS method..."
        echo "📝 Enter your GitHub Personal Access Token:"
        echo "   (Get one from: https://github.com/settings/tokens)"
        echo "   (Make sure it has 'repo' scope)"
        read -r GITHUB_TOKEN
        if git clone https://${GITHUB_TOKEN}@github.com/Lealem-star/betbingo.git .; then
            echo "✅ Repository cloned successfully via HTTPS"
        else
            echo "❌ Failed to clone repository. Please check your authentication."
            echo "   See CLONE_PRIVATE_REPO.md for detailed instructions."
            exit 1
        fi
    fi
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd /var/www/betbingo/Bingo-Back
npm install

# Install frontend dependencies and build
echo "📦 Installing frontend dependencies..."
cd /var/www/betbingo/FrontBingo
npm install
echo "🏗️  Building frontend..."
npm run build

echo ""
echo "✅ Server setup completed!"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in /var/www/betbingo/Bingo-Back/.env"
echo "2. Configure Nginx (see nginx-config.conf or DEPLOYMENT_GUIDE.md)"
echo "3. Setup SSL certificate: certbot --nginx -d betbingo.com -d www.betbingo.com"
echo "4. Start backend: cd /var/www/betbingo/Bingo-Back && pm2 start ecosystem.config.js && pm2 save"
echo ""

