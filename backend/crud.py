from sqlalchemy.orm import Session
from models import JobDescription, Resume
from schemas import JobDescriptionCreate, ResumeCreate  # Add this import

def create_resume(db: Session, resume: ResumeCreate):
    db_resume = Resume(**resume.dict())
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)
    return db_resume

def get_resume(db: Session, resume_id: int):
    return db.query(Resume).filter(Resume.id == resume_id).first()

def create_job_description(db: Session, job_description: JobDescriptionCreate):
    db_job_description = JobDescription(**job_description.dict())
    db.add(db_job_description)
    db.commit()
    db.refresh(db_job_description)
    return db_job_description

def get_job_description(db: Session, job_description_id: int):
    return db.query(JobDescription).filter(JobDescription.id == job_description_id).first()

def get_all_resumes(db: Session):
    return db.query(Resume).all()