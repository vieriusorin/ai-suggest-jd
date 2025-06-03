# Vectorized Job Matching Database

A sophisticated job matching system powered by PostgreSQL with pgvector for semantic similarity search using OpenAI embeddings.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- OpenAI API Key (optional for testing - will use dummy embeddings if not provided)

### Installation

1. **Clone and setup the project:**
```bash
git clone <your-repo>
cd vectorized-job-matching
npm install
```

2. **Setup environment variables:**
```bash
cp .env.example .env
# Edit .env with your settings
```

3. **Start the database:**
```bash
npm run docker:up
```

4. **Wait for database to be ready, then seed with data:**
```bash
npm run db:test  # Test connection
npm run db:seed  # Seed with enhanced data and embeddings
```

5. **Explore your vector database!**

## 🗃️ Database Architecture

### Core Tables
- **`candidates`** - Candidate profiles with vector embeddings
- **`job_descriptions`** - Job postings with vector embeddings  
- **`candidate_job_matches`** - AI-powered matching results
- **`internal_grades`** - Skill level classifications
- **`ai_feedback`** - Human feedback for AI improvement

### Vector Embeddings
Each candidate and job has multiple 1536-dimension OpenAI embeddings:
- **Profile/Job Embedding**: Overall semantic representation
- **Skills Embedding**: Technical skills and competencies
- **Experience/Requirements Embedding**: Experience level and requirements
- **Resume Embedding**: Full resume/job description content

### HNSW Indexes
Optimized vector similarity search using Hierarchical Navigable Small World indexes:
```sql
CREATE INDEX idx_candidates_profile_embedding 
ON candidates USING hnsw (profile_embedding vector_cosine_ops);
```

## 🔍 Key Features

### Vector Similarity Search
```typescript
// Find similar candidates
const similar = await vectorQueries.findSimilarCandidates(
  targetEmbedding, 
  threshold: 0.7, 
  limit: 10
);

// Find matching jobs for a candidate
const matches = await vectorQueries.findMatchingJobsForCandidate(
  candidateId, 
  threshold: 0.6
);
```

### Comprehensive Matching
```typescript
// Multi-vector matching with weights
const matches = await vectorQueries.findComprehensiveMatches(
  candidateId,
  weights: { profile: 0.4, skills: 0.4, experience: 0.2 }
);
```

### AI-Powered Scoring
```typescript
// Detailed match analysis
const score = await vectorQueries.calculateDetailedMatchScore(
  candidateId, 
  jobId
);
```

## 🛠️ Available Scripts

### Database Management
```bash
npm run docker:up        # Start PostgreSQL with pgvector
npm run docker:down      # Stop database
npm run db:reset         # Reset database schema
npm run db:seed          # Seed with sample data + embeddings
npm run db:test          # Test database connection
npm run db:studio        # Open Drizzle Studio (web UI)
```

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run test:vectors     # Test vector operations
npm run analyze:matches  # Analyze matching performance
```

## 📊 Sample Data

The enhanced seed script creates:
- **8 candidates** with realistic profiles and embeddings
- **6 job descriptions** across different skill levels  
- **15+ AI-powered matches** with vector similarity scores
- **Sample feedback data** for AI improvement

### Candidate Examples
- **Alex Johnson** (Junior Developer, Level 1)
- **Maria Rodriguez** (Support Technician, Level 2) 
- **David Chen** (Senior Support, Level 3)
- **Michael Thompson** (Software Engineer, Level 4)
- **Sarah Wilson** (Senior Engineer, Level 5)
- **James Brown** (Principal Consultant, Level 6)
- **Jennifer Davis** (Senior Consultant, Level 7)
- **William Taylor** (Engineering Manager, Level 8)

### Job Examples
- Junior Software Developer (Level 1)
- Full Stack Developer (Level 4)
- Senior Backend Engineer (Level 5)
- Principal Software Architect (Level 6)
- Senior Technical Consultant (Level 7)
- Director of Engineering (Level 8)

## 🔧 Configuration

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://admin:password123@localhost:5433/job_matching
DB_USER=admin
DB_PASSWORD=password123
DB_NAME=job_matching

# OpenAI (optional - uses dummy embeddings if not provided)
OPENAI_API_KEY=your_openai_api_key_here

# Vector Configuration
VECTOR_DIMENSIONS=1536
```

### Docker Configuration
The `docker-compose.yml` sets up:
- PostgreSQL 16 with pgvector extension
- Persistent data storage
- Health checks
- Memory optimization for vector operations

## 🧪 Testing Vector Operations

### Test Similarity Functions
```typescript
import { vectorTestUtils } from './src/utils/vector-utils.js';

// Test embedding generation
await vectorTestUtils.testEmbeddingGeneration();

// Test similarity calculations
vectorTestUtils.testSimilarityCalculation();

// Test candidate embeddings
await vectorTestUtils.testCandidateEmbeddings();
```

### Query Examples
```typescript
// Find top matches
const topMatches = await matchingQueries.getTopMatches(0.8, 10);

// Get vector similarity distribution
const distribution = await analyticsQueries.getVectorSimilarityDistribution();

// Find candidates needing embeddings
const needsEmbeddings = await analyticsQueries.getCandidatesNeedingEmbeddings();
```

## 📈 Vector Similarity Analysis

### Similarity Ranges
- **0.9+**: Excellent match
- **0.8-0.9**: Very good match  
- **0.7-0.8**: Good match
- **0.6-0.7**: Fair match
- **<0.6**: Poor match

### Performance Optimization
- **HNSW indexes** for fast approximate nearest neighbor search
- **Batch embedding generation** with rate limiting
- **Weighted similarity scoring** across multiple embedding types
- **Cosine similarity** optimized for semantic search

## 🔍 Advanced Queries

### Custom SQL Functions
```sql
-- Find similar candidates
SELECT * FROM find_similar_candidates(target_embedding, 0.7, 10);

-- Calculate comprehensive match score  
SELECT * FROM calculate_match_score(candidate_id, job_id);

-- Update embeddings for candidate
SELECT update_candidate_embeddings(candidate_id);
```

### Vector Operations
```sql
-- Direct cosine similarity
SELECT cosine_similarity(vector1, vector2);

-- Find nearest neighbors
SELECT * FROM candidates 
ORDER BY profile_embedding <=> target_embedding 
LIMIT 10;

-- Distance-based filtering
SELECT * FROM candidates 
WHERE profile_embedding <=> target_embedding < 0.3;
```

## 🎯 Use Cases

### For Recruiters
- **Semantic candidate search** based on job requirements
- **AI-powered candidate ranking** with explanation
- **Skills gap analysis** and improvement suggestions
- **Diversity and inclusion** matching insights

### For Candidates  
- **Intelligent job recommendations** based on profile
- **Career progression** guidance
- **Skills development** suggestions
- **Salary and location** compatibility analysis

### For Data Scientists
- **Embedding quality** analysis and optimization
- **Model performance** tracking and improvement  
- **A/B testing** of matching algorithms
- **Bias detection** and fairness analysis

## 🚀 Production Considerations

### Scaling
- **Connection pooling** for high concurrency
- **Read replicas** for analytics queries
- **Embedding caching** for frequently accessed profiles
- **Batch processing** for large-scale matching

### Security
- **API key management** for OpenAI integration
- **Database encryption** at rest and in transit
- **Access controls** for sensitive candidate data
- **Audit logging** for compliance

### Monitoring
- **Vector similarity** distribution tracking
- **Query performance** optimization
- **Embedding generation** cost management
- **Match quality** feedback loops

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure vector operations are efficient
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**Database Connection Failed**
```bash
# Check if Docker is running
docker ps

# Restart database
npm run docker:down
npm run docker:up

# Test connection
npm run db:test
```

**OpenAI API Errors**
- Check API key in `.env`
- Verify API quota and billing
- System will fall back to dummy embeddings if API unavailable

**Slow Vector Queries**
- Ensure HNSW indexes are created
- Check `shared_buffers` PostgreSQL setting
- Consider reducing embedding dimensions for testing

**Memory Issues**
- Increase Docker memory allocation
- Reduce batch sizes for embedding generation
- Use connection pooling

### Performance Tips
- Use HNSW indexes for production vector searches
- Batch embedding generation to respect API limits
- Monitor PostgreSQL memory usage with vectors
- Consider embedding caching for frequently accessed data

---

🎉 **You now have a fully functional vectorized job matching database!** 

Start exploring with `npm run db:studio` to see your data, or dive into the query examples to build your own matching algorithms.