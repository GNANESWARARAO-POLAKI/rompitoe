# React Build Serving in Flask - Route Order Guide

## 🚨 Critical Concept: Route Order Matters!

Flask processes routes **in the order they are defined**. This is crucial when serving a React SPA (Single Page Application) alongside API routes.

---

## ❌ **WRONG - Causes 405 Method Not Allowed**

```python
from flask import Flask, send_file

app = Flask(__name__)

# ❌ WRONG: Catch-all route at the START
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    # This catches EVERYTHING, including /api/login
    return send_file('build/index.html')

# ❌ These API routes are NEVER reached!
@app.route('/api/login', methods=['POST'])
def login():
    return {'token': 'abc123'}

@app.route('/api/submit', methods=['POST'])
def submit():
    return {'score': 85}
```

### What happens:

1. User sends `POST /api/login`
2. Flask checks routes from top to bottom
3. `/<path:path>` matches first (path='api/login')
4. `serve_react()` is called - but it only handles GET requests
5. **Result: 405 Method Not Allowed** ❌

---

## ✅ **CORRECT - API Routes Work Perfectly**

```python
from flask import Flask, send_file, jsonify
import os

app = Flask(__name__)

# ✅ CORRECT: API routes FIRST
@app.route('/api/login', methods=['POST'])
def login():
    return jsonify({'token': 'abc123'})

@app.route('/api/submit', methods=['POST'])
def submit():
    return jsonify({'score': 85})

@app.route('/api/questions', methods=['GET'])
def get_questions():
    return jsonify([{'id': 1, 'text': 'What is 2+2?'}])

# ✅ CORRECT: Catch-all route at the END
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    """
    Serve React build files.
    This MUST be at the end after all API routes.
    """
    react_build = os.path.join(os.path.dirname(__file__), 'build')

    # If build folder doesn't exist
    if not os.path.exists(react_build):
        return jsonify({
            'status': 'running',
            'message': 'API is running',
            'note': 'Run npm run build to create React production build'
        }), 200

    # Serve specific files if they exist
    if path and os.path.exists(os.path.join(react_build, path)):
        return send_file(os.path.join(react_build, path))

    # Serve index.html for client-side routing
    index_path = os.path.join(react_build, 'index.html')
    if os.path.exists(index_path):
        return send_file(index_path)

    return jsonify({'error': 'React build not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
```

### What happens:

1. User sends `POST /api/login`
2. Flask checks routes from top to bottom
3. `/api/login` matches first ✅
4. `login()` is called
5. **Result: Returns token successfully** ✅

---

## 📋 Route Matching Order

Flask checks routes **in definition order** and uses the **first match**:

| Request              | Route Checked    | Match? | Handler Called             |
| -------------------- | ---------------- | ------ | -------------------------- |
| `POST /api/login`    | `/api/login`     | ✅ Yes | `login()`                  |
| `GET /api/questions` | `/api/questions` | ✅ Yes | `get_questions()`          |
| `GET /dashboard`     | `/api/login`     | ❌ No  | Continue...                |
| `GET /dashboard`     | `/<path:path>`   | ✅ Yes | `serve_react('dashboard')` |
| `GET /`              | `/`              | ✅ Yes | `serve_react('')`          |

---

## 🎯 Best Practices

### 1. **Always define API routes before the catch-all**

```python
# API routes
@app.route('/api/users', methods=['GET', 'POST'])
@app.route('/api/tests/<int:id>', methods=['GET', 'PUT', 'DELETE'])
@app.route('/api/submit', methods=['POST'])

# React catch-all (at the end)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    pass
```

### 2. **Use specific prefixes for API routes**

```python
# Good: All APIs under /api prefix
@app.route('/api/login')
@app.route('/api/submit')
@app.route('/api/questions')

# Better with Blueprint
from flask import Blueprint

api_bp = Blueprint('api', __name__, url_prefix='/api')

@api_bp.route('/login')
@api_bp.route('/submit')

app.register_blueprint(api_bp)
```

### 3. **Add fallback for missing build**

```python
@app.route('/<path:path>')
def serve_react(path):
    if not os.path.exists('build'):
        return jsonify({
            'error': 'React build not found',
            'instructions': [
                '1. cd react-frontend',
                '2. npm install',
                '3. npm run build',
                '4. Copy build folder to flask-backend/'
            ]
        }), 404
    # ... serve files
```

---

## 🔄 Development vs Production

### Development (Separate Servers)

```bash
# Terminal 1 - React Dev Server (port 3000)
cd react-frontend
npm start

# Terminal 2 - Flask API (port 5000)
cd flask-backend
python db_app.py
```

**React proxy in package.json:**

```json
{
  "proxy": "http://localhost:5000"
}
```

### Production (Single Server)

```bash
# Build React
cd react-frontend
npm run build

# Copy build to Flask
cp -r build ../flask-backend/

# Run Flask (serves both API and React)
cd flask-backend
python db_app.py
```

**All requests go to Flask:**

- `/api/*` → API handlers
- Everything else → React build

---

## 🐛 Common Errors

### Error: 405 Method Not Allowed

**Cause:** Catch-all route defined before API routes

**Solution:** Move catch-all to the end

### Error: 404 Not Found

**Cause:** React routing not working (direct URLs fail)

**Solution:** Always return `index.html` for non-file paths

```python
if path and os.path.exists(os.path.join(build_dir, path)):
    return send_file(os.path.join(build_dir, path))
else:
    return send_file(os.path.join(build_dir, 'index.html'))  # ✅
```

### Error: Static files not loading

**Cause:** Wrong base path or wrong static file handling

**Solution:** Serve static files explicitly

```python
# In React build, files are in /static/css, /static/js
if path.startswith('static/'):
    return send_file(os.path.join(build_dir, path))
```

---

## 📦 Complete Production Setup

### 1. Build React

```bash
cd react-frontend
npm run build
```

### 2. Copy to Flask

```bash
# Windows PowerShell
Copy-Item -Recurse -Force react-frontend\build flask-backend\

# Linux/Mac
cp -r react-frontend/build flask-backend/
```

### 3. Update db_app.py

```python
# All API routes first
@app.route('/api/login', methods=['POST'])
def login(): pass

@app.route('/api/submit', methods=['POST'])
def submit(): pass

# ... more API routes ...

# React serving at the END
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    # Serve React build
    pass

if __name__ == '__main__':
    app.run()
```

### 4. Deploy

```bash
# Render, Heroku, etc.
python db_app.py
```

---

## ✅ Verification Checklist

- [ ] All API routes defined before catch-all route
- [ ] Catch-all route only handles GET requests
- [ ] React build folder copied to flask-backend/build
- [ ] API endpoints tested: `POST /api/login` returns 200, not 405
- [ ] React routing works: Direct URLs like `/dashboard` load correctly
- [ ] Static files load: CSS and JS from /static/\* folder

---

## 🎓 Summary

**Key Rule:** Flask routes are processed in definition order.

**Best Practice:**

1. Define specific routes first (API endpoints)
2. Define catch-all routes last (React serving)
3. Use prefixes (`/api/*`) for clarity

**Remember:** The order in your code determines the order Flask checks routes. Put the most specific routes first, and the most general routes last.
