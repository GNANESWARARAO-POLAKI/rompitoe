from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import os
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
    
    try:
        # Process user data
        process_user_data(user_path)
        
        # Process exam data
        process_exam_data(exam_path)
        
        return jsonify({
            'message': 'Files uploaded and processed successfully',
            'users_count': len(users_db),
            'questions_count': len(questions_db)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up temporary files
        if os.path.exists(user_path):
            os.remove(user_path)
        if os.path.exists(exam_path):
            os.remove(exam_path)

def process_user_data(file_path):
    """Process user data from Excel file"""
    global users_db
    
    df = pd.read_excel(file_path)
    required_columns = ['user_id', 'dob']
    
    if not all(col in df.columns for col in required_columns):
        raise ValueError("User Excel file must contain 'user_id' and 'dob' columns")
    
    users_db = []
    for _, row in df.iterrows():
        # Convert date to string format if it's a datetime object
        dob = row['dob']
        if isinstance(dob, datetime):
            dob = dob.strftime('%Y-%m-%d')
            
        users_db.append({
            'user_id': str(row['user_id']),
            'dob': str(dob),
            'name': str(row.get('name', '')) if 'name' in row else ''
        })

def process_exam_data(file_path):
    """Process exam data from Excel file with multiple sections"""
    global questions_db
    
    # Get all sheet names from the Excel file
    excel_file = pd.ExcelFile(file_path)
    sheet_names = excel_file.sheet_names
    
    questions_db = []
    section_id = 1
    
    for sheet_name in sheet_names:
        df = pd.read_excel(file_path, sheet_name=sheet_name)
        
        required_columns = ['question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']
        if not all(col in df.columns for col in required_columns):
            raise ValueError(f"Sheet {sheet_name} must contain all required columns: {required_columns}")
        
        for question_id, row in enumerate(df.iterrows(), 1):
            _, data = row
            questions_db.append({
                'id': len(questions_db) + 1,
                'section_id': section_id,
                'section_name': sheet_name,
                'question_id': question_id,
                'question': data['question'],
                'options': {
                    'A': data['option_a'],
                    'B': data['option_b'],
                    'C': data['option_c'],
                    'D': data['option_d']
                },
                'correct_answer': data['correct_answer']
            })
        
        section_id += 1

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
    
    app.run(debug=True, host='0.0.0.0', port=5000)