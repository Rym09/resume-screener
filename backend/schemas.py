from typing import Optional
from pydantic import BaseModel, EmailStr
from fastapi import UploadFile 
from datetime import datetime # Add this import
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

class UserLogin(BaseModel):
    email: EmailStr
    password: str

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
    role: str  # <-- Add this field
class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    profile_picture: Optional[UploadFile] = None

class UserProfile(UserBase):
    profile_picture: Optional[str] = None
    class Config:
        from_attributes = True