import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get('DATABASE_URL') or 'sqlite:///exam_app.db'

def get_session():
    # Create a new engine per invocation for serverless environments
    engine = create_engine(DATABASE_URL, connect_args={})
    Session = sessionmaker(bind=engine)
    return Session(), engine
