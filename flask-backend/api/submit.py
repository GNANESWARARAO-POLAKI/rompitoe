import json
import os
import jwt
from sqlalchemy import text
from ._db import get_session

JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'dev-secret')
JWT_ALGO = 'HS256'

def handler(req):
    auth = req.get('headers', {}).get('authorization') or req.get('headers', {}).get('Authorization')
    if not auth or not auth.lower().startswith('bearer '):
        return {'statusCode': 401, 'body': json.dumps({'error': 'Authorization required'})}
    token = auth.split(None, 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get('sub')
    except Exception:
        return {'statusCode': 401, 'body': json.dumps({'error': 'Invalid token'})}

    try:
        body = json.loads(req.get('body') or '{}')
    except Exception:
        body = {}

    answers = body.get('answers')
    test_id = body.get('test_id')
    if not answers or not test_id:
        return {'statusCode': 400, 'body': json.dumps({'error': 'answers and test_id are required'})}

    session, engine = get_session()
    try:
        # Verify user
        u = session.execute(text('SELECT id FROM "user" WHERE user_id = :uid'), {'uid': user_id}).fetchone()
        if not u:
            return {'statusCode': 404, 'body': json.dumps({'error': 'User not found'})}
        user_db_id = u[0]

        # Get all questions for the test
        sec_rows = session.execute(text('SELECT id FROM section WHERE test_id = :tid'), {'tid': test_id}).fetchall()
        section_ids = [r[0] for r in sec_rows]
        if not section_ids:
            return {'statusCode': 404, 'body': json.dumps({'error': 'No sections found for this test'})}

        q_rows = session.execute(text('SELECT id, correct_answer FROM question WHERE section_id IN :sids'), {'sids': tuple(section_ids)}).fetchall()
        total = len(q_rows)
        if total == 0:
            return {'statusCode': 404, 'body': json.dumps({'error': 'No questions found for this test'})}

        score = 0
        for q in q_rows:
            qid = str(q[0])
            if qid in answers and answers[qid] == q[1]:
                score += 1

        percentage = round((score / total * 100), 2) if total > 0 else 0

        # Store submission
        insert = text('INSERT INTO submission (user_id, test_id, answers, score_points, score_total, score_percentage) VALUES (:uid, :tid, :answers, :points, :total, :pct)')
        session.execute(insert, {'uid': user_db_id, 'tid': test_id, 'answers': json.dumps(answers), 'points': score, 'total': total, 'pct': percentage})
        session.commit()

        return {'statusCode': 200, 'body': json.dumps({'message': 'Exam submitted successfully', 'score': {'points': score, 'total': total, 'percentage': percentage}}), 'headers': {'Content-Type': 'application/json'}}
    finally:
        session.close()
