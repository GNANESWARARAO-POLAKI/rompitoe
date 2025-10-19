Render deployment steps:

1. Push your repo to GitHub (already done).
2. Go to https://render.com and sign in.
3. Create a new Web Service -> Connect to GitHub -> Select repository `rompitoe` -> Branch `main`.
4. Set Build Command: `pip install -r requirements.txt` (Render will run this automatically in most cases).
5. Set Start Command: `gunicorn db_app:app --bind 0.0.0.0:$PORT` (or leave empty and Render will detect Procfile).
6. Set Environment Variables in Render dashboard:
   - DATABASE_URL (your Neon/Postgres URL)
   - JWT_SECRET_KEY
7. Deploy and wait. Render will show build logs and the public URL when ready.

Notes:
- If you use Neon, supply the full connection string in DATABASE_URL.
- If you need to run migrations or initialize the DB, use a Pre-Deploy Hook or run a one-off job.
