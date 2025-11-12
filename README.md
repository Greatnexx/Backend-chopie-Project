# Restaurant Backend API

## Deploy to Render

1. Push your code to GitHub
2. Connect your GitHub repo to Render
3. Set the following environment variables in Render:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Your JWT secret key
   - `FRONTEND_URL` - Your frontend URL (for CORS)
   - `EMAIL_USER` - Email service username
   - `EMAIL_PASS` - Email service password
   - `PORT` - Will be set automatically by Render

## Local Development

```bash
npm install
npm run dev
```

## Production

```bash
npm start
```