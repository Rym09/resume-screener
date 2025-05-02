from typing import Optional
from pydantic import BaseModel

class ResumeBase(BaseModel):
    filename: str
    content: str

class ResumeCreate(ResumeBase):
    pass

class Resume(ResumeBase):
    id: int
    skills: str
    experience: str
    education: str

    class Config:
        from_attributes = True

class JobDescriptionBase(BaseModel):
    filename: str
    content: str

class JobDescriptionCreate(JobDescriptionBase):
    pass

class JobDescription(JobDescriptionBase):
    id: int

    class Config:
        from_attributes = True

class UserBase(BaseModel):
    email: str
    role: str  # "recruiter" or "applicant"

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
