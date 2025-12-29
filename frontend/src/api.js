import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const register = (email, password, role) => {
  const formData = new FormData();
  formData.append("username", email);
  formData.append("password", password);
  return api.post("/register", {
    email,
    password,
    role,
  });
};

export const login = (email, password) => {
  const formData = new FormData();
  formData.append("username", email);
  formData.append("password", password);
  return api.post("/login", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getUserProfile = () => {
  return api.get("/users/me");
};

export const updateUserProfile = (profileData) => {
  return api.put("/users/me", profileData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Resume endpoints
export const uploadResume = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/upload-resume/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

// Job Description endpoints
export const uploadJobDescription = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/upload-job-description/", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getJobDescriptions = () => {
  return api.get("/job-descriptions/");
};

export const rankCandidates = (jobDescriptionId) => {
  return api.get("/rank-candidates/", {
    params: {
      job_description_id: jobDescriptionId,
    },
  });
};

// Get user's resumes
export const getMyResumes = () => {
  return api.get("/resumes/me");
};

// Get user's applications
export const getMyApplications = () => {
  return api.get("/applications");
};

// Get available jobs for applicants
export const getAvailableJobs = () => {
  return api.get("/jobs/available");
};

// Session management
export const logout = () => {
  return api.post("/logout");
};

export const logoutCurrentSession = () => {
  return api.post("/logout-current");
};

export const getActiveSessions = () => {
  return api.get("/sessions");
};

export const revokeSession = (sessionId) => {
  return api.delete(`/sessions/${sessionId}`);
};

// Recruiter application management
export const getRecruiterApplications = () => {
  return api.get("/recruiter/applications");
};

export const getJobApplications = (jobId) => {
  return api.get(`/recruiter/applications/${jobId}`);
};

export const updateApplicationStatus = (applicationId, status) => {
  const formData = new FormData();
  formData.append("status", status);
  return api.put(`/recruiter/applications/${applicationId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export default api;