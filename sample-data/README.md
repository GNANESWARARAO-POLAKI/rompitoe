# Sample Data Files for Rompit OE

This folder contains sample Excel files that can be used to test the admin panel upload functionality.

## Files

1. `users_sample.xlsx` - Sample user data with User ID and Date of Birth
2. `exam_sample.xlsx` - Sample exam data with questions across multiple sections

## File Formats

### Users Sample

The users sample Excel file contains the following columns:

- `user_id`: Unique identifier for each user
- `dob`: Date of Birth in YYYY-MM-DD format
- `name` (optional): User's full name

### Exam Sample

The exam sample Excel file contains multiple sheets, with each sheet representing an exam section:

- Sheet 1: Physics
- Sheet 2: Chemistry
- Sheet 3: Mathematics

Each sheet contains the following columns:

- `question`: The question text
- `option_a`: First option
- `option_b`: Second option
- `option_c`: Third option
- `option_d`: Fourth option
- `correct_answer`: The correct answer (A, B, C, or D)

## How to Use

1. Open the admin panel at http://localhost:3000/admin
2. Upload the user sample file in the "User Data" section
3. Upload the exam sample file in the "Exam Data" section
4. Click "Upload Files" to process the data

After successful upload, you can test the exam system by logging in with the credentials from the user sample file.

Note: These are sample files for testing purposes only and should not contain real user data.
