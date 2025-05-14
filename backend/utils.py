from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException
from requests import Session
from transformers import pipeline
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer

from database import get_db
from models import User
from schemas import TokenData

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from fastapi import status

# Load environment variables
load_dotenv()

# Authentication configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")  # Change this in production!
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


# Load a pretrained NLP model
nlp = pipeline("feature-extraction", model="bert-base-uncased")

def extract_resume_info(text: str):
    # Extract features (e.g., skills, experience, education)
    features = nlp(text)
    # Placeholder logic for parsing (customize as needed)
    skills = "Python, FastAPI, React"
    experience = "5 years of software development"
    education = "Bachelor's in Computer Science"
    return skills, experience, education

def match_resume_to_job(resume_text: str, job_description_text: str):
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([resume_text, job_description_text])
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
    return similarity[0][0]

def calculate_match_score(skills_similarity, experience_similarity, education_similarity):
    return 0.4 * skills_similarity + 0.3 * experience_similarity + 0.2 * education_similarity

def extract_skills(text: str):
    # Placeholder logic to extract skills (customize as needed)
    skills = ["Python", "FastAPI", "React", "SQL", "Docker", "AWS"]
    found_skills = [skill for skill in skills if skill.lower() in text.lower()]
    return found_skills

def extract_resume_info(text: str):
    skills = extract_skills(text)
    experience = "5 years of software development" 
    education = "Bachelor's in Computer Science"  
    return skills, experience, education

def extract_job_description_info(text: str):
    skills = extract_skills(text)
    return skills

def compare_skills(resume_skills: list, job_skills: list):
    matching_skills = [skill for skill in resume_skills if skill in job_skills]
    return matching_skills
#################################################
# Authentication functions
def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)  # Add db dependency here
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)  # This will automatically get the db via get_current_user
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user