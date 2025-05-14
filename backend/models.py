from sqlalchemy import Boolean, DateTime, ForeignKey, create_engine, Column, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import os
from datetime import datetime

from sqlalchemy.orm import relationship  # Add this import

# Load environment variables
load_dotenv()

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL")

# Create database engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

# Resume model
class Resume(Base):
    __tablename__ = "resumes"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    content = Column(Text)
    skills = Column(Text)
    experience = Column(Text)
    education = Column(Text)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User")


class JobDescription(Base):
    __tablename__ = "job_descriptions"
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    content = Column(Text)
    upload_date = Column(DateTime, default=datetime.utcnow) 
    user_id = Column(Integer, ForeignKey("users.id"))
    # Define relationship
    user = relationship("User", back_populates="job_descriptions")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # "recruiter" or "applicant"
    is_active = Column(Boolean, default=True)
    profile_picture = Column(String)  # Add this line
    
    job_descriptions = relationship("JobDescription", back_populates="user")

# Create tables
Base.metadata.create_all(bind=engine)