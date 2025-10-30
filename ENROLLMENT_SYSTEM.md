# Test Enrollment System

## Overview

The system now supports test enrollment where students can only see and attempt tests they are specifically assigned to by the admin.

## How It Works

### For Students:

1. **Test Visibility**: Students only see tests they are enrolled in on the Test List page
2. **Access Control**: If a student tries to access a test they're not enrolled in, they'll get an error message
3. **Automatic Filtering**: The system automatically filters tests based on enrollment

### For Admins:

1. **View All Tests**: Admins can see all tests regardless of enrollment
2. **Manage Enrollments**: Admins can enroll/unenroll students from tests
3. **Upload-Based Enrollment**: When uploading user files, you can specify which users get enrolled

## Enrollment Rules

### Test Access Logic:

A student can access a test if ANY of these conditions are true:

- User is an admin (admins bypass enrollment)
- Test has NO enrollment restrictions (allowed_user_ids is empty/null) - **Open to all students**
- User's user_id is in the test's allowed_user_ids list

### Empty Enrollment List:

- If `allowed_user_ids` is empty or null → Test is **visible to ALL students**
- If `allowed_user_ids` has user IDs → Test is **only visible to those students**

## API Endpoints

### 1. Get Active Tests (Students)

```
GET /active-tests
Authorization: Bearer <token>
```

Returns only tests the logged-in user is enrolled in.

### 2. Get Test Enrollments (Admin Only)

```
GET /tests/<test_id>/enrollments
Authorization: Bearer <admin_token>
```

Response:

```json
{
  "test_id": 1,
  "test_name": "Math Test",
  "enrolled_users": ["STUDENT001", "STUDENT002"],
  "enrollment_count": 2
}
```

### 3. Enroll Users in Test (Admin Only)

```
POST /tests/<test_id>/enrollments
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "user_ids": ["STUDENT001", "STUDENT002", "STUDENT003"]
}
```

Response:

```json
{
  "message": "Successfully enrolled 3 user(s)",
  "enrolled_users": ["STUDENT001", "STUDENT002", "STUDENT003"],
  "enrollment_count": 3
}
```

### 4. Unenroll Users from Test (Admin Only)

```
DELETE /tests/<test_id>/enrollments
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "user_ids": ["STUDENT001"]
}
```

Response:

```json
{
  "message": "Successfully removed 1 user(s)",
  "enrolled_users": ["STUDENT002", "STUDENT003"],
  "enrollment_count": 2
}
```

### 5. Update Test with Enrollments (Admin Only)

```
PUT /tests/<test_id>
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Test Name",
  "is_active": true,
  "allowed_user_ids": ["STUDENT001", "STUDENT002"]
}
```

## Database Schema

### Test Table

The `Test` model has an `allowed_user_ids` field:

```python
allowed_user_ids = db.Column(db.Text)  # JSON string array of user IDs
```

Example data:

```json
["STUDENT001", "STUDENT002", "STUDENT003"]
```

## Usage Examples

### Example 1: Create Test for Specific Students

1. Admin creates a new test
2. Admin enrolls specific students:
   ```
   POST /tests/1/enrollments
   { "user_ids": ["STUDENT001", "STUDENT002"] }
   ```
3. Only STUDENT001 and STUDENT002 can see and attempt this test

### Example 2: Make Test Open to Everyone

1. Admin creates a test
2. Leave `allowed_user_ids` empty (don't enroll anyone)
3. ALL students can see and attempt this test

### Example 3: Add More Students Later

1. Test already has some enrollments
2. Admin adds more students:
   ```
   POST /tests/1/enrollments
   { "user_ids": ["STUDENT003", "STUDENT004"] }
   ```
3. System automatically avoids duplicates

### Example 4: Remove Student Access

1. Student needs to be removed from test
2. Admin unenrolls the student:
   ```
   DELETE /tests/1/enrollments
   { "user_ids": ["STUDENT001"] }
   ```
3. Student can no longer see or access the test

## Error Messages

### Student tries to access unenrolled test:

```json
{
  "error": "You are not enrolled in this test"
}
```

### Student tries to submit unenrolled test:

```json
{
  "error": "You are not enrolled in this test"
}
```

### Non-admin tries to manage enrollments:

```json
{
  "error": "Admin privileges required"
}
```

## Security Features

1. **JWT Authentication**: All endpoints require valid JWT token
2. **Admin-Only Management**: Only admins can manage enrollments
3. **Multiple Checkpoints**: Enrollment checked at:
   - Test list display
   - Question retrieval
   - Test submission
4. **User Validation**: System verifies user exists before allowing access

## Future Enhancements (Optional)

1. **Bulk Upload**: CSV file upload for mass enrollment
2. **Enrollment Dates**: Start and end dates for test access
3. **Group Enrollment**: Enroll entire classes or groups
4. **Enrollment History**: Track when students were enrolled/unenrolled
5. **Email Notifications**: Notify students when enrolled in a test
6. **Enrollment Reports**: See which students are enrolled in which tests

## Migration Notes

If you have existing tests in the database:

- Tests with NULL or empty `allowed_user_ids` remain visible to all students
- To restrict existing tests, use the enrollment API to add allowed users
- No database migration needed - the column already exists

## Testing the System

1. **Test Open Access**:

   - Create test without enrollments
   - Login as any student
   - Verify test appears in list

2. **Test Restricted Access**:

   - Create test
   - Enroll only STUDENT001
   - Login as STUDENT001 → Should see test
   - Login as STUDENT002 → Should NOT see test

3. **Test Admin Access**:
   - Login as admin
   - Should see all tests regardless of enrollment
