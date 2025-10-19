from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import io
import csv
import json
import pandas as pd
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure app
# Read database URL from environment variable `DATABASE_URL` (required).
# Set DATABASE_URL to your Postgres connection string in production.
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    raise ValueError('DATABASE_URL environment variable is required')
app.config['SQLALCHEMY_DATABASE_URI'] = db_url

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'  # Change this in production
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)  # Shorter expiration for security
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['JWT_IDENTITY_CLAIM'] = 'sub'  # Standard JWT claim for subject
app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'  # Use 'error' as the key for error messages

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload

# Initialize extensions
try:
    db = SQLAlchemy(app)
except Exception:
    # Helpful debug output for failures during engine creation
    print('\nERROR: Failed to initialize SQLAlchemy engine')
    try:
        print('DATABASE_URL =', os.environ.get('DATABASE_URL'))
    except Exception:
        print('Could not read DATABASE_URL from environment')
    import traceback as _tb
    _tb.print_exc()
    raise

jwt = JWTManager(app)

# Define database models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), unique=True, nullable=False)
    # Use Text for password_hash to support long hashed values (scrypt, bcrypt, etc.)
    password_hash = db.Column(db.Text)
    dob = db.Column(db.String(10), nullable=False)
    name = db.Column(db.String(100))
    is_admin = db.Column(db.Boolean, default=False)
    submissions = db.relationship('Submission', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'name': self.name,
            'is_admin': self.is_admin
        }

# New Test model to support multiple tests
class Test(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    duration_minutes = db.Column(db.Integer, default=60)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    sections = db.relationship('Section', backref='test', lazy=True)
    submissions = db.relationship('Submission', backref='test', lazy=True)
    
    def to_dict(self, include_sections=False):
        result = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'duration_minutes': self.duration_minutes,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active
        }
        
        if include_sections:
            result['sections'] = [section.to_dict() for section in self.sections]
            
        return result

class Section(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    test_id = db.Column(db.Integer, db.ForeignKey('test.id'), nullable=False)  # Link to Test
    order = db.Column(db.Integer, default=0)  # Order within the test
    questions = db.relationship('Question', backref='section', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'test_id': self.test_id,
            'order': self.order,
            'questions': [q.to_dict(include_answer=False) for q in self.questions]
        }

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    section_id = db.Column(db.Integer, db.ForeignKey('section.id'), nullable=False)
    section_order = db.Column(db.Integer, default=0)  # Sequential number within section
    question_text = db.Column(db.Text, nullable=False)
    option_a = db.Column(db.Text, nullable=False)
    option_b = db.Column(db.Text, nullable=False)
    option_c = db.Column(db.Text, nullable=False)
    option_d = db.Column(db.Text, nullable=False)
    correct_answer = db.Column(db.String(1), nullable=False)
    
    def to_dict(self, include_answer=True):
        result = {
            'id': self.id,
            'section_id': self.section_id,
            'section_name': self.section.name,
            'question_id': self.section_order,  # Use section_order as question_id
            'question': self.question_text,
            'options': {
                'A': self.option_a,
                'B': self.option_b,
                'C': self.option_c,
                'D': self.option_d
            }
        }
        
        if include_answer:
            result['correct_answer'] = self.correct_answer
            
        return result

class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    test_id = db.Column(db.Integer, db.ForeignKey('test.id'), nullable=False)  # Link to Test
    answers = db.Column(db.Text, nullable=False)  # Stored as JSON
    score_points = db.Column(db.Integer, nullable=False)
    score_total = db.Column(db.Integer, nullable=False)
    score_percentage = db.Column(db.Float, nullable=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user.user_id,
            'test_id': self.test_id,
            'test_name': self.test.name,
            'answers': json.loads(self.answers),
            'score': {
                'points': self.score_points,
                'total': self.score_total,
                'percentage': self.score_percentage
            },
            'submitted_at': self.submitted_at.isoformat()
        }

# Routes
@app.route('/')
def index():
    return jsonify({'message': 'Rompit OE API is running'}), 200

# Test management endpoints
@app.route('/tests', methods=['GET'])
@jwt_required()
def get_tests():
    """Get all tests (admin) or active tests (regular user)"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Admin sees all tests, regular users see only active tests
    if user.is_admin:
        tests = Test.query.all()
    else:
        tests = Test.query.filter_by(is_active=True).all()
    
    tests_data = []
    for test in tests:
        test_data = test.to_dict()
        # Add additional info like number of sections and questions
        test_data['sections_count'] = Section.query.filter_by(test_id=test.id).count()
        test_data['questions_count'] = Question.query.join(Section).filter(Section.test_id == test.id).count()
        tests_data.append(test_data)
    
    return jsonify({
        'tests': tests_data
    }), 200

@app.route('/active-tests', methods=['GET'])
def get_active_tests():
    """Get all active tests for student login (no authentication required)"""
    tests = Test.query.filter_by(is_active=True).all()
    tests_data = []
    
    for test in tests:
        test_data = test.to_dict()
        # Add basic info for display
        test_data['title'] = test.name
        test_data['description'] = test.description
        tests_data.append(test_data)
    
    return jsonify({'tests': tests_data}), 200

@app.route('/tests/<int:test_id>', methods=['GET'])
@jwt_required()
def get_test(test_id):
    """Get a specific test with all its sections and questions"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    test = Test.query.get(test_id)
    
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    # Check if user is allowed to access this test
    if not user.is_admin and not test.is_active:
        return jsonify({'error': 'Test not available'}), 403
    
    return jsonify({
        'test': test.to_dict(include_sections=True)
    }), 200

@app.route('/tests', methods=['POST'])
@jwt_required()
def create_test():
    """Create a new test (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    data = request.json
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Test name is required'}), 400
    
    test = Test(
        name=data.get('name'),
        description=data.get('description', ''),
        duration_minutes=data.get('duration_minutes', 60),
        is_active=data.get('is_active', True)
    )
    
    db.session.add(test)
    db.session.commit()
    
    return jsonify({
        'message': 'Test created successfully',
        'test': test.to_dict()
    }), 201

@app.route('/tests/<int:test_id>', methods=['PUT'])
@jwt_required()
def update_test(test_id):
    """Update a test (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    test = Test.query.get(test_id)
    
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    data = request.json
    
    if data.get('name'):
        test.name = data.get('name')
    
    if 'description' in data:
        test.description = data.get('description')
    
    if 'duration_minutes' in data:
        test.duration_minutes = data.get('duration_minutes')
    
    if 'is_active' in data:
        test.is_active = data.get('is_active')
    
    db.session.commit()
    
    return jsonify({
        'message': 'Test updated successfully',
        'test': test.to_dict()
    }), 200

@app.route('/tests/<int:test_id>', methods=['DELETE'])
@jwt_required()
def delete_test(test_id):
    """Delete a test (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    test = Test.query.get(test_id)
    
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    # Delete associated sections and questions
    for section in test.sections:
        for question in section.questions:
            db.session.delete(question)
        db.session.delete(section)
    
    # Delete test
    db.session.delete(test)
    db.session.commit()
    
    return jsonify({
        'message': 'Test deleted successfully'
    }), 200

@app.route('/upload', methods=['POST'])
@jwt_required()
def upload_files():
    """
    Endpoint to upload user data and exam questions in Excel format
    Requires admin privileges
    """
    # Check if user is admin
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    try:
        # Check if test_id is provided
        test_id = request.form.get('test_id')
        if not test_id:
            return jsonify({'error': 'Test ID is required'}), 400
        
        # Check if test exists
        test = Test.query.get(test_id)
        if not test:
            return jsonify({'error': 'Test not found'}), 404
        
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
        
        # Process user file
        users_df = pd.read_excel(user_path)
        users_count = 0
        
        for _, row in users_df.iterrows():
            user_id = str(row.get('user_id'))
            dob = str(row.get('dob'))
            name = row.get('name', '')
            
            # Check if user already exists
            existing_user = User.query.filter_by(user_id=user_id).first()
            if existing_user:
                existing_user.dob = dob
                existing_user.name = name
            else:
                new_user = User(user_id=user_id, dob=dob, name=name)
                db.session.add(new_user)
                users_count += 1
        
        # Process exam file
        exam_df = pd.read_excel(exam_path, sheet_name=None)  # Get all sheets
        
        # Delete all existing questions and sections for this test
        for section in test.sections:
            for question in section.questions:
                db.session.delete(question)
            db.session.delete(section)
        
        questions_count = 0
        section_order = 0
        
        for sheet_name, sheet_df in exam_df.items():
            # Create section
            section_order += 1
            section = Section(
                name=sheet_name,
                test_id=test.id,
                order=section_order
            )
            db.session.add(section)
            db.session.flush()  # To get the section ID
            
            # Add questions from this sheet
            for idx, row in sheet_df.iterrows():
                # Set section_order to be 1-based index within section
                question = Question(
                    section_id=section.id,
                    section_order=idx + 1,  # Make it 1-based
                    question_text=row.get('question', ''),
                    option_a=row.get('option_a', ''),
                    option_b=row.get('option_b', ''),
                    option_c=row.get('option_c', ''),
                    option_d=row.get('option_d', ''),
                    correct_answer=row.get('correct_answer', '')
                )
                db.session.add(question)
                questions_count += 1
        
        # Commit all changes
        db.session.commit()
        
        return jsonify({
            'message': 'Files uploaded and processed successfully',
            'users_count': users_count,
            'questions_count': questions_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up temporary files
        if 'user_path' in locals() and os.path.exists(user_path):
            os.remove(user_path)
        if 'exam_path' in locals() and os.path.exists(exam_path):
            os.remove(exam_path)

@app.route('/register-admin', methods=['POST'])
def register_admin():
    """Create an admin user"""
    data = request.json
    
    if not data or 'user_id' not in data or 'password' not in data or 'dob' not in data:
        return jsonify({'error': 'user_id, password, and dob are required'}), 400
    
    # Check if admin exists
    existing_admin = User.query.filter_by(is_admin=True).first()
    if existing_admin:
        return jsonify({'error': 'Admin user already exists'}), 400
    
    # Create admin user
    admin = User(
        user_id=data['user_id'],
        dob=data['dob'],
        name=data.get('name', 'Admin'),
        is_admin=True
    )
    admin.set_password(data['password'])
    
    db.session.add(admin)
    db.session.commit()
    
    return jsonify({'message': 'Admin user created successfully'}), 201

@app.route('/login', methods=['POST'])
def login():
    """Validate user login with user_id and dob or password for admin"""
    data = request.json
    
    if not data or 'user_id' not in data:
        return jsonify({'error': 'user_id is required'}), 400
    
    user_id = str(data['user_id'])
    
    # Find user
    user = User.query.filter_by(user_id=user_id).first()
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Admin login with password
    if user.is_admin:
        if 'password' not in data:
            return jsonify({'error': 'Password required for admin login'}), 400
        
        if not user.check_password(data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
    
    # Regular user login with DOB
    else:
        if 'dob' not in data:
            return jsonify({'error': 'Date of birth required'}), 400
        
        if user.dob != data['dob']:
            return jsonify({'error': 'Invalid credentials'}), 401
    
    # Create JWT token
    access_token = create_access_token(identity=user.user_id)
    
    return jsonify({
        'message': 'Login successful',
        'token': access_token,
        'user': user.to_dict()
    }), 200

@app.route('/admin-login', methods=['POST'])
def admin_login():
    """Special admin login endpoint"""
    data = request.json
    
    if not data or 'password' not in data:
        return jsonify({'error': 'Password is required'}), 400
    
    # Check for default admin password (for backward compatibility)
    if data['password'] == 'admin123':
        # Find or create default admin
        admin = User.query.filter_by(is_admin=True).first()
        if not admin:
            admin = User(
                user_id='admin',
                dob='1990-01-01',
                name='Admin User',
                is_admin=True
            )
            admin.set_password('admin123')
            db.session.add(admin)
            db.session.commit()
        
        # Create JWT token
        access_token = create_access_token(identity=admin.user_id)
        
        return jsonify({
            'message': 'Admin login successful',
            'token': access_token,
            'user': {
                'user_id': admin.user_id,
                'is_admin': True,
                'name': admin.name
            }
        }), 200
    
    return jsonify({'error': 'Invalid admin password'}), 401

@app.route('/questions', methods=['GET'])
@jwt_required()
def get_questions():
    """Return questions for a specific test"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get test_id from query parameters
    test_id = request.args.get('test_id')
    if not test_id:
        return jsonify({'error': 'Test ID is required'}), 400
    
    # Check if test exists and user has access
    test = Test.query.get(test_id)
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    if not user.is_admin and not test.is_active:
        return jsonify({'error': 'Test not available'}), 403
    
    # Get sections for this test ordered by order
    sections = Section.query.filter_by(test_id=test.id).order_by(Section.order).all()
    
    if not sections:
        return jsonify({'error': 'No questions available for this test'}), 404
    
    result = []
    for section in sections:
        # Query questions for this section ordered by section_order
        questions = Question.query.filter_by(section_id=section.id).order_by(Question.section_order).all()
        result.append({
            'id': section.id,
            'name': section.name,
            'questions': [q.to_dict(include_answer=False) for q in questions]
        })
    
    return jsonify({
        'test': test.to_dict(),
        'sections': result
    }), 200

@app.route('/submit', methods=['POST'])
@jwt_required()
def submit_exam():
    """Submit user answers for a specific test"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.json
    
    if not data or 'answers' not in data or 'test_id' not in data:
        return jsonify({'error': 'answers and test_id are required'}), 400
    
    test_id = data['test_id']
    test = Test.query.get(test_id)
    
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    answers = data['answers']
    
    # Get all questions for this test
    test_sections = Section.query.filter_by(test_id=test_id).all()
    section_ids = [section.id for section in test_sections]
    
    # Calculate score
    questions = Question.query.filter(Question.section_id.in_(section_ids)).all()
    score = 0
    total = len(questions)
    
    if total == 0:
        return jsonify({'error': 'No questions found for this test'}), 404
    for question in questions:
        question_id = str(question.id)
        if question_id in answers and answers[question_id] == question.correct_answer:
            score += 1
    
    percentage = round((score / total * 100), 2) if total > 0 else 0
    
    # Store submission
    submission = Submission(
        user_id=user.id,
        test_id=test_id,
        answers=json.dumps(answers),
        score_points=score,
        score_total=total,
        score_percentage=percentage
    )
    
    db.session.add(submission)
    db.session.commit()
    
    return jsonify({
        'message': 'Exam submitted successfully',
        'submission_id': submission.id,
        'test_id': test_id,
        'test_name': test.name,
        'score': {
            'points': score,
            'total': total,
            'percentage': percentage
        }
    }), 200

@app.route('/scores', methods=['GET'])
@jwt_required()
def get_scores():
    """Get submission scores (admin only), optionally filtered by test_id"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    # Optional test_id filter
    test_id = request.args.get('test_id')
    
    if test_id:
        submissions = Submission.query.filter_by(test_id=test_id).all()
    else:
        submissions = Submission.query.all()
    
    return jsonify({
        'submissions': [sub.to_dict() for sub in submissions]
    }), 200

@app.route('/download-scores', methods=['GET'])
@jwt_required()
def download_scores():
    """Download all scores as a CSV file (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    try:
        submissions = Submission.query.all()
        
        if not submissions:
            return jsonify({'error': 'No submissions available'}), 404
        
        # Create CSV data
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['ID', 'User ID', 'Score', 'Total', 'Percentage', 'Submitted At'])
        
        # Write data rows
        for submission in submissions:
            writer.writerow([
                submission.id,
                submission.user.user_id,
                submission.score_points,
                submission.score_total,
                submission.score_percentage,
                submission.submitted_at
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
            download_name='exam_scores.csv'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Check and update database schema if needed
def check_database_schema():
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    
    # Check if the question table exists
    if 'question' in inspector.get_table_names():
        # Check if section_order column exists in the question table
        columns = [column['name'] for column in inspector.get_columns('question')]
        if 'section_order' not in columns:
            print("Adding missing section_order column to question table...")
            with db.engine.connect() as connection:
                connection.execute(db.text("ALTER TABLE question ADD COLUMN section_order INTEGER DEFAULT 0"))
                connection.commit()
                print("Column added successfully!")
    
    # Check if the section table exists
    if 'section' in inspector.get_table_names():
        # Check if test_id column exists in the section table
        columns = [column['name'] for column in inspector.get_columns('section')]
        if 'test_id' not in columns:
            print("Adding missing test_id column to section table...")
            with db.engine.connect() as connection:
                # Add a default test record if it doesn't exist
                test_exists = connection.execute(db.text("SELECT COUNT(*) FROM test")).scalar()
                if test_exists == 0:
                    print("Creating default test...")
                    # Use named parameters compatible with SQLAlchemy / psycopg2
                    connection.execute(
                        db.text(
                            "INSERT INTO test (name, description, duration_minutes, is_active) VALUES (:name, :description, :duration_minutes, :is_active)"
                        ),
                        {
                            'name': "Default Test",
                            'description': "Default test created during migration",
                            'duration_minutes': 180,
                            'is_active': 1
                        }
                    )
                    connection.commit()
                
                # Get the ID of the first test (which should be the default one we just created)
                default_test_id = connection.execute(db.text("SELECT id FROM test LIMIT 1")).scalar()
                
                # Add the test_id column with the default test ID
                connection.execute(db.text(f"ALTER TABLE section ADD COLUMN test_id INTEGER DEFAULT {default_test_id} REFERENCES test(id)"))
                connection.commit()
                print("Column added successfully!")

# Initialize database and create test data
def initialize_database():
    # Create all tables if they don't exist
    db.create_all()
    
    # Check and update schema if needed
    check_database_schema()
    
    # Add default admin if none exists
    admin = User.query.filter_by(is_admin=True).first()
    if not admin:
        admin = User(
            user_id='admin',
            dob='1990-01-01',
            name='Admin User',
            is_admin=True
        )
        admin.set_password('admin123')
        db.session.add(admin)
    
    # Add test user if none exists
    test_user = User.query.filter_by(user_id='test123').first()
    if not test_user:
        test_user = User(
            user_id='test123',
            dob='2000-01-01',
            name='Test User',
            is_admin=False
        )
        db.session.add(test_user)
    
    # Add default test if none exists
    default_test = Test.query.first()
    if not default_test:
        default_test = Test(
            name='Default Test',
            description='Default test for all sections and questions',
            duration_minutes=180,
            is_active=True
        )
        db.session.add(default_test)
        db.session.commit()
    
    # Add test sections and questions if none exist
    if Section.query.count() == 0:
        # Physics section
        physics = Section(
            name='Physics',
            test_id=default_test.id,
            order=1
        )
        db.session.add(physics)
        db.session.flush()
        
        db.session.add(Question(
            section_id=physics.id,
            section_order=1,
            question_text="What is Newton's first law?",
            option_a="Law of inertia",
            option_b="Law of acceleration",
            option_c="Law of action and reaction",
            option_d="Law of gravitation",
            correct_answer="A"
        ))
        
        db.session.add(Question(
            section_id=physics.id,
            section_order=2,
            question_text="What is the unit of force?",
            option_a="Joule",
            option_b="Newton",
            option_c="Watt",
            option_d="Pascal",
            correct_answer="B"
        ))
        
        # Chemistry section
        chemistry = Section(
            name='Chemistry',
            test_id=default_test.id,
            order=2
        )
        db.session.add(chemistry)
        db.session.flush()
        
        db.session.add(Question(
            section_id=chemistry.id,
            section_order=1,
            question_text="What is the atomic number of Oxygen?",
            option_a="6",
            option_b="7",
            option_c="8",
            option_d="9",
            correct_answer="C"
        ))
        
        # Mathematics section
        math = Section(
            name='Mathematics',
            test_id=default_test.id,
            order=3
        )
        db.session.add(math)
        db.session.flush()
        
        db.session.add(Question(
            section_id=math.id,
            section_order=1,
            question_text="What is the derivative of x² with respect to x?",
            option_a="x",
            option_b="2x",
            option_c="x²",
            option_d="2x²",
            correct_answer="B"
        ))
    
    db.session.commit()

if __name__ == '__main__':
    with app.app_context():
        initialize_database()
    app.run(debug=True, host='0.0.0.0', port=5000)