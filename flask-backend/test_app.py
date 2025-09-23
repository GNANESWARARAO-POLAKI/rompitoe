import pytest
from app import app
import json

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_index(client):
    response = client.get('/')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'message' in data
    assert data['message'] == 'Rompit OE API is running'

def test_login_missing_data(client):
    response = client.post('/login', json={})
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

def test_login_success(client):
    # This will work because we've added test data in app.py
    response = client.post('/login', json={'user_id': 'test123', 'dob': '2000-01-01'})
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'message' in data
    assert data['message'] == 'Login successful'

def test_login_failure(client):
    response = client.post('/login', json={'user_id': 'invalid', 'dob': 'invalid'})
    assert response.status_code == 401
    data = json.loads(response.data)
    assert 'error' in data

def test_get_questions(client):
    response = client.get('/questions')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'sections' in data
    assert len(data['sections']) > 0
    
    # Check structure of first section
    first_section = data['sections'][0]
    assert 'id' in first_section
    assert 'name' in first_section
    assert 'questions' in first_section
    assert len(first_section['questions']) > 0
    
    # Check structure of first question
    first_question = first_section['questions'][0]
    assert 'id' in first_question
    assert 'question' in first_question
    assert 'options' in first_question
    
    # Ensure correct_answer is not exposed to client
    assert 'correct_answer' not in first_question

def test_submit_exam(client):
    response = client.post('/submit', json={
        'user_id': 'test123',
        'answers': {
            '1': 'A',  # Correct answer for first question
            '2': 'C',  # Incorrect answer for second question
            '3': 'C'   # Correct answer for third question
        }
    })
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'message' in data
    assert 'score' in data
    assert data['score']['points'] == 2  # We should get 2 out of 3 correct
    assert data['score']['total'] == 3