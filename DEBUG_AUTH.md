# Debugging Authentication Issues

## Quick Debugging Steps

### 1. Check PM2 Status
```bash
pm2 status
pm2 logs love-bin --lines 100
```

### 2. Test Backend Accessibility
```bash
# Test if backend is running
curl http://localhost:3001/api/test
curl http://localhost:3001/api/auth/debug

# Test if nginx is proxying correctly
curl https://fikirbingo.com/api/test
curl https://fikirbingo.com/api/auth/debug
```

### 3. Monitor Auth Requests in Real-Time
```bash
# Watch for auth requests
pm2 logs love-bin --lines 0 | grep -E "(Auth request|telegram/verify|initData)"
```

### 4. Check Nginx Configuration
The nginx config should have:
```nginx
location /api/ {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

## Common Issues

### Issue 1: No auth requests in logs
**Symptoms**: Access restricted screen shows, but no logs appear
**Possible causes**:
- Nginx not proxying `/api/*` correctly
- Frontend not making requests (check browser network tab if possible)
- CORS issues

### Issue 2: initData is missing
**Symptoms**: Auth requests show "MISSING_TELEGRAM_DATA"
**Possible causes**:
- Domain not set in BotFather
- User accessing URL directly instead of through bot
- Telegram WebApp SDK not loading

### Issue 3: Hash verification fails
**Symptoms**: Auth requests show "INVALID_TELEGRAM_DATA"
**Possible causes**:
- BOT_TOKEN mismatch
- initData corrupted or modified
- Time sync issues

## Verification Steps

1. **Check if Telegram WebApp is loading**:
   - Open app through Telegram bot
   - Check PM2 logs for any errors
   - Look for "Telegram WebApp" initialization messages

2. **Verify BotFather Configuration**:
   - Bot must have web app domain set: `fikirbingo.com`
   - Use `/setdomain` command in BotFather

3. **Test Authentication Endpoint**:
   ```bash
   # Should return debug info
   curl https://fikirbingo.com/api/auth/debug
   ```

4. **Monitor Live Requests**:
   ```bash
   # While user tries to access app
   pm2 logs love-bin --lines 0
   ```

## Expected Log Output

When authentication works, you should see:
```
🔐 [requestId] /auth/telegram/verify called
🔍 Verifying initData: ...
✅ Hash verification passed
👤 [requestId] Telegram User ID: ...
✅ [requestId] Sending auth response
```

When it fails, you'll see:
```
❌ [requestId] MISSING initData in request body
OR
❌ Hash verification failed: ...
```

