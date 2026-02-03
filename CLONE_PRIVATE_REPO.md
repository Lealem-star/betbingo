# 🔐 How to Clone Private Repository on Server

This guide explains how to clone the private repository `https://github.com/Lealem-star/funbingo.git` on your server.

## Method 1: Using SSH Keys (Recommended) ⭐

This is the most secure and convenient method for long-term use.

### Step 1: Generate SSH Key on Server

SSH into your server and run:

```bash
# Generate SSH key (press Enter to accept default location)
ssh-keygen -t ed25519 -C "your_email@example.com"

# Or if ed25519 is not supported, use RSA:
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Press Enter when prompted for passphrase (or set one for extra security)
```

### Step 2: Copy Public Key

```bash
# Display your public key
cat ~/.ssh/id_ed25519.pub
# Or if using RSA:
cat ~/.ssh/id_rsa.pub
```

### Step 3: Add SSH Key to GitHub

1. Go to GitHub: https://github.com/settings/keys
2. Click **"New SSH key"**
3. Give it a title (e.g., "Server - fikirbingo.com")
4. Paste the public key content
5. Click **"Add SSH key"**

### Step 4: Clone Using SSH

```bash
# Clone using SSH URL
git clone git@github.com:Lealem-star/funbingo.git

# Or if you're in a specific directory:
cd /var/www/fikirbingo
git clone git@github.com:Lealem-star/funbingo.git .
```

---

## Method 2: Using Personal Access Token (PAT) with HTTPS

This method uses HTTPS with a token for authentication.

### Step 1: Create Personal Access Token on GitHub

1. Go to GitHub: https://github.com/settings/tokens
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a name (e.g., "Server Deployment Token")
4. Select expiration (or "No expiration" for long-term)
5. Check the **`repo`** scope (full control of private repositories)
6. Click **"Generate token"**
7. **Copy the token immediately** (you won't see it again!)

### Step 2: Clone Using Token

```bash
# Clone using token (replace YOUR_TOKEN with your actual token)
git clone https://YOUR_TOKEN@github.com/Lealem-star/funbingo.git

# Or clone and then set credentials
git clone https://github.com/Lealem-star/funbingo.git
# When prompted for username: enter your GitHub username
# When prompted for password: paste your token (not your password)
```

### Step 3: Store Credentials (Optional)

To avoid entering credentials every time:

```bash
# Store credentials in git config
git config --global credential.helper store

# Or use credential helper with cache (15 minutes)
git config --global credential.helper 'cache --timeout=900'
```

---

## Method 3: Using GitHub CLI

### Step 1: Install GitHub CLI

```bash
# On Ubuntu/Debian
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### Step 2: Authenticate

```bash
# Login to GitHub
gh auth login

# Follow the prompts:
# - Choose GitHub.com
# - Choose HTTPS
# - Authenticate via web browser or token
```

### Step 3: Clone

```bash
# Clone the repository
gh repo clone Lealem-star/funbingo
```

---

## Quick Setup for Your Server

Based on your `setup-server.sh`, here's the complete process:

### Option A: Using SSH (Recommended)

```bash
# 1. SSH into your server
ssh root@207.180.197.118

# 2. Generate SSH key (if not already done)
ssh-keygen -t ed25519 -C "server@fikirbingo.com"
# Press Enter for all prompts

# 3. Display and copy public key
cat ~/.ssh/id_ed25519.pub

# 4. Add the key to GitHub (via web interface)
# Go to: https://github.com/settings/keys

# 5. Navigate to app directory
cd /var/www/fikirbingo

# 6. Clone the repository
git clone git@github.com:Lealem-star/funbingo.git .

# 7. Install dependencies
cd Bingo-Back && npm install
cd ../FrontBingo && npm install && npm run build
```

### Option B: Using Personal Access Token

```bash
# 1. SSH into your server
ssh root@207.180.197.118

# 2. Navigate to app directory
cd /var/www/fikirbingo

# 3. Clone using token (replace YOUR_TOKEN)
git clone https://YOUR_TOKEN@github.com/Lealem-star/funbingo.git .

# 4. Install dependencies
cd Bingo-Back && npm install
cd ../FrontBingo && npm install && npm run build
```

---

## Troubleshooting

### SSH: Permission Denied

```bash
# Check SSH key permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub

# Test SSH connection
ssh -T git@github.com
# Should return: "Hi Lealem-star! You've successfully authenticated..."
```

### HTTPS: Authentication Failed

- Make sure you're using a **token**, not your password
- Verify the token has `repo` scope
- Check if the token has expired

### Repository Not Found

- Verify the repository exists and is accessible
- Check that your GitHub account has access to the repository
- Ensure you're using the correct repository URL

---

## Security Best Practices

1. **Use SSH keys** for long-term deployments
2. **Never commit tokens or keys** to the repository
3. **Use environment variables** for sensitive data
4. **Rotate tokens** periodically
5. **Use deploy keys** if you only need read access

---

## Setting Up Deploy Keys (Read-Only Access)

If you only need to clone (not push), use deploy keys:

1. Generate SSH key on server: `ssh-keygen -t ed25519 -C "deploy@server"`
2. Copy public key: `cat ~/.ssh/id_ed25519.pub`
3. Go to repository → Settings → Deploy keys → Add deploy key
4. Paste the public key and check "Allow write access" if needed
5. Clone using SSH: `git clone git@github.com:Lealem-star/funbingo.git`

---

## Updating the Repository

After initial clone, to pull latest changes:

```bash
cd /var/www/fikirbingo
git pull origin main
```

If using SSH, this will work automatically. If using HTTPS with token, you may need to re-enter credentials or use stored credentials.

