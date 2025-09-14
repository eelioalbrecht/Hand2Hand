Hand2Hand Fullstack (Frontend + Backend)

Structure:
- backend/  (Express + MongoDB API)
- frontend/ (static files: index.html, admin.html, style.css, app.js, admin.js)

Quick start:

1. Backend:
   - cd backend
   - copy .env.example to .env and fill values (MONGO_URI, SMTP credentials, JWT_SECRET, ADMIN_PASS_HASH)
   - generate admin bcrypt hash (node -e "console.log(require('bcryptjs').hashSync('yourpassword',10))") and paste into ADMIN_PASS_HASH
   - npm install
   - npm run dev

2. Frontend:
   - cd frontend
   - serve the directory with a static server:
     - python -m http.server 8000
     - or npx serve .
   - open http://localhost:8000

Notes:
- The backend returns demo OTP in response when SMTP fails (useful for local testing).
- Uploaded images are saved to backend/uploads and served at /uploads/...
- Replace demo configs and secure JWT & SMTP in production.
