// Enhanced debug version of the seed script
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test the enhanced candidate data from the original file
const enhancedCandidateData = [
  {
    firstName: "Alex",
    lastName: "Johnson",
    email: "alex.johnson@email.com",
    phone: "+1234567890",
    yearsExperience: 0.5,
    currentTitle: "Junior Developer",
    currentCompany: "TechStart Inc",
    educationLevel: "Bachelor in Computer Science",
    skills: ["JavaScript", "HTML", "CSS", "React", "Git"],
    certifications: ["AWS Cloud Practitioner"],
    summary: "Recent computer science graduate with strong fundamentals in web development.",
    currentGradeLevel: 1,
    targetGradeLevel: 3,
    salaryExpectation: 45000,
    location: "New York, NY",
    remotePreference: "Hybrid",
    resumeText: "Recent graduate with 6 months of internship experience."
  },
  {
    firstName: "Maria",
    lastName: "Rodriguez",
    email: "maria.rodriguez@email.com",
    phone: "+1234567891",
    yearsExperience: 1.2,
    currentTitle: "Support Technician",
    currentCompany: "DataCorp",
    educationLevel: "Associate Degree in IT",
    skills: ["Help Desk", "Windows", "Linux", "Networking", "Office 365", "Troubleshooting"],
    certifications: ["CompTIA A+", "ITIL Foundation"],
    summary: "IT support professional with over a year of hands-on experience.",
    currentGradeLevel: 2,
    targetGradeLevel: 4,
    salaryExpectation: 48000,
    location: "Austin, TX",
    remotePreference: "On-site",
    resumeText: "1+ years of IT support experience handling 50+ tickets daily."
  }
];

const enhancedJobData = [
  {
    title: "Junior Software Developer",
    company: "TechStartup Inc",
    department: "Engineering",
    location: "New York, NY",
    employmentType: "Full-time",
    experienceRequired: "0-1 years",
    description: "Join our dynamic startup as a Junior Software Developer!",
    requirements: "Bachelor's degree in Computer Science or related field.",
    responsibilities: "Write clean, maintainable code under senior developer guidance.",
    skillsRequired: ["JavaScript", "HTML", "CSS", "Git", "React"],
    educationRequired: "Bachelor's degree in Computer Science or equivalent",
    salaryMin: 42000,
    salaryMax: 50000,
    remoteOption: true,
    aiSuggestedGrade: 1
  }
];

async function enhancedSeedDebug() {
  console.log('🌱 Starting enhanced database seeding with debugging...');

  try {
    // Step 1: Reset database
    console.log('📄 Executing database reset...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const client = await pool.connect();
    
    try {
      const resetSQL = fs.readFileSync(path.join(__dirname, 'reset.sql'), 'utf8');
      await client.query(resetSQL);
      console.log('✅ Database reset completed');
    } catch (resetError) {
      console.error('❌ Error during database reset:', resetError);
      throw resetError;
    }
    
    client.release();
    await pool.end();
    
    // Step 2: Test imports
    console.log('📦 Testing imports...');
    try {
      const { candidateQueries, jobQueries, utilityQueries } = await import('./queries.js');
      console.log('✅ Queries imported successfully');
      
      // Test if we can call a simple query
      const candidates = await candidateQueries.getAll();
      console.log('✅ candidateQueries.getAll() works, found:', candidates.length, 'candidates');
      
    } catch (importError) {
      console.error('❌ Error importing queries:', importError);
      throw importError;
    }
    
    // Step 3: Test vector utilities import
    console.log('🧪 Testing vector utilities...');
    try {
      const vectorUtils = await import('../src/utils/vector-utils.js');
      console.log('✅ Vector utils imported');
      
      // Check what functions are available
      console.log('Available functions:', Object.keys(vectorUtils));
      
      if (vectorUtils.generateCandidateEmbeddings) {
        console.log('✅ generateCandidateEmbeddings function exists');
        
        // Test with minimal data
        console.log('🧪 Testing embedding generation...');
        try {
          const testCandidate = enhancedCandidateData[0];
          const embeddings = await vectorUtils.generateCandidateEmbeddings(testCandidate);
          console.log('✅ Embedding generation successful');
          console.log('Embedding dimensions:', {
            profile: embeddings.profileEmbedding?.length,
            skills: embeddings.skillsEmbedding?.length,
            experience: embeddings.experienceEmbedding?.length,
            resume: embeddings.resumeEmbedding?.length
          });
        } catch (embeddingError) {
          console.error('❌ Error generating embeddings:', embeddingError.message);
          console.log('💡 This might be an OpenAI API issue. Let\'s continue without embeddings...');
        }
      } else {
        console.log('❌ generateCandidateEmbeddings function not found');
      }
      
    } catch (vectorError) {
      console.error('❌ Error with vector utilities:', vectorError);
      console.log('💡 Continuing without vector embeddings...');
    }
    
    // Step 4: Try manual data insertion
    console.log('👥 Testing manual candidate insertion...');
    try {
      const { candidateQueries, jobQueries } = await import('./queries.js');
      
      // Insert candidates without embeddings first
      const candidateWithoutEmbeddings = {
        ...enhancedCandidateData[0],
        // Remove embeddings for now
        profileEmbedding: null,
        skillsEmbedding: null,
        experienceEmbedding: null,
        resumeEmbedding: null
      };
      
      const candidateResult = await candidateQueries.create(candidateWithoutEmbeddings);
      console.log('✅ Manual candidate insertion successful:', candidateResult[0]?.firstName);
      
      // Insert jobs without embeddings
      console.log('💼 Testing manual job insertion...');
      const jobWithoutEmbeddings = {
        ...enhancedJobData[0],
        // Remove embeddings for now
        jobEmbedding: null,
        requirementsEmbedding: null,
        skillsEmbedding: null
      };
      
      const jobResult = await jobQueries.create(jobWithoutEmbeddings);
      console.log('✅ Manual job insertion successful:', jobResult[0]?.title);
      
    } catch (insertError) {
      console.error('❌ Error inserting data:', insertError.message);
      console.error('Full error:', insertError);
    }
    
    // Step 5: Check what data exists now
    console.log('📊 Checking final data state...');
    const pool2 = new Pool({ connectionString: process.env.DATABASE_URL });
    const client2 = await pool2.connect();
    
    try {
      const candidatesCount = await client2.query('SELECT COUNT(*) FROM candidates');
      const jobsCount = await client2.query('SELECT COUNT(*) FROM job_descriptions');
      const gradesCount = await client2.query('SELECT COUNT(*) FROM internal_grades');
      
      console.log('Final counts:');
      console.log('Candidates:', candidatesCount.rows[0].count);
      console.log('Jobs:', jobsCount.rows[0].count);
      console.log('Grades:', gradesCount.rows[0].count);
      
      if (candidatesCount.rows[0].count > 0) {
        const sampleCandidate = await client2.query('SELECT first_name, last_name, email FROM candidates LIMIT 1');
        console.log('Sample candidate:', sampleCandidate.rows[0]);
      }
      
    } finally {
      client2.release();
      await pool2.end();
    }
    
    console.log('\n✨ Enhanced seed debugging completed!');

  } catch (error) {
    console.error('❌ Error during enhanced seeding:', error);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run enhanced seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enhancedSeedDebug()
    .then(() => {
      console.log('🎊 Enhanced seeding debug completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Enhanced seeding debug failed:', error);
      process.exit(1);
    });
}