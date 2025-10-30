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
    question_states = body.get('question_states', {})
    if not answers or not test_id:
        return {'statusCode': 400, 'body': json.dumps({'error': 'answers and test_id are required'})}

    session, engine = get_session()
    try:
        # Verify user
        u = session.execute(text('SELECT id FROM "user" WHERE user_id = :uid'), {'uid': user_id}).fetchone()
        if not u:
            return {'statusCode': 404, 'body': json.dumps({'error': 'User not found'})}
        user_db_id = u[0]

        # Get test details
        test_row = session.execute(text('SELECT title, duration_minutes FROM test WHERE id = :tid'), {'tid': test_id}).fetchone()
        if not test_row:
            return {'statusCode': 404, 'body': json.dumps({'error': 'Test not found'})}
        test_name = test_row[0]
        test_duration = test_row[1]

        # Get all questions for the test with section info
        sec_rows = session.execute(text('SELECT id, name FROM section WHERE test_id = :tid ORDER BY id'), {'tid': test_id}).fetchall()
        section_ids = [r[0] for r in sec_rows]
        sections_dict = {r[0]: r[1] for r in sec_rows}
        
        if not section_ids:
            return {'statusCode': 404, 'body': json.dumps({'error': 'No sections found for this test'})}

        q_rows = session.execute(text('''SELECT id, section_id, question_text, option_a, option_b, option_c, option_d, correct_answer 
                                         FROM question WHERE section_id IN :sids ORDER BY id'''), 
                                 {'sids': tuple(section_ids)}).fetchall()
        total = len(q_rows)
        if total == 0:
            return {'statusCode': 404, 'body': json.dumps({'error': 'No questions found for this test'})}

        score = 0
        question_details = []
        section_stats = {sid: {'total': 0, 'attempted': 0, 'correct': 0, 'incorrect': 0} for sid in section_ids}
        attempted_count = 0
        marked_count = 0

        for idx, q in enumerate(q_rows, 1):
            qid = str(q[0])
            section_id = q[1]
            q_text = q[2]
            opt_a = q[3]
            opt_b = q[4]
            opt_c = q[5]
            opt_d = q[6]
            correct_ans = q[7]
            
            user_answer = answers.get(qid)
            is_attempted = user_answer is not None
            is_correct = user_answer == correct_ans if is_attempted else False
            is_marked = question_states.get(qid, {}).get('marked_for_review', False)
            
            if is_correct:
                score += 1
                
            section_stats[section_id]['total'] += 1
            if is_attempted:
                attempted_count += 1
                section_stats[section_id]['attempted'] += 1
                if is_correct:
                    section_stats[section_id]['correct'] += 1
                else:
                    section_stats[section_id]['incorrect'] += 1
            
            if is_marked:
                marked_count += 1
                
            # Determine status
            if not is_attempted:
                status = 'not-attempted'
            elif is_marked:
                status = 'marked-for-review'
            elif is_correct:
                status = 'correct'
            else:
                status = 'incorrect'
            
            # Get answer text
            answer_map = {'A': opt_a, 'B': opt_b, 'C': opt_c, 'D': opt_d}
            correct_ans_text = answer_map.get(correct_ans, '')
            user_ans_text = answer_map.get(user_answer, '') if user_answer else None
            
            question_details.append({
                'question_number': idx,
                'section_name': sections_dict[section_id],
                'question_text': q_text,
                'options': {'A': opt_a, 'B': opt_b, 'C': opt_c, 'D': opt_d},
                'correct_answer': correct_ans,
                'correct_answer_text': correct_ans_text,
                'your_answer': user_answer,
                'your_answer_text': user_ans_text,
                'is_correct': is_correct,
                'is_attempted': is_attempted,
                'is_marked_for_review': is_marked,
                'status': status
            })

        percentage = round((score / total * 100), 2) if total > 0 else 0
        accuracy = round((score / attempted_count * 100), 2) if attempted_count > 0 else 0
        not_attempted = total - attempted_count
        incorrect_count = attempted_count - score

        # Store submission
        insert = text('INSERT INTO submission (user_id, test_id, answers, score_points, score_total, score_percentage) VALUES (:uid, :tid, :answers, :points, :total, :pct)')
        session.execute(insert, {'uid': user_db_id, 'tid': test_id, 'answers': json.dumps(answers), 'points': score, 'total': total, 'pct': percentage})
        session.commit()
        
        # Get submission_id
        sub_id = session.execute(text('SELECT id FROM submission WHERE user_id = :uid AND test_id = :tid ORDER BY id DESC LIMIT 1'), 
                                 {'uid': user_db_id, 'tid': test_id}).fetchone()[0]

        # Build section analysis
        section_analysis = []
        for sid in section_ids:
            stats = section_stats[sid]
            if stats['total'] > 0:
                sec_percentage = round((stats['correct'] / stats['total'] * 100), 2)
                if sec_percentage >= 80:
                    performance = 'Excellent'
                elif sec_percentage >= 60:
                    performance = 'Good'
                elif sec_percentage >= 40:
                    performance = 'Average'
                else:
                    performance = 'Needs Improvement'
                
                section_analysis.append({
                    'section_name': sections_dict[sid],
                    'total_questions': stats['total'],
                    'attempted': stats['attempted'],
                    'correct': stats['correct'],
                    'incorrect': stats['incorrect'],
                    'score_percentage': sec_percentage,
                    'performance': performance
                })

        # Build overall summary
        pass_status = 'Pass' if percentage >= 35 else 'Fail'
        
        analysis_data = {
            'message': 'Exam submitted successfully',
            'submission_id': sub_id,
            'test_id': test_id,
            'test_name': test_name,
            'test_duration_minutes': test_duration,
            'overall_summary': {
                'score_points': score,
                'score_total': total,
                'score_percentage': percentage,
                'pass_status': pass_status,
                'accuracy': accuracy,
                'total_questions': total,
                'attempted': attempted_count,
                'not_attempted': not_attempted,
                'correct': score,
                'incorrect': incorrect_count,
                'marked_for_review': marked_count
            },
            'section_analysis': section_analysis,
            'question_details': question_details
        }

        return {'statusCode': 200, 'body': json.dumps(analysis_data), 'headers': {'Content-Type': 'application/json'}}
    finally:
        session.close()
