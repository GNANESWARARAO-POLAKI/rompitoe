from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import io
import csv
from werkzeug.utils import secure_filename
import json
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# In-memory storage for demo purposes
# In production, use a real database
users_db = []
questions_db = []
submissions_db = []

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

@app.route('/')
def index():
    return jsonify({'message': 'Rompit OE API is running'}), 200

@app.route('/upload', methods=['POST'])
def upload_files():
    """
    Endpoint to upload user data and exam questions in Excel format
    """
    try:
        if 'user_file' not in request.files or 'exam_file' not in request.files:
            return jsonify({'error': 'Both user_file and exam_file are required'}), 400
        
        # Process user file
        user_file = request.files['user_file']
        if user_file.filename == '':
            return jsonify({'error': 'No user file selected'}), 400
        
        # Process exam file
        exam_file = request.files['exam_file']
        if exam_file.filename == '':
            return jsonify({'error': 'No exam file selected'}), 400
        
        # Save files temporarily
        user_filename = secure_filename(user_file.filename)
        exam_filename = secure_filename(exam_file.filename)
        
        user_path = os.path.join(app.config['UPLOAD_FOLDER'], user_filename)
        exam_path = os.path.join(app.config['UPLOAD_FOLDER'], exam_filename)
        
        user_file.save(user_path)
        exam_file.save(exam_path)
        
        # In a real app, process Excel files here
        # For demo, simulate success with pre-defined data
        global users_db, questions_db
        
        # Add test users
        users_db = [
            {'user_id': 'test123', 'dob': '2000-01-01', 'name': 'Test User'},
            {'user_id': 'admin', 'dob': '1990-01-01', 'name': 'Admin User'},
            {'user_id': 'student001', 'dob': '2001-05-15', 'name': 'John Doe'},
            {'user_id': 'student002', 'dob': '2002-07-22', 'name': 'Jane Smith'},
            {'user_id': 'student003', 'dob': '2000-12-31', 'name': 'Bob Johnson'}
        ]
        
        # Add test questions
        questions_db = [
            {
                'id': 1,
                'section_id': 1,
                'section_name': 'Physics',
                'question_id': 1,
                'question': 'What is Newton\'s first law?',
                'options': {
                    'A': 'Law of inertia',
                    'B': 'Law of acceleration',
                    'C': 'Law of action and reaction',
                    'D': 'Law of gravitation'
                },
                'correct_answer': 'A'
            },
            {
                'id': 2,
                'section_id': 1,
                'section_name': 'Physics',
                'question_id': 2,
                'question': 'What is the unit of force?',
                'options': {
                    'A': 'Joule',
                    'B': 'Newton',
                    'C': 'Watt',
                    'D': 'Pascal'
                },
                'correct_answer': 'B'
            },
            {
                'id': 3,
                'section_id': 2,
                'section_name': 'Chemistry',
                'question_id': 1,
                'question': 'What is the atomic number of Oxygen?',
                'options': {
                    'A': '6',
                    'B': '7',
                    'C': '8',
                    'D': '9'
                },
                'correct_answer': 'C'
            },
            {
                'id': 4,
                'section_id': 3,
                'section_name': 'Mathematics',
                'question_id': 1,
                'question': 'What is the derivative of x² with respect to x?',
                'options': {
                    'A': 'x',
                    'B': '2x',
                    'C': 'x²',
                    'D': '2x²'
                },
                'correct_answer': 'B'
            }
        ]
        
        return jsonify({
            'message': 'Files uploaded and processed successfully',
            'users_count': len(users_db),
            'questions_count': len(questions_db)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up temporary files
        if 'user_path' in locals() and os.path.exists(user_path):
            os.remove(user_path)
        if 'exam_path' in locals() and os.path.exists(exam_path):
            os.remove(exam_path)

@app.route('/login', methods=['POST'])
def login():
    """Validate user login with user_id and dob"""
    data = request.json
    
    if not data or 'user_id' not in data or 'dob' not in data:
        return jsonify({'error': 'user_id and dob are required'}), 400
    
    user_id = str(data['user_id'])
    dob = str(data['dob'])
    
    # Search for user in our in-memory database
    for user in users_db:
        if user['user_id'] == user_id and user['dob'] == dob:
            # In a real app, you'd create a token here
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'user_id': user['user_id'],
                    'name': user.get('name', '')
                }
            }), 200
    
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/questions', methods=['GET'])
def get_questions():
    """Return all questions grouped by sections"""
    if not questions_db:
        return jsonify({'error': 'No questions available'}), 404
    
    # Group questions by sections
    sections = {}
    for question in questions_db:
        section_id = question['section_id']
        
        # Remove correct answer before sending to client
        client_question = question.copy()
        del client_question['correct_answer']
        
        if section_id not in sections:
            sections[section_id] = {
                'id': section_id,
                'name': question['section_name'],
                'questions': []
            }
        
        sections[section_id]['questions'].append(client_question)
    
    return jsonify({
        'sections': list(sections.values())
    }), 200

@app.route('/submit', methods=['POST'])
def submit_exam():
    """Submit user answers"""
    data = request.json
    
    if not data or 'user_id' not in data or 'answers' not in data:
        return jsonify({'error': 'user_id and answers are required'}), 400
    
    user_id = data['user_id']
    answers = data['answers']
    
    # In a real app, validate user_id and calculate score
    score = calculate_score(answers)
    
    # Store submission
    submission = {
        'id': len(submissions_db) + 1,
        'user_id': user_id,
        'answers': answers,
        'score': score,
        'submitted_at': datetime.now().isoformat()
    }
    
    submissions_db.append(submission)
    
    return jsonify({
        'message': 'Exam submitted successfully',
        'submission_id': submission['id'],
        'score': score
    }), 200

def calculate_score(answers):
    """Calculate exam score based on correct answers"""
    score = 0
    total = len(questions_db)
    
    for question in questions_db:
        question_id = question['id']
        if str(question_id) in answers and answers[str(question_id)] == question['correct_answer']:
            score += 1
    
    return {
        'points': score,
        'total': total,
        'percentage': round((score / total * 100), 2) if total > 0 else 0
    }

@app.route('/scores', methods=['GET'])
def get_scores():
    """Get all submission scores"""
    return jsonify({
        'submissions': submissions_db
    }), 200

@app.route('/download-scores', methods=['GET'])
def download_scores():
    """Download all scores as a CSV file"""
    try:
        if not submissions_db:
            return jsonify({'error': 'No submissions available'}), 404
        
        # Create CSV data
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['ID', 'User ID', 'Score', 'Total', 'Percentage', 'Submitted At'])
        
        # Write data rows
        for submission in submissions_db:
            writer.writerow([
                submission['id'],
                submission['user_id'],
                submission['score']['points'],
                submission['score']['total'],
                submission['score']['percentage'],
                submission['submitted_at']
            ])
        
        # Create response
        output.seek(0)
        mem = io.BytesIO()
        mem.write(output.getvalue().encode('utf-8'))
        mem.seek(0)
        
        return send_file(
            mem,
            mimetype='text/csv',
            as_attachment=True,
            download_name='exam_scores.csv',
            etag=False,
            cache_timeout=0
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Add some test data for development
    if not users_db:
        users_db = [
            {'user_id': 'test123', 'dob': '2000-01-01', 'name': 'Test User'},
            {'user_id': 'admin', 'dob': '1990-01-01', 'name': 'Admin User'}
        ]
    
    # Add some test questions if none exist
    if not questions_db:
        questions_db = [
            {
                'id': 1,
                'section_id': 1,
                'section_name': 'Physics',
                'question_id': 1,
                'question': 'What is Newton\'s first law?',
                'options': {
                    'A': 'Law of inertia',
                    'B': 'Law of acceleration',
                    'C': 'Law of action and reaction',
                    'D': 'Law of gravitation'
                },
                'correct_answer': 'A'
            },
            {
                'id': 2,
                'section_id': 1,
                'section_name': 'Physics',
                'question_id': 2,
                'question': 'What is the unit of force?',
                'options': {
                    'A': 'Joule',
                    'B': 'Newton',
                    'C': 'Watt',
                    'D': 'Pascal'
                },
                'correct_answer': 'B'
            },
            {
                'id': 3,
                'section_id': 2,
                'section_name': 'Chemistry',
                'question_id': 1,
                'question': 'What is the atomic number of Oxygen?',
                'options': {
                    'A': '6',
                    'B': '7',
                    'C': '8',
                    'D': '9'
                },
                'correct_answer': 'C'
            }
        ]
    
    # Add some test submissions if none exist
    if not submissions_db:
        submissions_db = [
            {
                'id': 1,
                'user_id': 'test123',
                'answers': {'1': 'A', '2': 'B', '3': 'C'},
                'score': {
                    'points': 3,
                    'total': 3,
                    'percentage': 100.0
                },
                'submitted_at': '2025-09-20T10:30:00'
            },
            {
                'id': 2,
                'user_id': 'student001',
                'answers': {'1': 'A', '2': 'C', '3': 'B'},
                'score': {
                    'points': 1,
                    'total': 3,
                    'percentage': 33.33
                },
                'submitted_at': '2025-09-21T14:15:00'
            }
        ]
    
    app.run(debug=True, host='0.0.0.0', port=5000)