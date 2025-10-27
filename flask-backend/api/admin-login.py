import json
import os
import time
import jwt
from sqlalchemy import text
from ._db import get_session

# Secret for signing tokens (set in Vercel env: JWT_SECRET_KEY)
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'dev-secret')
JWT_ALGO = 'HS256'

def handler(req):
    # Vercel serverless handler expects a dict-like request
    try:
        body = json.loads(req.get('body') or '{}')
    except Exception:
        body = {}

    password = body.get('password')
    if not password:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Password is required'})
        }

    session, engine = get_session()
    try:
        if password == 'admin123':
            # Check for existing admin
            q = text("SELECT id, user_id, name FROM \"user\" WHERE is_admin = 1 LIMIT 1")
            res = session.execute(q).fetchone()
            if res is None:
                # create admin user
                insert = text("INSERT INTO \"user\" (user_id, dob, name, is_admin, password_hash) VALUES (:uid, :dob, :name, 1, :ph)")
                session.execute(insert, { 'uid': 'admin', 'dob': '1990-01-01', 'name': 'Admin User', 'ph': 'admin123' })
                session.commit()
                user_id = 'admin'
                name = 'Admin User'
            else:
                user_id = res[1]
                name = res[2]

            payload = {
                'sub': user_id,
                'is_admin': True,
                'iat': int(time.time()),
                'exp': int(time.time()) + 3600
            }
            token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
            return {
                'statusCode': 200,
                'body': json.dumps({'message': 'Admin login successful', 'token': token, 'user': {'user_id': user_id, 'is_admin': True, 'name': name}}),
                'headers': { 'Content-Type': 'application/json' }
            }

        return {
            'statusCode': 401,
            'body': json.dumps({'error': 'Invalid admin password'})
        }
    finally:
        session.close()
