-- Complete database reset and setup with pgvector support
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO admin;
GRANT CREATE ON SCHEMA public TO admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO admin;

-- Create vector similarity functions
CREATE OR REPLACE FUNCTION cosine_similarity(a vector, b vector)
RETURNS float8
LANGUAGE sql
IMMUTABLE STRICT
AS $$
  SELECT 1 - (a <=> b);
$$;

-- Create internal grade levels table
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create job descriptions table with vector embeddings
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
    
    -- Vector embeddings
    job_embedding vector(1536),
    requirements_embedding vector(1536),
    skills_embedding vector(1536),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create candidates table with vector embeddings
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
    
    -- Vector embeddings
    profile_embedding vector(1536),
    skills_embedding vector(1536),
    experience_embedding vector(1536),
    resume_embedding vector(1536),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create user profiles table
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    preferences JSONB,
    search_history JSONB,
    personality_traits JSONB,
    career_goals TEXT,
    
    -- Vector embeddings
    preferences_embedding vector(1536),
    behavior_embedding vector(1536),
    personality_embedding vector(1536),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create matching results table
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
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ai_model_used VARCHAR(100) DEFAULT 'gpt-4'
);

-- Create candidate job matches table with enhanced scoring
CREATE TABLE candidate_job_matches (
    id SERIAL PRIMARY KEY,
    candidate_id INTEGER,
    job_description_id INTEGER,
    user_id VARCHAR(100),
    
    -- Traditional scoring
    match_score DECIMAL(3,2),
    experience_match DECIMAL(3,2),
    skills_match DECIMAL(3,2),
    grade_level_match DECIMAL(3,2),
    salary_match DECIMAL(3,2),
    location_match DECIMAL(3,2),
    
    -- AI & Vector-based scoring
    ai_match_score DECIMAL(5,4),
    profile_similarity DECIMAL(5,4),
    skills_similarity DECIMAL(5,4),
    experience_similarity DECIMAL(5,4),
    culture_fit_score DECIMAL(5,4),
    
    -- AI explanations
    match_reasoning TEXT,
    ai_explanation TEXT,
    strengths_weaknesses JSONB,
    improvement_suggestions TEXT,
    
    -- Ranking and metadata
    rank INTEGER,
    is_recommended BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE(candidate_id, job_description_id, user_id)
);

-- Create AI feedback table
CREATE TABLE ai_feedback (
    id SERIAL PRIMARY KEY,
    matching_result_id INTEGER,
    user_id VARCHAR(100),
    correct_grade INTEGER,
    feedback_type VARCHAR(50),
    feedback_notes TEXT,
    
    -- Enhanced feedback metrics
    actual_match_quality DECIMAL(3,2),
    ai_accuracy DECIMAL(3,2),
    user_satisfaction INTEGER CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5),
    feedback_context JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Insert internal grades (8 levels)
INSERT INTO internal_grades (level_number, title, abbreviation, level_keyword, experience_min, theory_level, autonomy_level, leadership_level, description) VALUES
(1, 'Junior Technician', 'JT', 'Follow', '< 1 year', 'Basic', 'None', 'None', 'Entry-level position requiring minimal experience'),
(2, 'Technician', 'T', 'Assist', '1+ years', 'Basic + Intermediate', 'Limited', 'None', 'Supporting others in technical tasks'),
(3, 'Senior Technician', 'ST', 'Apply', '2+ years', 'Intermediate', 'Moderate', 'Peer Influence', 'Applying learned skills independently'),
(4, 'Engineer', 'EN', 'Enable', '3+ years', 'Good Technical', 'High', 'Junior Supervision (1-2)', 'Enabling others through technical expertise'),
(5, 'Senior Engineer', 'SE', 'Ensure and advise', '5+ years', 'Good Technical + Commercial', 'High', 'Team Coordination (2+)', 'Ensuring quality and providing advice'),
(6, 'Consultant', 'C', 'Influence', '8+ years', 'Expert', 'Full', 'Team Influence', 'Stakeholder coordination, commercial involvement'),
(7, 'Senior Consultant', 'SC', 'Initiate and influence', '8+ years', 'Expert', 'Full', 'Role Model', 'Strategic thinking, organizational influence'),
(8, 'Management Level', 'ML', 'Set strategy, inspire and mobilize', '12+ years', 'Expert', 'Full', 'Management', 'Setting strategy, forming teams and departments');

-- Generate sample vector embeddings (random for demo - in real app these would come from OpenAI)
-- Note: These are dummy embeddings for testing. In production, use actual OpenAI embeddings.

-- Insert sample candidates with vector embeddings
INSERT INTO candidates (
    first_name, last_name, email, phone, years_experience, current_title, current_company, 
    education_level, skills, certifications, summary, current_grade_level, target_grade_level, 
    salary_expectation, location, remote_preference,
    profile_embedding, skills_embedding, experience_embedding, resume_embedding
) VALUES
('Alex', 'Johnson', 'alex.johnson@email.com', '+1234567890', 0.5, 'Junior Developer', 'TechStart Inc', 'Bachelor in Computer Science', 
ARRAY['JavaScript', 'HTML', 'CSS', 'React basics'], ARRAY['AWS Cloud Practitioner'], 
'Recent computer science graduate with internship experience.', 1, 3, 45000, 'New York, NY', 'Hybrid',
-- Sample embeddings (in production, generate these from actual text using OpenAI)
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector),

('Maria', 'Rodriguez', 'maria.rodriguez@email.com', '+1234567891', 1.2, 'Support Technician', 'DataCorp', 'Associate Degree in IT', 
ARRAY['Help Desk', 'Windows', 'Basic Networking', 'Office 365'], ARRAY['CompTIA A+'], 
'IT support professional with over a year of experience.', 2, 4, 48000, 'Austin, TX', 'On-site',
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector),

('David', 'Chen', 'david.chen@email.com', '+1234567892', 2.8, 'Senior Support Specialist', 'CloudTech Solutions', 'Bachelor in Information Systems', 
ARRAY['System Administration', 'Linux', 'PowerShell', 'Network Troubleshooting'], ARRAY['CompTIA Network+'], 
'Experienced technical specialist who can troubleshoot complex issues.', 3, 4, 58000, 'Seattle, WA', 'Remote',
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector),

('Michael', 'Thompson', 'michael.thompson@email.com', '+1234567894', 4.2, 'Software Engineer', 'InnovateSoft', 'Bachelor in Software Engineering', 
ARRAY['Java', 'Spring Boot', 'React', 'PostgreSQL', 'Docker', 'AWS'], ARRAY['AWS Solutions Architect Associate'], 
'Full-stack developer with experience leading small projects.', 4, 5, 78000, 'San Francisco, CA', 'Remote',
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector),

('Sarah', 'Wilson', 'sarah.wilson@email.com', '+1234567895', 6.5, 'Senior Software Engineer', 'TechGiant Corp', 'Master in Computer Science', 
ARRAY['Python', 'Django', 'React', 'PostgreSQL', 'Redis', 'Microservices'], ARRAY['PMP', 'AWS Solutions Architect Professional'], 
'Senior engineer with extensive experience in scalable system design.', 5, 6, 125000, 'Chicago, IL', 'Hybrid',
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector);

-- Insert sample job descriptions with vector embeddings
INSERT INTO job_descriptions (
    title, company, department, location, employment_type, experience_required, description, 
    requirements, responsibilities, skills_required, education_required, salary_min, salary_max, 
    remote_option, ai_suggested_grade,
    job_embedding, requirements_embedding, skills_embedding
) VALUES
('Junior Software Developer', 'TechStartup Inc', 'Engineering', 'New York, NY', 'Full-time', '0-1 years', 
'Looking for a motivated Junior Software Developer to join our growing team. Perfect opportunity for recent graduates.',
'Basic understanding of programming concepts, willingness to learn, good communication skills',
'Write clean code under supervision; Participate in code reviews; Learn new technologies',
ARRAY['JavaScript', 'HTML', 'CSS', 'Git'], 'Bachelor degree in Computer Science', 42000, 50000, true, 1,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector),

('Full Stack Developer', 'InnovateWeb LLC', 'Development', 'San Francisco, CA', 'Full-time', '3-5 years',
'Seeking an experienced Full Stack Developer to lead development projects and mentor junior developers.',
'3-5 years of full-stack development experience, leadership potential, strong problem-solving skills',
'Design and implement web applications; Lead technical decisions; Mentor junior developers; Collaborate with product team',
ARRAY['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'], 'Bachelor degree in Computer Science', 85000, 110000, true, 4,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector),

('Senior Backend Engineer', 'ScaleTech Corp', 'Engineering', 'Seattle, WA', 'Full-time', '5+ years',
'Looking for a Senior Backend Engineer to architect and build scalable systems for our growing platform.',
'5+ years backend experience, microservices architecture, cloud platforms, team leadership experience',
'Design scalable backend systems; Lead architecture decisions; Mentor team members; Ensure system reliability',
ARRAY['Python', 'Django', 'PostgreSQL', 'Redis', 'AWS', 'Docker', 'Kubernetes'], 'Bachelor or Master in Computer Science', 120000, 160000, true, 5,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector);

-- Add foreign key constraints
ALTER TABLE candidates ADD CONSTRAINT fk_candidates_current_grade FOREIGN KEY (current_grade_level) REFERENCES internal_grades(level_number);
ALTER TABLE candidates ADD CONSTRAINT fk_candidates_target_grade FOREIGN KEY (target_grade_level) REFERENCES internal_grades(level_number);
ALTER TABLE job_descriptions ADD CONSTRAINT fk_job_descriptions_grade FOREIGN KEY (ai_suggested_grade) REFERENCES internal_grades(level_number);
ALTER TABLE matching_results ADD CONSTRAINT fk_matching_results_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id);
ALTER TABLE matching_results ADD CONSTRAINT fk_matching_results_grade FOREIGN KEY (suggested_internal_grade) REFERENCES internal_grades(level_number);
ALTER TABLE candidate_job_matches ADD CONSTRAINT fk_candidate_matches_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id);
ALTER TABLE candidate_job_matches ADD CONSTRAINT fk_candidate_matches_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id);
ALTER TABLE ai_feedback ADD CONSTRAINT fk_ai_feedback_matching FOREIGN KEY (matching_result_id) REFERENCES matching_results(id);
ALTER TABLE ai_feedback ADD CONSTRAINT fk_ai_feedback_grade FOREIGN KEY (correct_grade) REFERENCES internal_grades(level_number);

-- Create indexes for performance
CREATE INDEX idx_candidates_experience ON candidates(years_experience);
CREATE INDEX idx_candidates_grade_level ON candidates(current_grade_level);
CREATE INDEX idx_candidates_skills ON candidates USING GIN(skills);
CREATE INDEX idx_job_descriptions_grade ON job_descriptions(ai_suggested_grade);
CREATE INDEX idx_job_descriptions_skills ON job_descriptions USING GIN(skills_required);
CREATE INDEX idx_matching_results_confidence ON matching_results(confidence_score);
CREATE INDEX idx_candidate_matches_score ON candidate_job_matches(match_score);
CREATE INDEX idx_candidate_matches_ai_score ON candidate_job_matches(ai_match_score);
CREATE INDEX idx_ai_feedback_satisfaction ON ai_feedback(user_satisfaction);

-- Create HNSW indexes for vector similarity search (much faster than brute force)
CREATE INDEX idx_candidates_profile_embedding ON candidates USING hnsw (profile_embedding vector_cosine_ops);
CREATE INDEX idx_candidates_skills_embedding ON candidates USING hnsw (skills_embedding vector_cosine_ops);
CREATE INDEX idx_candidates_resume_embedding ON candidates USING hnsw (resume_embedding vector_cosine_ops);
CREATE INDEX idx_job_descriptions_job_embedding ON job_descriptions USING hnsw (job_embedding vector_cosine_ops);
CREATE INDEX idx_job_descriptions_requirements_embedding ON job_descriptions USING hnsw (requirements_embedding vector_cosine_ops);
CREATE INDEX idx_job_descriptions_skills_embedding ON job_descriptions USING hnsw (skills_embedding vector_cosine_ops);
CREATE INDEX idx_user_profiles_preferences_embedding ON user_profiles USING hnsw (preferences_embedding vector_cosine_ops);

-- Insert sample matching results
INSERT INTO matching_results (job_description_id, suggested_internal_grade, level_keyword, confidence_score, experience_range, key_requirements_extracted, reasoning) VALUES
(1, 1, 'Follow', 0.92, '< 1 year', 
ARRAY['Basic programming knowledge', 'Willingness to learn', 'Work under supervision'],
'Entry-level position requiring basic knowledge and supervision - matches Level 1 Junior Technician.'),

(2, 4, 'Enable', 0.87, '3+ years',
ARRAY['3-5 years experience', 'Lead technical decisions', 'Mentor junior developers'],
'Position requires technical leadership and mentoring - aligns with Level 4 Engineer Enable criteria.'),

(3, 5, 'Ensure and advise', 0.91, '5+ years',
ARRAY['5+ years backend experience', 'Architecture decisions', 'Team leadership'],
'Senior role requiring architectural decisions and team leadership - matches Level 5 Senior Engineer.');

-- Insert sample candidate-job matches with vector similarities
INSERT INTO candidate_job_matches (candidate_id, job_description_id, user_id, match_score, experience_match, skills_match, grade_level_match, salary_match, location_match, ai_match_score, profile_similarity, skills_similarity, match_reasoning) VALUES
(1, 1, 'user_1', 0.95, 0.90, 0.85, 1.00, 0.95, 1.00, 0.9234, 0.8876, 0.8543, 'Excellent match - candidate profile perfectly aligns with junior developer requirements'),
(2, 1, 'user_1', 0.78, 0.95, 0.75, 0.80, 0.85, 0.70, 0.7845, 0.7234, 0.7654, 'Good experience match but location preference differs'),
(4, 2, 'user_1', 0.92, 0.90, 0.95, 1.00, 0.88, 0.90, 0.9156, 0.8987, 0.9234, 'Very good match - full-stack experience and mentoring background ideal for this role'),
(5, 3, 'user_1', 0.94, 0.95, 0.92, 1.00, 0.90, 0.95, 0.9345, 0.9123, 0.9087, 'Excellent senior match - strong backend experience aligns perfectly with requirements');

-- Insert sample AI feedback
INSERT INTO ai_feedback (matching_result_id, user_id, correct_grade, feedback_type, feedback_notes, actual_match_quality, ai_accuracy, user_satisfaction, feedback_context) VALUES
(1, 'user_1', 1, 'correct', 'AI correctly identified this as a junior level position', 0.92, 0.95, 5, '{"review_time": "2024-01-15", "reviewer_expertise": "senior_hr"}'),
(2, 'user_1', 4, 'correct', 'Good assessment of technical leadership requirements', 0.87, 0.90, 4, '{"review_time": "2024-01-16", "reviewer_expertise": "technical_lead"}'),
(3, 'user_1', 5, 'correct', 'Accurate senior level classification', 0.91, 0.93, 5, '{"review_time": "2024-01-17", "reviewer_expertise": "engineering_manager"}');

-- Create views for common queries
CREATE VIEW candidate_profile_summary AS
SELECT 
    c.id,
    c.first_name || ' ' || c.last_name as full_name,
    c.email,
    c.years_experience,
    c.current_title,
    c.current_company,
    ig.title as current_grade_title,
    ig.abbreviation as current_grade_abbr,
    tg.title as target_grade_title,
    c.skills,
    c.location,
    c.salary_expectation,
    c.remote_preference
FROM candidates c
LEFT JOIN internal_grades ig ON c.current_grade_level = ig.level_number
LEFT JOIN internal_grades tg ON c.target_grade_level = tg.level_number;

CREATE VIEW job_summary AS
SELECT 
    j.id,
    j.title,
    j.company,
    j.location,
    j.experience_required,
    j.salary_min,
    j.salary_max,
    j.remote_option,
    ig.title as suggested_grade_title,
    ig.abbreviation as suggested_grade_abbr,
    j.skills_required,
    j.ai_confidence_score
FROM job_descriptions j
LEFT JOIN internal_grades ig ON j.ai_suggested_grade = ig.level_number;

-- Function to find similar candidates using vector similarity
CREATE OR REPLACE FUNCTION find_similar_candidates(
    target_embedding vector(1536),
    similarity_threshold float8 DEFAULT 0.7,
    max_results integer DEFAULT 10
)
RETURNS TABLE (
    candidate_id integer,
    full_name text,
    similarity_score float8,
    current_title varchar,
    years_experience decimal
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.first_name || ' ' || c.last_name,
        cosine_similarity(c.profile_embedding, target_embedding),
        c.current_title,
        c.years_experience
    FROM candidates c
    WHERE c.profile_embedding IS NOT NULL
        AND cosine_similarity(c.profile_embedding, target_embedding) >= similarity_threshold
    ORDER BY cosine_similarity(c.profile_embedding, target_embedding) DESC
    LIMIT max_results;
END;
$ LANGUAGE plpgsql;

-- Function to find matching jobs for a candidate using vector similarity
CREATE OR REPLACE FUNCTION find_matching_jobs(
    candidate_id_param integer,
    similarity_threshold float8 DEFAULT 0.6,
    max_results integer DEFAULT 10
)
RETURNS TABLE (
    job_id integer,
    job_title varchar,
    company varchar,
    similarity_score float8,
    salary_range text
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        j.title,
        j.company,
        cosine_similarity(c.profile_embedding, j.job_embedding),
        CASE 
            WHEN j.salary_min IS NOT NULL AND j.salary_max IS NOT NULL 
            THEN ' || j.salary_min || ' -  || j.salary_max
            ELSE 'Not specified'
        END
    FROM candidates c
    CROSS JOIN job_descriptions j
    WHERE c.id = candidate_id_param
        AND c.profile_embedding IS NOT NULL
        AND j.job_embedding IS NOT NULL
        AND cosine_similarity(c.profile_embedding, j.job_embedding) >= similarity_threshold
    ORDER BY cosine_similarity(c.profile_embedding, j.job_embedding) DESC
    LIMIT max_results;
END;
$ LANGUAGE plpgsql;

-- Function to calculate comprehensive match score
CREATE OR REPLACE FUNCTION calculate_match_score(
    candidate_id_param integer,
    job_id_param integer
)
RETURNS TABLE (
    overall_score decimal,
    vector_similarity decimal,
    experience_score decimal,
    grade_compatibility decimal,
    salary_compatibility decimal
) AS $
DECLARE
    candidate_rec candidates%ROWTYPE;
    job_rec job_descriptions%ROWTYPE;
    vector_sim decimal;
    exp_score decimal;
    grade_score decimal;
    salary_score decimal;
    final_score decimal;
BEGIN
    -- Get candidate and job records
    SELECT * INTO candidate_rec FROM candidates WHERE id = candidate_id_param;
    SELECT * INTO job_rec FROM job_descriptions WHERE id = job_id_param;
    
    -- Calculate vector similarity
    IF candidate_rec.profile_embedding IS NOT NULL AND job_rec.job_embedding IS NOT NULL THEN
        vector_sim := cosine_similarity(candidate_rec.profile_embedding, job_rec.job_embedding);
    ELSE
        vector_sim := 0;
    END IF;
    
    -- Calculate experience score (simplified)
    CASE 
        WHEN job_rec.experience_required LIKE '%0-1%' AND candidate_rec.years_experience <= 1 THEN exp_score := 1.0;
        WHEN job_rec.experience_required LIKE '%1-3%' AND candidate_rec.years_experience BETWEEN 1 AND 3 THEN exp_score := 1.0;
        WHEN job_rec.experience_required LIKE '%3-5%' AND candidate_rec.years_experience BETWEEN 3 AND 5 THEN exp_score := 1.0;
        WHEN job_rec.experience_required LIKE '%5+%' AND candidate_rec.years_experience >= 5 THEN exp_score := 1.0;
        ELSE exp_score := 0.5;
    END CASE;
    
    -- Calculate grade compatibility
    IF candidate_rec.target_grade_level = job_rec.ai_suggested_grade THEN
        grade_score := 1.0;
    ELSIF ABS(candidate_rec.target_grade_level - job_rec.ai_suggested_grade) <= 1 THEN
        grade_score := 0.8;
    ELSE
        grade_score := 0.5;
    END IF;
    
    -- Calculate salary compatibility
    IF candidate_rec.salary_expectation IS NULL OR job_rec.salary_max IS NULL THEN
        salary_score := 0.7; -- neutral score when salary info is missing
    ELSIF candidate_rec.salary_expectation <= job_rec.salary_max THEN
        salary_score := 1.0;
    ELSIF candidate_rec.salary_expectation <= job_rec.salary_max * 1.1 THEN
        salary_score := 0.8; -- slight overage acceptable
    ELSE
        salary_score := 0.3;
    END IF;
    
    -- Calculate weighted final score
    final_score := (vector_sim * 0.4 + exp_score * 0.25 + grade_score * 0.25 + salary_score * 0.1);
    
    RETURN QUERY SELECT final_score, vector_sim, exp_score, grade_score, salary_score;
END;
$ LANGUAGE plpgsql;

-- Create a function to update embeddings (placeholder for when you integrate with OpenAI)
CREATE OR REPLACE FUNCTION update_candidate_embeddings(candidate_id_param integer)
RETURNS void AS $
BEGIN
    -- This would typically call an external service to generate embeddings
    -- For now, we'll just generate random embeddings as placeholders
    UPDATE candidates 
    SET 
        profile_embedding = ('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
        skills_embedding = ('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
        experience_embedding = ('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
        resume_embedding = ('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = candidate_id_param;
END;
$ LANGUAGE plpgsql;

-- Insert sample user profile
INSERT INTO user_profiles (user_id, preferences, search_history, personality_traits, career_goals, preferences_embedding, behavior_embedding, personality_embedding) VALUES
('user_1', 
'{"preferred_locations": ["New York", "San Francisco", "Remote"], "salary_min": 70000, "remote_work": true, "company_size": ["startup", "medium"]}',
'{"recent_searches": ["software engineer", "python developer", "remote jobs"], "viewed_jobs": [1, 2, 3], "applied_jobs": [1]}',
'{"work_style": "collaborative", "leadership_interest": "moderate", "learning_orientation": "high", "risk_tolerance": "medium"}',
'Build expertise in full-stack development and eventually move into technical leadership roles',
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector,
('[' || array_to_string(array(select random()::text from generate_series(1, 1536)), ',') || ']')::vector);

-- Create trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_descriptions_updated_at BEFORE UPDATE ON job_descriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Final verification queries
SELECT 'Database setup completed successfully!' as status;
SELECT 'Total candidates: ' || COUNT(*) as candidate_count FROM candidates;
SELECT 'Total jobs: ' || COUNT(*) as job_count FROM job_descriptions;
SELECT 'Total grades: ' || COUNT(*) as grade_count FROM internal_grades;
SELECT 'Vector indexes created: ' || COUNT(*) as vector_index_count 
FROM pg_indexes WHERE indexname LIKE '%embedding%';