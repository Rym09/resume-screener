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
    from_attributes = True  # Updated from `orm_mode` in Pydantic V2

class JobDescriptionBase(BaseModel):
    filename: str
    content: str

class JobDescriptionCreate(JobDescriptionBase):
    pass

class JobDescription(JobDescriptionBase):
    id: int

    class Config:
        from_attributes = True