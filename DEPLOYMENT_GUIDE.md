# Deployment Guide - Rompit OE

## 📋 Pre-Deployment Checklist

### 1. Build React Frontend

```powershell
cd react-frontend
npm install
npm run build
```

This creates `react-frontend/build/` with:

- `index.html` (main entry point)
- `static/css/` (stylesheets)
- `static/js/` (JavaScript bundles)
- `manifest.json`, `robots.txt`, etc.

### 2. Copy Build to Flask Backend

```powershell
# From project root (d:\rn\eamcet)
Copy-Item -Recurse -Force react-frontend\build flask-backend\

# Verify
dir flask-backend\build
# Should show: index.html, static/, manifest.json, robots.txt
```

### 3. Verify Flask Route Order

✅ Check that `db_app.py` has:

1. All API routes FIRST
2. React serving route LAST (before `if __name__`)

```python
# ✅ Correct order in db_app.py:
@app.route('/api/login', methods=['POST'])
# ... all other API routes ...

# At the END:
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    # Serve React build
```

---

## 🚀 Deployment Options

### Option 1: Render.com (Recommended)

#### A. Create `render.yaml` in project root:

```yaml
services:
  - type: web
    name: rompit-oe
    env: python
    buildCommand: |
      pip install -r flask-backend/requirements.txt
      cd react-frontend && npm install && npm run build
      cp -r react-frontend/build flask-backend/
    startCommand: cd flask-backend && python db_app.py
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: rompit-db
          property: connectionString
      - key: JWT_SECRET_KEY
        generateValue: true
      - key: FLASK_ENV
        value: production

databases:
  - name: rompit-db
    databaseName: rompit_oe
    user: rompit_user
```

#### B. Push to GitHub:

```powershell
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

#### C. Deploy on Render:

1. Go to https://render.com
2. New → Web Service
3. Connect your GitHub repo
4. Render will auto-detect `render.yaml`
5. Click "Create Web Service"

---

### Option 2: Manual Deployment (Any Linux Server)

#### 1. Copy files to server:

```bash
# On server
git clone https://github.com/GNANESWARARAO-POLAKI/rompitoe.git
cd rompitoe
```

#### 2. Build React:

```bash
cd react-frontend
npm install
npm run build
cp -r build ../flask-backend/
cd ..
```

#### 3. Setup Python:

```bash
cd flask-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

#### 4. Setup PostgreSQL:

```bash
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb rompit_oe
```

#### 5. Configure environment:

```bash
export DATABASE_URL="postgresql://user:pass@localhost/rompit_oe"
export JWT_SECRET_KEY="your-super-secret-key-here"
export FLASK_ENV="production"
```

#### 6. Run with Gunicorn:

```bash
gunicorn db_app:app --bind 0.0.0.0:5000 --workers 4
```

---

### Option 3: Docker Deployment

#### Create `Dockerfile` in project root:

```dockerfile
# Build React frontend
FROM node:18 AS frontend
WORKDIR /app/react-frontend
COPY react-frontend/package*.json ./
RUN npm install
COPY react-frontend/ ./
RUN npm run build

# Setup Python backend
FROM python:3.12-slim
WORKDIR /app/flask-backend

# Copy backend files
COPY flask-backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY flask-backend/ ./

# Copy React build from frontend stage
COPY --from=frontend /app/react-frontend/build ./build

# Environment variables
ENV FLASK_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Run with Gunicorn
CMD ["gunicorn", "db_app:app", "--bind", "0.0.0.0:5000", "--workers", "4"]
```

#### Build and run:

```powershell
docker build -t rompit-oe .
docker run -p 5000:5000 -e DATABASE_URL="your-db-url" rompit-oe
```

---

## 🔧 Environment Variables

### Required in Production:

| Variable         | Description                  | Example                                   |
| ---------------- | ---------------------------- | ----------------------------------------- |
| `DATABASE_URL`   | PostgreSQL connection string | `postgresql://user:pass@host:5432/dbname` |
| `JWT_SECRET_KEY` | Secret for JWT tokens        | `super-secret-random-string-here`         |
| `FLASK_ENV`      | Environment mode             | `production`                              |

### Optional:

| Variable             | Description           | Default           |
| -------------------- | --------------------- | ----------------- |
| `PORT`               | Server port           | `5000`            |
| `UPLOAD_FOLDER`      | File upload directory | `uploads/`        |
| `MAX_CONTENT_LENGTH` | Max upload size       | `16777216` (16MB) |

---

## 🧪 Testing Deployment

### 1. Test API Endpoints:

```powershell
# Health check
curl http://your-domain.com/

# Login
curl -X POST http://your-domain.com/api/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"test123"}'

# Get tests (with JWT token)
curl http://your-domain.com/api/active-tests `
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. Test React Routes:

- Home: `http://your-domain.com/`
- Login: `http://your-domain.com/login`
- Dashboard: `http://your-domain.com/dashboard`
- Exam: `http://your-domain.com/exam/1`

**All should load without 404 errors** ✅

### 3. Test Static Files:

- CSS: `http://your-domain.com/static/css/main.*.css`
- JS: `http://your-domain.com/static/js/main.*.js`

**Should return file content, not 404** ✅

---

## 🐛 Troubleshooting

### Issue: 405 Method Not Allowed on API calls

**Cause:** Catch-all route defined before API routes

**Fix:**

```python
# Move this to the END of db_app.py (before if __name__)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    pass
```

### Issue: React app shows blank page

**Cause:** Build folder not copied or wrong path

**Fix:**

```powershell
# Rebuild and copy
cd react-frontend
npm run build
cd ..
Copy-Item -Recurse -Force react-frontend\build flask-backend\
```

### Issue: Direct URLs return 404 (e.g., /dashboard)

**Cause:** React routing not handling in Flask

**Fix:** Ensure serve_react returns index.html for non-file paths:

```python
# If path doesn't exist as file, serve index.html
if not os.path.exists(os.path.join(build_dir, path)):
    return send_file(os.path.join(build_dir, 'index.html'))
```

### Issue: Database connection fails

**Cause:** Wrong DATABASE_URL or PostgreSQL not accessible

**Fix:**

```bash
# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:5432/dbname

# Test connection
psql $DATABASE_URL
```

### Issue: CORS errors in browser console

**Cause:** CORS not configured or wrong origin

**Fix:** Already configured with `CORS(app)` in db_app.py ✅

---

## 📊 Production Monitoring

### 1. Check logs:

```bash
# Render
View logs in Render dashboard

# Gunicorn
tail -f gunicorn.log

# Docker
docker logs -f rompit-oe
```

### 2. Database health:

```python
# Add health check endpoint
@app.route('/api/health')
def health():
    try:
        db.session.execute('SELECT 1')
        return jsonify({'status': 'healthy', 'database': 'connected'}), 200
    except:
        return jsonify({'status': 'unhealthy', 'database': 'disconnected'}), 503
```

### 3. Performance monitoring:

```python
from flask import g
import time

@app.before_request
def start_timer():
    g.start = time.time()

@app.after_request
def log_request(response):
    if hasattr(g, 'start'):
        elapsed = time.time() - g.start
        print(f"{request.method} {request.path} - {response.status_code} - {elapsed:.2f}s")
    return response
```

---

## ✅ Post-Deployment Checklist

- [ ] React build copied to `flask-backend/build/`
- [ ] All API routes defined before catch-all route in `db_app.py`
- [ ] DATABASE_URL set in environment variables
- [ ] JWT_SECRET_KEY set (strong, random value)
- [ ] Test API endpoints (login, submit, questions)
- [ ] Test React routes (/, /login, /dashboard, /exam/:id)
- [ ] Test direct URLs (refresh on /dashboard works)
- [ ] Static files loading (CSS, JS, images)
- [ ] Database initialized with default data
- [ ] Admin user created for enrollment management
- [ ] SSL/HTTPS enabled (Render provides automatically)
- [ ] CORS configured (already done)
- [ ] Error logging setup
- [ ] Backup strategy for database

---

## 🎉 Success!

Your app is live at: **https://your-app-name.onrender.com**

Users can:

- ✅ Login at `/login`
- ✅ See enrolled tests at `/dashboard`
- ✅ Take exams at `/exam/:id`
- ✅ View results with detailed analysis
- ✅ Admins can manage enrollments via API

---

## 🔄 Updates & Maintenance

### To deploy updates:

```powershell
# 1. Make changes
# 2. Rebuild React
cd react-frontend
npm run build

# 3. Copy build
cd ..
Copy-Item -Recurse -Force react-frontend\build flask-backend\

# 4. Commit and push
git add .
git commit -m "Update: description of changes"
git push origin main

# Render will auto-deploy from GitHub
```

### Database migrations:

```python
# Add to db_app.py for schema changes
with app.app_context():
    # Add new columns, tables, etc.
    db.create_all()
```

---

**Questions?** Check `REACT_FLASK_SERVING.md` for detailed route order explanation.
