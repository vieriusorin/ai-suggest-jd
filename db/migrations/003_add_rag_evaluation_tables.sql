-- Migration: Add RAG Evaluation and Monitoring Tables
-- Description: Creates tables for tracking search metrics, user feedback, and system performance

-- Table for storing search metrics and performance data
CREATE TABLE IF NOT EXISTS search_metrics (
    id SERIAL PRIMARY KEY,
    query_id VARCHAR(36) UNIQUE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    query TEXT NOT NULL,
    query_type VARCHAR(20) NOT NULL DEFAULT 'general',
    retrieval_method VARCHAR(20) NOT NULL DEFAULT 'vector',
    results_count INTEGER NOT NULL DEFAULT 0,
    avg_match_score DECIMAL(4,3) NOT NULL DEFAULT 0.000,
    top_result_score DECIMAL(4,3) NOT NULL DEFAULT 0.000,
    execution_time_ms INTEGER NOT NULL DEFAULT 0,
    user_feedback JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing user feedback on search results
CREATE TABLE IF NOT EXISTS user_feedback (
    id SERIAL PRIMARY KEY,
    query_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    relevant_candidates JSONB NOT NULL DEFAULT '[]',
    irrelevant_candidates JSONB NOT NULL DEFAULT '[]',
    feedback TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing query variations and expansions
CREATE TABLE IF NOT EXISTS query_expansions (
    id SERIAL PRIMARY KEY,
    original_query TEXT NOT NULL,
    expanded_query TEXT NOT NULL,
    extracted_skills JSONB DEFAULT '[]',
    extracted_requirements JSONB DEFAULT '[]',
    expansion_method VARCHAR(50) NOT NULL DEFAULT 'llm',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table for storing reranking results and explanations
CREATE TABLE IF NOT EXISTS reranking_results (
    id SERIAL PRIMARY KEY,
    query_id VARCHAR(36) NOT NULL,
    candidate_id INTEGER NOT NULL,
    original_score DECIMAL(4,3) NOT NULL,
    rerank_score DECIMAL(4,3) NOT NULL,
    explanation TEXT,
    context_chunks JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_search_metrics_query_id ON search_metrics(query_id);
CREATE INDEX IF NOT EXISTS idx_search_metrics_timestamp ON search_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_search_metrics_query_type ON search_metrics(query_type);
CREATE INDEX IF NOT EXISTS idx_search_metrics_retrieval_method ON search_metrics(retrieval_method);

CREATE INDEX IF NOT EXISTS idx_user_feedback_query_id ON user_feedback(query_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_user_feedback_timestamp ON user_feedback(timestamp);

CREATE INDEX IF NOT EXISTS idx_query_expansions_original_query ON query_expansions USING hash(md5(original_query));
CREATE INDEX IF NOT EXISTS idx_query_expansions_created_at ON query_expansions(created_at);

CREATE INDEX IF NOT EXISTS idx_reranking_results_query_id ON reranking_results(query_id);
CREATE INDEX IF NOT EXISTS idx_reranking_results_candidate_id ON reranking_results(candidate_id);

-- Add foreign key constraints if candidates table exists
-- ALTER TABLE reranking_results ADD CONSTRAINT fk_reranking_candidate 
--     FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE;

-- Add trigger to update search_metrics updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_search_metrics_updated_at 
    BEFORE UPDATE ON search_metrics 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for performance analytics
CREATE OR REPLACE VIEW search_performance_analytics AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as total_queries,
    AVG(execution_time_ms) as avg_response_time,
    AVG(avg_match_score) as avg_relevance_score,
    query_type,
    retrieval_method,
    COUNT(*) FILTER (WHERE user_feedback->>'rating' IS NOT NULL) as queries_with_feedback,
    AVG((user_feedback->>'rating')::INTEGER) FILTER (WHERE user_feedback->>'rating' IS NOT NULL) as avg_user_rating
FROM search_metrics 
WHERE timestamp >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp), query_type, retrieval_method
ORDER BY hour DESC;

-- Create view for user feedback analytics
CREATE OR REPLACE VIEW user_feedback_analytics AS
SELECT 
    query_type,
    retrieval_method,
    AVG(rating) as avg_rating,
    COUNT(*) as total_feedback,
    COUNT(*) FILTER (WHERE rating >= 4) as positive_feedback,
    COUNT(*) FILTER (WHERE rating <= 2) as negative_feedback,
    AVG(JSONB_ARRAY_LENGTH(relevant_candidates)) as avg_relevant_candidates,
    AVG(JSONB_ARRAY_LENGTH(irrelevant_candidates)) as avg_irrelevant_candidates
FROM user_feedback uf
JOIN search_metrics sm ON uf.query_id = sm.query_id
WHERE uf.timestamp >= NOW() - INTERVAL '7 days'
GROUP BY query_type, retrieval_method
ORDER BY avg_rating DESC;

-- Insert sample data for testing (optional)
-- INSERT INTO search_metrics (query_id, query, query_type, retrieval_method, results_count, avg_match_score, top_result_score, execution_time_ms)
-- VALUES 
--     ('test-001', 'Senior JavaScript developer with React experience', 'technical', 'hybrid', 15, 0.850, 0.920, 1250),
--     ('test-002', 'Python backend engineer 5+ years experience', 'technical', 'vector', 12, 0.780, 0.890, 980),
--     ('test-003', 'Remote data scientist with machine learning skills', 'technical', 'hybrid', 8, 0.720, 0.810, 1450);

COMMENT ON TABLE search_metrics IS 'Stores performance metrics and metadata for each search query';
COMMENT ON TABLE user_feedback IS 'Stores user ratings and feedback on search result quality';
COMMENT ON TABLE query_expansions IS 'Stores query expansion and enhancement data for analysis';
COMMENT ON TABLE reranking_results IS 'Stores reranking scores and explanations for search results';
COMMENT ON VIEW search_performance_analytics IS 'Aggregated performance metrics for monitoring and optimization';
COMMENT ON VIEW user_feedback_analytics IS 'User satisfaction metrics grouped by search characteristics'; 