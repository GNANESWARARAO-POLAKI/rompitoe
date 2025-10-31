# 🎓 Rompit-OE Platform

A full-stack web application for conducting online examinations with bilingual support (English & Telugu), real-time scoring, and admin management.

**Live Demo:** [https://rompitoe.onrender.com](https://rompitoe.onrender.com)

---

## 📋 Table of Contents

- [Features](#features)
- [Technologies](#technologies)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Important Notes](#important-notes)

---

## ✨ Features

### Student Features
- 🔐 **Secure Login** - User ID and Date of Birth authentication
- 📝 **Test Taking** - Multi-section exams with bilingual questions
- ⏱️ **Timer** - Countdown timer with auto-submit
- 🎯 **Question Navigation** - Jump to any question, mark for review
- 💾 **Auto-save** - Answers saved in real-time
- 📊 **Instant Results** - Score display after submission
- 🔄 **Section-based Navigation** - Switch between exam sections

### Admin Features
- 👨‍💼 **Admin Dashboard** - Manage tests and users
- 📤 **Excel Upload** - Bulk upload users and questions
- ✏️ **Test Editor** - Create, edit, and manage tests
- 📥 **Score Export** - Download student scores as Excel
- 👥 **User Enrollment** - Control test access per user
- 📈 **Active Test Management** - Enable/disable tests

### Technical Features
- 🌐 **Bilingual Support** - English & Telugu in single interface
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- 🔒 **JWT Authentication** - Secure API endpoints
- 🗄️ **PostgreSQL Database** - Reliable data storage with Neon
- ☁️ **Cloud Deployed** - Hosted on Render.com
- 🚀 **Production Ready** - Optimized React build served by Flask

---

## 🛠️ Technologies

### Frontend
- **React 18** with TypeScript
- **React Router** for navigation
- **Context API** for state management
- **Axios** for API calls
- **CSS3** with custom styling

### Backend
- **Flask** (Python web framework)
- **SQLAlchemy** (ORM)
- **Flask-JWT-Extended** (Authentication)
- **Flask-CORS** (Cross-origin requests)
- **Pandas** (Excel processing)
- **Gunicorn** (Production server)

### Database
- **PostgreSQL** (Neon managed database)
- Tables: User, Test, Section, Question, Submission

### Deployment
- **Render.com** (Backend hosting)
- **GitHub** (Version control)

---

## 🏗️ Architecture

```
┌─────────────────┐
│   React App     │  (TypeScript, React Router)
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/HTTPS
         │ (axios)
         ↓
┌─────────────────┐
│   Flask API     │  (db_app.py)
│   (Backend)     │  JWT Authentication
└────────┬────────┘
         │ SQLAlchemy
         ↓
┌─────────────────┐
│  PostgreSQL DB  │  (Neon)
│   (Database)    │  Users, Tests, Questions
└─────────────────┘
```

### Data Flow
1. **User Login** → JWT token issued → Stored in localStorage
2. **Test Selection** → Fetch active tests → Display to user
3. **Exam Start** → Load questions → Start timer
4. **Answer Submit** → POST to API → Save to database
5. **Exam Complete** → Calculate score → Display results

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16+)
- **Python** (v3.9+)
- **PostgreSQL** (or Neon account)
- **Git**

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/GNANESWARARAO-POLAKI/rompitoe.git
cd rompitoe
```

2. **Set up Python virtual environment**
```bash
cd flask-backend
python -m venv myvenv
```

3. **Activate virtual environment**
- Windows:
  ```bash
  myvenv\Scripts\activate
  ```
- Mac/Linux:
  ```bash
  source myvenv/bin/activate
  ```

4. **Install Python dependencies**
```bash
pip install -r requirements.txt
```

5. **Install React dependencies**
```bash
cd ../react-frontend
npm install
```

---

## 💻 Running Locally

### Option 1: Development Mode (Recommended for development)

**Terminal 1 - Run Flask Backend:**
```bash
cd flask-backend
myvenv\Scripts\activate
python db_app.py
```
Backend runs at: `http://127.0.0.1:5000`

**Terminal 2 - Run React Frontend:**
```bash
cd react-frontend
npm start
```
Frontend runs at: `http://localhost:3000`

### Option 2: Production Mode (Testing deployment setup)

**Step 1 - Build React:**
```bash
cd react-frontend
npm run build
```

**Step 2 - Copy build to Flask:**
```bash
Copy-Item -Recurse -Force build ..\flask-backend\
```

**Step 3 - Run Flask (serves React + API):**
```bash
cd ../flask-backend
myvenv\Scripts\activate
python db_app.py
```
Full app runs at: `http://127.0.0.1:5000`

---

## 📦 Deployment

### Deploy to Render.com

1. **Push to GitHub:**
```bash
git add .
git commit -m "Your commit message"
git push origin main
```

2. **Render auto-deploys** from GitHub (if configured)
   - Build command: `cd flask-backend && pip install -r requirements.txt`
   - Start command: `cd flask-backend && gunicorn db_app:app`

3. **Environment Variables** (set in Render dashboard):
   - `DATABASE_URL` - PostgreSQL connection string (optional, hardcoded in code)
   - `SECRET_KEY` - Flask secret key
   - `JWT_SECRET_KEY` - JWT signing key

### Database Setup (Neon)

The app uses Neon PostgreSQL with connection string hardcoded in `db_app.py`:
```
postgresql://neondb_owner:npg_ETjaJbR48Ovl@ep-tiny-smoke-a4uifbri-pooler.us-east-1.aws.neon.tech/neondb
```

**Tables are auto-created** when the app starts.

---

## 📁 Project Structure

```
eamcet/
├── flask-backend/
│   ├── db_app.py              # Main Flask application
│   ├── requirements.txt       # Python dependencies
│   ├── Procfile              # Render deployment config
│   ├── runtime.txt           # Python version
│   ├── build/                # React production build (deployed)
│   ├── uploads/              # Temporary file storage
│   └── myvenv/               # Python virtual environment
│
├── react-frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── Login.tsx     # Student login
│   │   │   ├── AdminLogin.tsx # Admin login
│   │   │   ├── TestList.tsx  # Test selection
│   │   │   ├── ExamLayout.tsx # Main exam interface
│   │   │   ├── QuestionCard.tsx # Question display
│   │   │   ├── Result.tsx    # Score display
│   │   │   └── AdminPanel.tsx # Admin dashboard
│   │   ├── context/
│   │   │   └── ExamContext.tsx # Global exam state
│   │   ├── services/
│   │   │   └── api.ts        # API client (Axios)
│   │   └── types/
│   │       └── index.ts      # TypeScript types
│   ├── public/
│   ├── package.json          # Node dependencies
│   └── tsconfig.json         # TypeScript config
│
├── sample-data/              # Sample Excel templates
│   ├── generate_sample_files.py
│   └── bilingual_exam_data_generator.ipynb
│
├── plan.md                   # Planning documents
├── newplan.md
├── INSTRUCTIONS.md
└── README.md                 # This file
```

---

## 🔌 API Documentation

### Authentication

**POST** `/login`
```json
{
  "user_id": "12345",
  "dob": "2000-01-15"
}
```
Response: JWT token

**POST** `/admin-login`
```json
{
  "user_id": "admin123",
  "password": "password"
}
```
Response: JWT token

### Tests

**GET** `/active-tests` (Requires JWT)
- Returns list of active tests for logged-in user

**GET** `/questions?test_id=1` (Requires JWT)
- Returns all questions for a test

### Submissions

**POST** `/submit` (Requires JWT)
```json
{
  "test_id": 1,
  "answers": [
    {
      "question_id": 1,
      "selected_answer": "A"
    }
  ]
}
```
Response: Score and submission ID

### Admin Endpoints

**POST** `/upload` (Requires Admin JWT)
- Upload user Excel and exam Excel files
- Form data: `user_file`, `exam_file`, `test_id`

**GET** `/download-scores?test_id=1` (Requires Admin JWT)
- Download scores as Excel file

**POST** `/create-test` (Requires Admin JWT)
- Create new test

**PUT** `/update-test/<test_id>` (Requires Admin JWT)
- Update test details

---

## ⚠️ Important Notes

### File Upload Format

**Users Excel (user_file):**
```
| user_id | dob        | name              |
|---------|------------|-------------------|
| 12345   | 2000-12-27 | John Doe          |
| 67890   | 2001-05-15 | Jane Smith        |
```

**Exam Excel (exam_file):**
- **Multiple sheets** - Each sheet = One section
- **Sheet name** = Section name (e.g., "Physics", "Chemistry")
- **Columns:**
  - `question` - Question text (English & Telugu separated by `|`)
  - `option_a`, `option_b`, `option_c`, `option_d` - Options (bilingual)
  - `correct_answer` - Correct option letter (A/B/C/D)

**Example:**
```
| question | option_a | option_b | option_c | option_d | correct_answer |
|----------|----------|----------|----------|----------|----------------|
| What is water's chemical formula? | H2O | CO2 | O2 | N2 | A |
```

### Database Schema

**Users Table:**
- `user_id` (VARCHAR(50), Primary Key)
- `dob` (VARCHAR(10)) - Format: YYYY-MM-DD
- `name` (TEXT)
- `is_admin` (BOOLEAN)

**Test Table:**
- `id` (INTEGER, Primary Key)
- `name` (TEXT)
- `description` (TEXT)
- `duration_minutes` (INTEGER)
- `is_active` (BOOLEAN)
- `allowed_user_ids` (TEXT) - JSON array

**Question Table:**
- `id` (INTEGER, Primary Key)
- `section_id` (INTEGER, Foreign Key)
- `question_text` (TEXT)
- `option_a`, `option_b`, `option_c`, `option_d` (TEXT)
- `correct_answer` (VARCHAR(1))

### Security Features

- ✅ **JWT tokens** for authentication (stored in localStorage)
- ✅ **Password hashing** for admin accounts (bcrypt)
- ✅ **Protected routes** - React router guards
- ✅ **API authentication** - All endpoints require valid JWT
- ✅ **CORS enabled** - For cross-origin requests
- ✅ **SQL injection prevention** - SQLAlchemy ORM
- ✅ **File validation** - Secure filename handling

### Performance Optimizations

- ✅ **Production React build** - Minified and optimized
- ✅ **Gzip compression** - Reduced bundle size
- ✅ **Database indexing** - Fast queries on user_id
- ✅ **Connection pooling** - PostgreSQL connection reuse
- ✅ **Lazy loading** - React code splitting
- ✅ **Caching** - Browser caching for static assets

### Known Limitations

- ⚠️ **File storage** - Uploads are temporary (ephemeral storage)
- ⚠️ **Concurrent exams** - One active submission per user
- ⚠️ **Timezone** - All timestamps in UTC
- ⚠️ **Image support** - Questions are text-only (no images)

---

## 🐛 Troubleshooting

### Common Issues

**1. "Unauthorized" error after page reload**
- **Cause:** JWT token expired or invalid
- **Fix:** Re-login to get new token

**2. Excel upload fails with "value too long" error**
- **Cause:** Date format includes timestamp
- **Fix:** Already handled - dates are auto-formatted to YYYY-MM-DD

**3. Questions not displaying**
- **Cause:** Invalid test_id or no questions in database
- **Fix:** Upload questions via admin panel

**4. Timer not working**
- **Cause:** JavaScript disabled or React state issue
- **Fix:** Enable JavaScript, refresh page

**5. Build folder not found in production**
- **Cause:** React build not copied to flask-backend
- **Fix:** Run `npm run build` and copy to flask-backend/build

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 License

This project is private and proprietary.

---

## 👨‍💻 Author

**Gnaneswararao Polaki**
- GitHub: [@GNANESWARARAO-POLAKI](https://github.com/GNANESWARARAO-POLAKI)

---

## 🙏 Acknowledgments

- React Team for excellent documentation
- Flask community for robust framework
- Neon for managed PostgreSQL
- Render for seamless deployment

---

## 📞 Support

For issues or questions, please create an issue in the GitHub repository.

**Happy Coding! 🚀**

