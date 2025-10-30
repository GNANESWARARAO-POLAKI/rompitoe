"""
Database Migration Script - Add Enrollment System Columns
Adds the allowed_user_ids column to the test table for the enrollment system
"""

import os
import sys
from sqlalchemy import create_engine, text

# Get database URL from environment
DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL environment variable not set!")
    print("Set it using: $env:DATABASE_URL='your-neon-db-url'")
    sys.exit(1)

print(f"✓ Connecting to database...")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("\n🔍 Checking if allowed_user_ids column exists...")
        
        # Check if column exists
        result = conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='test' AND column_name='allowed_user_ids'
        """))
        
        if result.fetchone():
            print("✓ Column already exists! No migration needed.")
        else:
            print("➕ Adding allowed_user_ids column to test table...")
            
            # Add the column
            conn.execute(text("""
                ALTER TABLE test 
                ADD COLUMN allowed_user_ids TEXT
            """))
            
            conn.commit()
            print("✅ Migration completed successfully!")
            print("\n📊 Enrollment system is now ready:")
            print("  • allowed_user_ids column added to test table")
            print("  • Stores JSON array of enrolled user IDs")
            
except Exception as e:
    print(f"\n❌ Migration failed: {e}")
    sys.exit(1)

print("\n✨ Database is up to date!")
