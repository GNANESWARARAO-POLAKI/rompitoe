import json
import os
import jwt
from sqlalchemy import text
from ._db import get_session

JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'dev-secret')
JWT_ALGO = 'HS256'

def handler(req):
    # Authenticate
    auth = req.get('headers', {}).get('authorization') or req.get('headers', {}).get('Authorization')
    if not auth or not auth.lower().startswith('bearer '):
        return {'statusCode': 401, 'body': json.dumps({'error': 'Authorization required'})}
    token = auth.split(None, 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get('sub')
    except Exception:
        return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid token'})}

    # Get test_id from query
    qs = req.get('query', {})
    test_id = qs.get('test_id') or qs.get('testId')
    if not test_id:
        return {'statusCode': 400, 'body': json.dumps({'error': 'test_id is required'})}

    session, engine = get_session()
    try:
        # Verify user exists
        u = session.execute(text('SELECT id FROM "user" WHERE user_id = :uid'), {'uid': user_id}).fetchone()
        if not u:
            return {'statusCode': 404, 'body': json.dumps({'error': 'User not found'})}

        # Verify test exists
        t = session.execute(text('SELECT id, name, description, duration_minutes, is_active FROM test WHERE id = :tid'), {'tid': test_id}).fetchone()
        if not t:
            return {'statusCode': 404, 'body': json.dumps({'error': 'Test not found'})}

        # Get sections
        sections = []
        sec_rows = session.execute(text('SELECT id, name FROM section WHERE test_id = :tid ORDER BY "order"'), {'tid': test_id}).fetchall()
        for sec in sec_rows:
            q_rows = session.execute(text('SELECT id, question_text, option_a, option_b, option_c, option_d FROM question WHERE section_id = :sid ORDER BY section_order'), {'sid': sec[0]}).fetchall()
            questions = []
            for q in q_rows:
                questions.append({'id': q[0], 'question': q[1], 'options': {'A': q[2], 'B': q[3], 'C': q[4], 'D': q[5]}})
            sections.append({'id': sec[0], 'name': sec[1], 'questions': questions})

        return {'statusCode': 200, 'body': json.dumps({'test': {'id': t[0], 'name': t[1], 'duration_minutes': t[3]}, 'sections': sections}), 'headers': {'Content-Type': 'application/json'}}
    finally:
        session.close()
