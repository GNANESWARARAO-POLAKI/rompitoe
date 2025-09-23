# Flask Backend for Rompit OE (Online Exam Platform)

This backend provides the API for the Rompit OE online exam platform built with Flask, featuring database storage and JWT authentication.

## Features

- User authentication with JWT tokens
- Admin section with file upload functionality
- Exam questions organized in sections
- User exam submissions and scoring
- Download of exam results as CSV
- SQLite database for persistent storage

## Setup Instructions

1. Create a virtual environment:

   ```
   python -m venv venv
   ```

2. Activate the virtual environment:

   - Windows:
     ```
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```
     source venv/bin/activate
     ```

3. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Run the application:
   ```
   python db_app.py
   ```

The API will start on http://localhost:5000

## Authentication

The application now uses JWT tokens for authentication:

1. Student logs in with user_id and date of birth
2. Admin logs in with password
3. JWT token is returned and must be included in all subsequent requests
4. Token expires after 24 hours

Include the token in the Authorization header for all protected API requests:

```
Authorization: Bearer <token>
```

## API Endpoints

### Authentication

- `POST /login`: Authenticate user with user_id and dob, returns JWT token
- `POST /admin-login`: Authenticate admin with password, returns JWT token
- `POST /register-admin`: Create an admin user (first-time setup only)

### Exam Data

- `GET /`: Health check
- `GET /questions`: Get all exam questions (JWT required)
- `POST /submit`: Submit exam answers (JWT required)

### Admin Features

- `POST /upload`: Upload Excel files with user and exam data (Admin JWT required)
- `GET /scores`: Get all submission scores (Admin JWT required)
- `GET /download-scores`: Download scores as CSV (Admin JWT required)

## Data Format

### User Data Excel Format

| user_id | dob        | name (optional) |
| ------- | ---------- | --------------- |
| test123 | 2000-01-01 | Test User       |

### Exam Data Excel Format

Each sheet represents a section, with the following columns:

| question   | option_a | option_b | option_c | option_d | correct_answer |
| ---------- | -------- | -------- | -------- | -------- | -------------- |
| What is... | Answer A | Answer B | Answer C | Answer D | A              |

## Database Models

The application uses SQLAlchemy with the following models:

- **User**: Stores user credentials and personal information
- **Section**: Represents an exam section (e.g., Physics, Chemistry)
- **Question**: Stores individual questions with options and correct answers
- **Submission**: Records user exam submissions and scores

The database is automatically created and initialized with sample data on first run.

## Development

For development purposes, the app includes some test data that will be available when running the server.

### Running with the old in-memory version

The original in-memory version is still available:

```
python simple_app.py
```

### Running with the database version

```
python db_app.py
```
