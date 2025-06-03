-- Complete database reset and setup
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

-- Create internal grade levels table with UNIQUE constraint
CREATE TABLE internal_grades (
    id SERIAL PRIMARY KEY,
    level_number INTEGER NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    abbreviation VARCHAR(10) NOT NULL,
    level_keyword VARCHAR(100) NOT NULL,
    experience_min VARCHAR(20) NOT NULL,
    theory_level VARCHAR(50) NOT NULL,
    autonomy_level VARCHAR(50) NOT NULL,
    leadership_level VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create other tables without foreign keys
CREATE TABLE job_descriptions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    company VARCHAR(200) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(200),
    employment_type VARCHAR(50),
    experience_required VARCHAR(50),
    description TEXT NOT NULL,
    requirements TEXT,
    responsibilities TEXT,
    skills_required TEXT[],
    education_required VARCHAR(100),
    salary_min INTEGER,
    salary_max INTEGER,
    remote_option BOOLEAN DEFAULT FALSE,
    ai_suggested_grade INTEGER,
    ai_confidence_score DECIMAL(3,2),
    ai_reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE candidates (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    years_experience DECIMAL(3,1) NOT NULL,
    current_title VARCHAR(200),
    current_company VARCHAR(200),
    education_level VARCHAR(100),
    skills TEXT[],
    certifications TEXT[],
    summary TEXT,
    linkedin_url VARCHAR(500),
    resume_text TEXT,
    current_grade_level INTEGER,
    target_grade_level INTEGER,
    salary_expectation INTEGER,
    location VARCHAR(200),
    remote_preference VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE matching_results (
    id SERIAL PRIMARY KEY,
    job_description_id INTEGER,
    suggested_internal_grade INTEGER,
    level_keyword VARCHAR(100),
    confidence_score DECIMAL(3,2) NOT NULL,
    experience_range VARCHAR(50),
    key_requirements_extracted TEXT[],
    reasoning TEXT,
    theory_level_analysis TEXT,
    experience_capability_analysis TEXT,
    autonomy_level_analysis TEXT,
    leadership_coaching_analysis TEXT,
    alternative_considerations JSONB,
    flags_for_review TEXT[],
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ai_model_used VARCHAR(100) DEFAULT 'gpt-4'
);

CREATE TABLE candidate_job_matches (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER,
    job_description_id INTEGER,
    match_score DECIMAL(3,2),
    experience_match DECIMAL(3,2),
    skills_match DECIMAL(3,2),
    grade_level_match DECIMAL(3,2),
    salary_match DECIMAL(3,2),
    location_match DECIMAL(3,2),
    match_reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert internal grades (8 levels, no duplicates)
INSERT INTO internal_grades (level_number, title, abbreviation, level_keyword, experience_min, theory_level, autonomy_level, leadership_level, description) VALUES
(1, 'Junior Technician', 'JT', 'Follow', '< 1 year', 'Basic', 'None', 'None', 'Entry-level position requiring minimal experience'),
(2, 'Technician', 'T', 'Assist', '1+ years', 'Basic + Intermediate', 'Limited', 'None', 'Supporting others in technical tasks'),
(3, 'Senior Technician', 'ST', 'Apply', '2+ years', 'Intermediate', 'Moderate', 'Peer Influence', 'Applying learned skills independently'),
(4, 'Engineer', 'EN', 'Enable', '3+ years', 'Good Technical', 'High', 'Junior Supervision (1-2)', 'Enabling others through technical expertise'),
(5, 'Senior Engineer', 'SE', 'Ensure and advise', '5+ years', 'Good Technical + Commercial', 'High', 'Team Coordination (2+)', 'Ensuring quality and providing advice'),
(6, 'Consultant', 'C', 'Influence', '8+ years', 'Expert', 'Full', 'Team Influence', 'Stakeholder coordination, commercial involvement'),
(7, 'Senior Consultant', 'SC', 'Initiate and influence', '8+ years', 'Expert', 'Full', 'Role Model', 'Strategic thinking, organizational influence'),
(8, 'Management Level', 'ML', 'Set strategy, inspire and mobilize', '12+ years', 'Expert', 'Full', 'Management', 'Setting strategy, forming teams and departments');

-- Insert sample candidates
INSERT INTO candidates (first_name, last_name, email, phone, years_experience, current_title, current_company, education_level, skills, certifications, summary, current_grade_level, target_grade_level, salary_expectation, location, remote_preference) VALUES
('Alex', 'Johnson', 'alex.johnson@email.com', '+1234567890', 0.5, 'Junior Developer', 'TechStart Inc', 'Bachelor in Computer Science', 
ARRAY['JavaScript', 'HTML', 'CSS', 'React basics'], ARRAY['AWS Cloud Practitioner'], 
'Recent computer science graduate with internship experience.', 1, 3, 45000, 'New York, NY', 'Hybrid'),

('Maria', 'Rodriguez', 'maria.rodriguez@email.com', '+1234567891', 1.2, 'Support Technician', 'DataCorp', 'Associate Degree in IT', 
ARRAY['Help Desk', 'Windows', 'Basic Networking', 'Office 365'], ARRAY['CompTIA A+'], 
'IT support professional with over a year of experience.', 2, 4, 48000, 'Austin, TX', 'On-site'),

('David', 'Chen', 'david.chen@email.com', '+1234567892', 2.8, 'Senior Support Specialist', 'CloudTech Solutions', 'Bachelor in Information Systems', 
ARRAY['System Administration', 'Linux', 'PowerShell', 'Network Troubleshooting'], ARRAY['CompTIA Network+'], 
'Experienced technical specialist who can troubleshoot complex issues.', 3, 4, 58000, 'Seattle, WA', 'Remote'),

('Michael', 'Thompson', 'michael.thompson@email.com', '+1234567894', 4.2, 'Software Engineer', 'InnovateSoft', 'Bachelor in Software Engineering', 
ARRAY['Java', 'Spring Boot', 'React', 'PostgreSQL', 'Docker', 'AWS'], ARRAY['AWS Solutions Architect Associate'], 
'Full-stack developer with experience leading small projects.', 4, 5, 78000, 'San Francisco, CA', 'Remote'),

('Robert', 'Miller', 'robert.miller@email.com', '+1234567896', 6.5, 'Senior Software Engineer', 'TechGiant Corp', 'Master in Computer Science', 
ARRAY['Python', 'Django', 'React', 'PostgreSQL', 'Redis', 'Microservices'], ARRAY['PMP', 'AWS Solutions Architect Professional'], 
'Senior engineer with extensive experience in scalable system design.', 5, 6, 125000, 'Chicago, IL', 'Hybrid'),

('James', 'Brown', 'james.brown@email.com', '+1234567898', 9.2, 'Principal Consultant', 'ConsultPro LLC', 'Master in Business Administration', 
ARRAY['Enterprise Architecture', 'Digital Transformation', 'Stakeholder Management'], ARRAY['TOGAF', 'PMP'], 
'Senior consultant specializing in digital transformation projects.', 6, 7, 165000, 'Atlanta, GA', 'Remote'),

('William', 'Taylor', 'william.taylor@email.com', '+1234567800', 14.5, 'Engineering Manager', 'GlobalTech Solutions', 'Master in Engineering Management', 
ARRAY['Team Management', 'Strategic Planning', 'Budget Management'], ARRAY['PMP', 'Executive Leadership Certificate'], 
'Experienced engineering manager with track record of building teams.', 8, 8, 195000, 'Los Angeles, CA', 'On-site');

-- Insert sample job descriptions
INSERT INTO job_descriptions (title, company, department, location, employment_type, experience_required, description, requirements, responsibilities, skills_required, education_required, salary_min, salary_max, remote_option) VALUES
('Junior Software Developer', 'TechStartup Inc', 'Engineering', 'New York, NY', 'Full-time', '0-1 years', 
'Looking for a motivated Junior Software Developer to join our growing team.',
'Basic understanding of programming concepts, willingness to learn',
'Write clean code under supervision; Participate in code reviews',
ARRAY['JavaScript', 'HTML', 'CSS', 'Git'], 'Bachelor degree in Computer Science', 42000, 50000, true),

('Full Stack Developer', 'InnovateWeb LLC', 'Development', 'San Francisco, CA', 'Full-time', '3-5 years',
'Seeking an experienced Full Stack Developer to lead development projects.',
'3-5 years of full-stack development experience, leadership potential',
'Design web applications; Lead technical decisions; Mentor junior developers',
ARRAY['React', 'Node.js', 'PostgreSQL', 'AWS'], 'Bachelor degree in Computer Science', 85000, 110000, true);

-- Add foreign key constraints after data is inserted
ALTER TABLE candidates ADD CONSTRAINT fk_candidates_current_grade FOREIGN KEY (current_grade_level) REFERENCES internal_grades(level_number);
ALTER TABLE candidates ADD CONSTRAINT fk_candidates_target_grade FOREIGN KEY (target_grade_level) REFERENCES internal_grades(level_number);
ALTER TABLE job_descriptions ADD CONSTRAINT fk_job_descriptions_grade FOREIGN KEY (ai_suggested_grade) REFERENCES internal_grades(level_number);
ALTER TABLE matching_results ADD CONSTRAINT fk_matching_results_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id);
ALTER TABLE matching_results ADD CONSTRAINT fk_matching_results_grade FOREIGN KEY (suggested_internal_grade) REFERENCES internal_grades(level_number);
ALTER TABLE candidate_job_matches ADD CONSTRAINT fk_candidate_matches_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id);
ALTER TABLE candidate_job_matches ADD CONSTRAINT fk_candidate_matches_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id);

-- Create indexes
CREATE INDEX idx_candidates_experience ON candidates(years_experience);
CREATE INDEX idx_candidates_grade_level ON candidates(current_grade_level);

-- Insert sample matching results
INSERT INTO matching_results (job_description_id, suggested_internal_grade, level_keyword, confidence_score, experience_range, key_requirements_extracted, reasoning) VALUES
(1, 1, 'Follow', 0.92, '< 1 year', 
ARRAY['Basic programming knowledge', 'Willingness to learn', 'Work under supervision'],
'Entry-level position requiring basic knowledge and supervision - matches Level 1 Junior Technician.'),

(2, 4, 'Enable', 0.87, '3+ years',
ARRAY['3-5 years experience', 'Lead technical decisions', 'Mentor junior developers'],
'Position requires technical leadership and mentoring - aligns with Level 4 Engineer Enable criteria.');

-- Insert sample candidate-job matches
INSERT INTO candidate_job_matches (candidate_id, job_description_id, match_score, experience_match, skills_match, grade_level_match, salary_match, location_match, match_reasoning) VALUES
(1, 1, 0.95, 0.90, 0.85, 1.00, 0.95, 1.00, 'Excellent match - candidate profile perfectly aligns with junior developer requirements'),
(4, 2, 0.92, 0.90, 0.95, 1.00, 0.88, 0.90, 'Very good match - full-stack experience and mentoring background ideal for this role');