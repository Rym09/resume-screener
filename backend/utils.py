from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
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

# Load environment variables
load_dotenv()

# Authentication configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")  # Change this in production!
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


# Load a pretrained NLP model
nlp = pipeline("feature-extraction", model="bert-base-uncased")

# Comprehensive list of common technical skills
TECH_SKILLS = [
    # Programming Languages
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "Scala", "R",
    # Web Frameworks
    "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "FastAPI", "Spring", "Rails", "Laravel", "Next.js",
    # Databases
    "SQL", "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Oracle", "SQLite", "Cassandra", "DynamoDB",
    # Cloud & DevOps
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Jenkins", "CI/CD", "Terraform", "Ansible", "Linux", "Git", "GitHub",
    # Data Science & ML
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Scikit-learn", "NLP", "Computer Vision",
    # Soft Skills & Misc
    "Agile", "Scrum", "REST API", "GraphQL", "Microservices", "Unit Testing", "TDD", "Leadership", "Communication"
]

def extract_skills(text: str):
    """Extract skills from text by matching against known skills list"""
    text_lower = text.lower()
    found_skills = []
    for skill in TECH_SKILLS:
        # Check for exact word match to avoid false positives
        skill_lower = skill.lower()
        if skill_lower in text_lower:
            found_skills.append(skill)
    return list(set(found_skills))  # Remove duplicates

def extract_resume_info(text: str):
    """Extract skills, experience, and education from resume text"""
    skills = extract_skills(text)
    
    # Try to extract experience years
    import re
    experience_match = re.search(r'(\d+)\+?\s*years?\s*(of)?\s*(experience|working)?', text.lower())
    experience = f"{experience_match.group(1)} years of experience" if experience_match else "Experience not specified"
    
    # Try to extract education
    education_keywords = ["Bachelor", "Master", "PhD", "B.S.", "M.S.", "B.A.", "M.A.", "MBA", "Degree"]
    education = "Education not specified"
    for keyword in education_keywords:
        if keyword.lower() in text.lower():
            education = f"{keyword} degree found"
            break
    
    return skills, experience, education

def extract_job_description_info(text: str):
    """Extract required skills from job description"""
    skills = extract_skills(text)
    return skills

def compare_skills(resume_skills: list, job_skills: list):
    matching_skills = [skill for skill in resume_skills if skill in job_skills]
    return matching_skills

def match_resume_to_job(resume_text: str, job_description_text: str):
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([resume_text, job_description_text])
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])
    return similarity[0][0]

def calculate_match_score(skills_similarity, experience_similarity, education_similarity):
    return 0.4 * skills_similarity + 0.3 * experience_similarity + 0.2 * education_similarity
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

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)  # Make sure this is included
):
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