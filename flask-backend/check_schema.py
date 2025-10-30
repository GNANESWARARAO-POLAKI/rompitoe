"""
Check Database Schema
"""

import os
import sys
from sqlalchemy import create_engine, text

DATABASE_URL = os.environ.get('DATABASE_URL')

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL not set!")
    sys.exit(1)

print(f"✓ Connecting to: {DATABASE_URL[:50]}...")
engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("\n📋 Tables in database:")
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema='public'
        """))
        
        tables = [row[0] for row in result]
        for table in tables:
            print(f"  • {table}")
        
        print("\n📊 Columns in 'test' table:")
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name='test'
            ORDER BY ordinal_position
        """))
        
        for row in result:
            print(f"  • {row[0]}: {row[1]}")
            
except Exception as e:
    print(f"\n❌ Error: {e}")
    sys.exit(1)
