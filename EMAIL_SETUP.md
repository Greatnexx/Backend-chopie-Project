# Email Service Setup & Troubleshooting Guide

## 🚀 Quick Fix Summary

Your email service has been optimized with the following improvements:

### ✅ What Was Fixed:
1. **Immediate Email Delivery** - Emails now send immediately instead of being queued
2. **Connection Pooling** - Better Gmail connection management
3. **Retry Mechanism** - Failed emails automatically retry up to 3 times
4. **Startup Validation** - Email service is tested when server starts
5. **Better Error Handling** - Clear error messages for troubleshooting
6. **Status Update Emails** - Order status changes now trigger customer emails

## 🔧 Testing Your Email Setup

### 1. Test Email Configuration
```bash
npm run test-email
```

### 2. Test via API Endpoint
Visit: `http://localhost:8000/test-email`

### 3. Check Server Logs
Look for these messages when server starts:
- ✅ Email service configured successfully
- 📧 Email configured for: your-email@gmail.com

## 📧 Gmail App Password Setup

### Step 1: Enable 2-Factor Authentication
1. Go to Google Account settings
2. Security → 2-Step Verification
3. Turn on 2-Step Verification

### Step 2: Generate App Password
1. Go to Google Account → Security
2. 2-Step Verification → App passwords
3. Select "Mail" and your device
4. Copy the 16-character password (no spaces)

### Step 3: Update .env File
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

## 🐛 Common Issues & Solutions

### Issue 1: "Authentication failed"
**Solution:** 
- Verify Gmail App Password is exactly 16 characters
- Ensure 2-Factor Authentication is enabled
- Generate a new App Password

### Issue 2: "Connection timeout"
**Solution:**
- Check internet connection
- Verify Gmail service is not blocked by firewall
- Try restarting the server

### Issue 3: "Rate limit exceeded"
**Solution:**
- The service now includes rate limiting (14 emails/second)
- Failed emails are automatically queued for retry

### Issue 4: Emails not sending immediately
**Solution:**
- Emails now send immediately when triggered
- Check server logs for email processing messages
- Use the test endpoints to verify functionality

## 📊 Email Service Features

### Automatic Email Triggers:
1. **Order Confirmation** - When customer places order
2. **Order Status Updates** - When order status changes (preparing → completed)
3. **User Account Creation** - When admin creates staff accounts
4. **Password Reset** - When password reset is requested

### Built-in Retry System:
- Failed emails retry up to 3 times
- 5-second intervals between retries
- Queue processing every 5 seconds

### Connection Optimization:
- Connection pooling for better performance
- Rate limiting to prevent Gmail blocks
- Secure TLS connections

## 🔍 Monitoring Email Delivery

### Server Logs to Watch:
```
✅ Email sent immediately to customer@email.com
📧 Email queued for retry to customer@email.com
🔄 Retrying email to customer@email.com, 2 retries left
❌ Email failed to customer@email.com: [error message]
```

### Health Check Endpoints:
- `GET /test-email` - Test email configuration
- `GET /test` - General server health

## 🚨 Emergency Troubleshooting

If emails still don't work:

1. **Check Environment Variables:**
   ```bash
   echo $EMAIL_USER
   echo $EMAIL_PASS
   ```

2. **Verify Gmail Settings:**
   - 2FA enabled
   - App password generated
   - Less secure app access (if needed)

3. **Test Gmail Connection:**
   ```bash
   npm run test-email
   ```

4. **Check Server Logs:**
   Look for authentication errors or connection issues

## 📞 Support

If issues persist:
1. Check the server console for detailed error messages
2. Verify your Gmail account settings
3. Test with the provided test script
4. Review the EMAIL_SETUP.md troubleshooting steps

---

**Note:** The email service now processes emails immediately for faster delivery. All email functions include proper error handling and retry mechanisms.