import json
import os
import time
import jwt
from sqlalchemy import text
from ._db import get_session

JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'dev-secret')
JWT_ALGO = 'HS256'

def handler(req):
    try:
        body = json.loads(req.get('body') or '{}')
    except Exception:
        body = {}

    user_id = body.get('user_id')
    dob = body.get('dob')
    if not user_id or not dob:
        return {'statusCode': 400, 'body': json.dumps({'error': 'user_id and dob are required'})}

    session, engine = get_session()
    try:
        q = text("SELECT user_id, name, dob FROM \"user\" WHERE user_id = :uid LIMIT 1")
        res = session.execute(q, {'uid': user_id}).fetchone()
        if not res:
            return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid credentials'})}

        if str(res[2]) != str(dob):
            return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid credentials'})}

        payload = {'sub': user_id, 'iat': int(time.time()), 'exp': int(time.time()) + 3600}
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)
        return {'statusCode': 200, 'body': json.dumps({'message': 'Login successful', 'token': token, 'user': {'user_id': user_id, 'name': res[1]}}), 'headers': {'Content-Type': 'application/json'}}
    finally:
        session.close()
