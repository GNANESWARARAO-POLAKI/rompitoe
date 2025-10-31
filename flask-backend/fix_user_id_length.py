"""
Fix user_id column length from VARCHAR(10) to VARCHAR(50)
Run this script once to update the Neon database schema
"""
import psycopg2
from psycopg2 import sql

# Neon PostgreSQL connection string
DATABASE_URL = "postgresql://neondb_owner:npg_ETjaJbR48Ovl@ep-tiny-smoke-a4uifbri-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

def fix_user_id_length():
    """Alter user_id column to support longer IDs"""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        print("Connected to Neon database...")
        
        # Check current column type
        cur.execute("""
            SELECT character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name = 'user_id';
        """)
        current_length = cur.fetchone()
        print(f"Current user_id length: {current_length[0] if current_length else 'Unknown'}")
        
        # Alter column length
        print("Altering user_id column to VARCHAR(50)...")
        cur.execute("""
            ALTER TABLE "user" 
            ALTER COLUMN user_id TYPE VARCHAR(50);
        """)
        
        conn.commit()
        print("✅ Successfully updated user_id column to VARCHAR(50)")
        
        # Verify change
        cur.execute("""
            SELECT character_maximum_length 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            AND column_name = 'user_id';
        """)
        new_length = cur.fetchone()
        print(f"New user_id length: {new_length[0]}")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
            conn.close()

if __name__ == "__main__":
    fix_user_id_length()
