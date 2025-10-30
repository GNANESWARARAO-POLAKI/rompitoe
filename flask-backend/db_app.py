from flask import Flask, request, jsonify, send_file, send_from_directory
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
# Always use Neon PostgreSQL database (no SQLite fallback)
db_url = os.environ.get('DATABASE_URL')
if not db_url:
    # Hardcoded Neon database URL if environment variable not set
    db_url = 'postgresql://neondb_owner:npg_ETjaJbR48Ovl@ep-tiny-smoke-a4uifbri-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'

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
    allowed_user_ids = db.Column(db.Text)  # JSON string of allowed user IDs
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
@jwt_required()
def get_active_tests():
    """Get active tests that the current user is enrolled in"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get all active tests
    tests = Test.query.filter_by(is_active=True).all()
    tests_data = []
    
    for test in tests:
        # Check if user is enrolled in this test
        allowed_users = []
        if test.allowed_user_ids:
            try:
                allowed_users = json.loads(test.allowed_user_ids)
            except:
                allowed_users = []
        
        # Include test if:
        # 1. User is admin (can see all tests), OR
        # 2. No enrollment restriction (allowed_user_ids is empty/null), OR
        # 3. User is in the allowed list
        if user.is_admin or not allowed_users or user.user_id in allowed_users:
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
    
    if 'allowed_user_ids' in data:
        # Update enrollment list
        allowed_users = data.get('allowed_user_ids')
        if isinstance(allowed_users, list):
            test.allowed_user_ids = json.dumps(allowed_users)
        else:
            test.allowed_user_ids = allowed_users
    
    db.session.commit()
    
    return jsonify({
        'message': 'Test updated successfully',
        'test': test.to_dict()
    }), 200

@app.route('/tests/<int:test_id>/enrollments', methods=['GET'])
@jwt_required()
def get_test_enrollments(test_id):
    """Get enrolled users for a test (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    test = Test.query.get(test_id)
    
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    allowed_users = []
    if test.allowed_user_ids:
        try:
            allowed_users = json.loads(test.allowed_user_ids)
        except:
            allowed_users = []
    
    return jsonify({
        'test_id': test_id,
        'test_name': test.name,
        'enrolled_users': allowed_users,
        'enrollment_count': len(allowed_users)
    }), 200

@app.route('/tests/<int:test_id>/enrollments', methods=['POST'])
@jwt_required()
def enroll_users_in_test(test_id):
    """Enroll users in a test (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    test = Test.query.get(test_id)
    
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    data = request.json
    user_ids = data.get('user_ids', [])
    
    if not isinstance(user_ids, list):
        return jsonify({'error': 'user_ids must be an array'}), 400
    
    # Get current enrollments
    allowed_users = []
    if test.allowed_user_ids:
        try:
            allowed_users = json.loads(test.allowed_user_ids)
        except:
            allowed_users = []
    
    # Add new users (avoid duplicates)
    for user_id in user_ids:
        if user_id not in allowed_users:
            allowed_users.append(user_id)
    
    # Save updated list
    test.allowed_user_ids = json.dumps(allowed_users)
    db.session.commit()
    
    return jsonify({
        'message': f'Successfully enrolled {len(user_ids)} user(s)',
        'enrolled_users': allowed_users,
        'enrollment_count': len(allowed_users)
    }), 200

@app.route('/tests/<int:test_id>/enrollments', methods=['DELETE'])
@jwt_required()
def unenroll_users_from_test(test_id):
    """Remove users from a test (admin only)"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    test = Test.query.get(test_id)
    
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    data = request.json
    user_ids = data.get('user_ids', [])
    
    if not isinstance(user_ids, list):
        return jsonify({'error': 'user_ids must be an array'}), 400
    
    # Get current enrollments
    allowed_users = []
    if test.allowed_user_ids:
        try:
            allowed_users = json.loads(test.allowed_user_ids)
        except:
            allowed_users = []
    
    # Remove specified users
    for user_id in user_ids:
        if user_id in allowed_users:
            allowed_users.remove(user_id)
    
    # Save updated list
    test.allowed_user_ids = json.dumps(allowed_users)
    db.session.commit()
    
    return jsonify({
        'message': f'Successfully removed {len(user_ids)} user(s)',
        'enrolled_users': allowed_users,
        'enrollment_count': len(allowed_users)
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
        allowed_user_ids = []
        
        for _, row in users_df.iterrows():
            user_id = str(row.get('user_id'))
            dob = str(row.get('dob'))
            name = row.get('name', '')
            
            # Add to allowed users list for this test
            allowed_user_ids.append(user_id)
            
            # Check if user already exists
            existing_user = User.query.filter_by(user_id=user_id).first()
            if existing_user:
                existing_user.dob = dob
                existing_user.name = name
            else:
                new_user = User(user_id=user_id, dob=dob, name=name)
                db.session.add(new_user)
                users_count += 1
        
        # Store allowed user IDs for this test
        test.allowed_user_ids = json.dumps(allowed_user_ids)
        
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
    
    # Check if user is enrolled in this test
    if not user.is_admin:
        allowed_users = []
        if test.allowed_user_ids:
            try:
                allowed_users = json.loads(test.allowed_user_ids)
            except:
                allowed_users = []
        
        # If enrollment is required and user is not in the list, deny access
        if allowed_users and user.user_id not in allowed_users:
            return jsonify({'error': 'You are not enrolled in this test'}), 403
    
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
    """Submit user answers for a specific test with detailed analysis"""
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
    
    # Check if user is enrolled in this test
    if not user.is_admin:
        allowed_users = []
        if test.allowed_user_ids:
            try:
                allowed_users = json.loads(test.allowed_user_ids)
            except:
                allowed_users = []
        
        # If enrollment is required and user is not in the list, deny submission
        if allowed_users and user.user_id not in allowed_users:
            return jsonify({'error': 'You are not enrolled in this test'}), 403
    
    answers = data['answers']
    question_states = data.get('question_states', {})  # Get question states with time tracking
    
    # Get all sections and questions for this test
    test_sections = Section.query.filter_by(test_id=test_id).order_by(Section.order).all()
    
    # Calculate overall score and detailed analysis
    total_questions = 0
    correct_answers = 0
    attempted = 0
    not_attempted = 0
    marked_for_review = 0
    
    section_analysis = []
    question_details = []
    
    for section in test_sections:
        questions = Question.query.filter_by(section_id=section.id).order_by(Question.section_order).all()
        
        section_correct = 0
        section_total = len(questions)
        section_attempted = 0
        
        for question in questions:
            total_questions += 1
            question_id_str = str(question.id)
            user_answer = answers.get(question_id_str, None)
            is_correct = user_answer == question.correct_answer
            
            if user_answer:
                attempted += 1
                section_attempted += 1
                if is_correct:
                    correct_answers += 1
                    section_correct += 1
            else:
                not_attempted += 1
            
            # Check if marked for review from question_states
            is_marked = question_states.get(question_id_str, {}).get('marked_for_review', False)
            if is_marked:
                marked_for_review += 1
            
            # Add question detail
            question_details.append({
                'question_number': question.section_order,
                'section_name': section.name,
                'question_text': question.question_text,
                'correct_answer': question.correct_answer,
                'your_answer': user_answer,
                'is_correct': is_correct,
                'is_attempted': user_answer is not None,
                'is_marked_for_review': is_marked,
                'status': 'correct' if is_correct else ('incorrect' if user_answer else 'not_attempted')
            })
        
        # Add section analysis
        section_percentage = round((section_correct / section_total * 100), 2) if section_total > 0 else 0
        section_analysis.append({
            'section_name': section.name,
            'total_questions': section_total,
            'attempted': section_attempted,
            'correct': section_correct,
            'incorrect': section_attempted - section_correct,
            'score_percentage': section_percentage,
            'performance': 'Strong' if section_percentage >= 70 else ('Average' if section_percentage >= 50 else 'Needs Improvement')
        })
    
    percentage = round((correct_answers / total_questions * 100), 2) if total_questions > 0 else 0
    accuracy = round((correct_answers / attempted * 100), 2) if attempted > 0 else 0
    
    # Store submission
    submission = Submission(
        user_id=user.id,
        test_id=test_id,
        answers=json.dumps(answers),
        score_points=correct_answers,
        score_total=total_questions,
        score_percentage=percentage
    )
    
    db.session.add(submission)
    db.session.commit()
    
    # Return comprehensive analysis
    return jsonify({
        'message': 'Exam submitted successfully',
        'submission_id': submission.id,
        'test_id': test_id,
        'test_name': test.name,
        'test_duration_minutes': test.duration_minutes,
        'overall_summary': {
            'score_points': correct_answers,
            'score_total': total_questions,
            'score_percentage': percentage,
            'pass_status': 'Pass' if percentage >= 40 else 'Fail',  # 40% pass cutoff
            'accuracy': accuracy,
            'total_questions': total_questions,
            'attempted': attempted,
            'not_attempted': not_attempted,
            'correct': correct_answers,
            'incorrect': attempted - correct_answers,
            'marked_for_review': marked_for_review
        },
        'section_analysis': section_analysis,
        'question_details': question_details
    }), 200

@app.route('/my-submissions', methods=['GET'])
@jwt_required()
def get_my_submissions():
    """Get current user's submissions"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get all submissions for current user
    submissions = Submission.query.filter_by(user_id=user.id).all()
    
    return jsonify({
        'submissions': [sub.to_dict() for sub in submissions]
    }), 200

@app.route('/submission/<int:submission_id>', methods=['GET'])
@jwt_required()
def get_submission_details(submission_id):
    """Get detailed submission analysis for a specific submission"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get the submission
    submission = Submission.query.get(submission_id)
    
    if not submission:
        return jsonify({'error': 'Submission not found'}), 404
    
    # Verify ownership (users can only see their own submissions, admins can see all)
    if submission.user_id != user.id and not user.is_admin:
        return jsonify({'error': 'Unauthorized access'}), 403
    
    # Get the test
    test = Test.query.get(submission.test_id)
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    # Parse answers from JSON
    answers = json.loads(submission.answers)
    
    # Prepare detailed analysis (similar to /submit endpoint)
    section_analysis = []
    question_details = []
    
    correct_answers = 0
    attempted = 0
    marked_for_review = 0
    total_questions = 0
    
    # Process each section
    for section in test.sections:
        section_correct = 0
        section_attempted = 0
        section_total = len(section.questions)
        total_questions += section_total
        
        for question in section.questions:
            q_id = str(question.id)
            user_answer = answers.get(q_id, '')
            
            # Determine status
            is_correct = user_answer == question.correct_answer
            is_attempted = bool(user_answer)
            
            if is_attempted:
                attempted += 1
                section_attempted += 1
                if is_correct:
                    correct_answers += 1
                    section_correct += 1
            
            # Add question detail with full question text and options
            question_details.append({
                'question_number': question.section_order,
                'section_name': section.name,
                'question_text': question.question_text,
                'options': {
                    'A': question.option_a,
                    'B': question.option_b,
                    'C': question.option_c,
                    'D': question.option_d
                },
                'correct_answer': question.correct_answer,
                'correct_answer_text': getattr(question, f'option_{question.correct_answer.lower()}', ''),
                'your_answer': user_answer or 'Not Attempted',
                'your_answer_text': getattr(question, f'option_{user_answer.lower()}', 'Not Attempted') if user_answer else 'Not Attempted',
                'status': 'correct' if is_correct else ('incorrect' if is_attempted else 'not_attempted')
            })
        
        # Calculate section performance
        section_percentage = (section_correct / section_total * 100) if section_total > 0 else 0
        performance = 'excellent' if section_percentage >= 80 else ('good' if section_percentage >= 60 else 'needs_improvement')
        
        section_analysis.append({
            'section_name': section.name,
            'score_percentage': round(section_percentage, 2),
            'correct': section_correct,
            'incorrect': section_attempted - section_correct,
            'attempted': section_attempted,
            'total_questions': section_total,
            'performance': performance
        })
    
    # Return comprehensive analysis
    return jsonify({
        'submission_id': submission.id,
        'test_name': test.name,
        'submitted_at': submission.submitted_at.isoformat(),
        'overall_summary': {
            'score_percentage': submission.score_percentage,
            'score_points': submission.score_points,
            'score_total': submission.score_total,
            'pass_status': 'pass' if submission.score_percentage >= 35 else 'fail',
            'accuracy': round((correct_answers / attempted * 100), 2) if attempted > 0 else 0,
            'total_questions': total_questions,
            'attempted': attempted,
            'not_attempted': total_questions - attempted,
            'correct': correct_answers,
            'incorrect': attempted - correct_answers,
            'marked_for_review': marked_for_review
        },
        'section_analysis': section_analysis,
        'question_details': question_details
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

@app.route('/test-analysis/<int:test_id>', methods=['GET'])
@jwt_required()
def get_test_analysis(test_id):
    """Get comprehensive test analysis including participation metrics"""
    current_user_id = get_jwt_identity()
    user = User.query.filter_by(user_id=current_user_id).first()
    
    if not user or not user.is_admin:
        return jsonify({'error': 'Admin privileges required'}), 403
    
    # Get test
    test = Test.query.get(test_id)
    if not test:
        return jsonify({'error': 'Test not found'}), 404
    
    # Get allowed users for this test
    allowed_user_ids = []
    if test.allowed_user_ids:
        try:
            allowed_user_ids = json.loads(test.allowed_user_ids)
        except:
            allowed_user_ids = []
    
    total_assigned = len(allowed_user_ids)
    
    # Get submissions for this test
    submissions = Submission.query.filter_by(test_id=test_id).all()
    
    # Get unique users who attempted
    attempted_user_ids = list(set([sub.user.user_id for sub in submissions]))
    total_attempted = len(attempted_user_ids)
    
    # Calculate not attempted
    not_attempted_user_ids = [uid for uid in allowed_user_ids if uid not in attempted_user_ids]
    total_not_attempted = len(not_attempted_user_ids)
    
    # Get user details for not attempted
    not_attempted_users = []
    for user_id in not_attempted_user_ids[:50]:  # Limit to 50 for performance
        u = User.query.filter_by(user_id=user_id).first()
        if u:
            not_attempted_users.append({
                'user_id': u.user_id,
                'name': u.name
            })
    
    return jsonify({
        'test_id': test_id,
        'test_name': test.name,
        'participation': {
            'total_assigned': total_assigned,
            'total_attempted': total_attempted,
            'total_not_attempted': total_not_attempted,
            'attempted_percentage': round((total_attempted / total_assigned * 100) if total_assigned > 0 else 0, 2),
            'not_attempted_users': not_attempted_users
        },
        'submissions': [sub.to_dict() for sub in submissions]
    }), 200

# Check and update database schema if needed
def check_database_schema():
    from sqlalchemy import inspect
    inspector = inspect(db.engine)
    
    # Check if the test table exists and add allowed_user_ids column if missing
    if 'test' in inspector.get_table_names():
        columns = [column['name'] for column in inspector.get_columns('test')]
        if 'allowed_user_ids' not in columns:
            print("Adding missing allowed_user_ids column to test table...")
            with db.engine.connect() as connection:
                connection.execute(db.text("ALTER TABLE test ADD COLUMN allowed_user_ids TEXT"))
                connection.commit()
                print("Column added successfully!")
    
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

# ============================================================================
# REACT BUILD SERVING - MUST BE AT THE END AFTER ALL API ROUTES
# ============================================================================

from flask import send_from_directory

@app.route('/', defaults={'path': ''}, methods=['GET'])
@app.route('/<path:path>', methods=['GET'])
def serve_react(path):
    """
    Serve React build files for production deployment.
    This MUST be at the end to avoid intercepting API routes.
    
    Order matters:
    1. Flask checks routes in definition order
    2. API routes are checked first
    3. This catch-all route handles everything else (React app)
    """
    # Path to the React build folder
    react_build = os.path.abspath(os.path.join(os.path.dirname(__file__), 'build'))
    
    # If build folder doesn't exist, return API status
    if not os.path.exists(react_build):
        return jsonify({
            'status': 'running',
            'message': 'Rompit OE API is running',
            'note': 'React build not found. Run: npm run build in react-frontend'
        }), 200
    
    # If requesting a specific file that exists, serve it
    # send_from_directory handles the path correctly with base directory
    if path:
        file_path = os.path.join(react_build, path)
        if os.path.exists(file_path):
            return send_from_directory(react_build, path)
    
    # Otherwise, serve index.html for client-side routing
    if os.path.exists(os.path.join(react_build, 'index.html')):
        return send_from_directory(react_build, 'index.html')
    
    # Fallback if no index.html
    return jsonify({
        'error': 'React build incomplete',
        'message': 'index.html not found in build folder'
    }), 404

if __name__ == '__main__':
    with app.app_context():
        initialize_database()
    app.run(debug=True, host='0.0.0.0', port=5000)