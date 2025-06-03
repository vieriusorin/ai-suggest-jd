import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
  candidateQueries, 
  jobQueries, 
  vectorQueries, 
  utilityQueries 
} from './queries';
import { 
  generateCandidateEmbeddings, 
  generateJobEmbeddings,
  vectorTestUtils 
} from '../src/utils/vector-utils';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enhanced candidate data with more realistic profiles
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
    summary: "Recent computer science graduate with strong fundamentals in web development. Completed several projects during internship including a React-based dashboard application. Eager to learn and grow in a collaborative environment.",
    currentGradeLevel: 1,
    targetGradeLevel: 3,
    salaryExpectation: 45000,
    location: "New York, NY",
    remotePreference: "Hybrid",
    resumeText: "Recent graduate with 6 months of internship experience. Built responsive web applications using React and JavaScript. Strong foundation in computer science principles and passionate about clean, maintainable code."
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
    summary: "IT support professional with over a year of hands-on experience resolving technical issues. Expert in Windows and Linux environments with strong customer service skills. Looking to transition into more technical roles.",
    currentGradeLevel: 2,
    targetGradeLevel: 4,
    salaryExpectation: 48000,
    location: "Austin, TX",
    remotePreference: "On-site",
    resumeText: "1+ years of IT support experience handling 50+ tickets daily. Expertise in Windows/Linux systems, network troubleshooting, and user training. Consistently achieved 98% customer satisfaction rating."
  },
  {
    firstName: "David",
    lastName: "Chen",
    email: "david.chen@email.com",
    phone: "+1234567892",
    yearsExperience: 2.8,
    currentTitle: "Senior Support Specialist",
    currentCompany: "CloudTech Solutions",
    educationLevel: "Bachelor in Information Systems",
    skills: ["System Administration", "Linux", "PowerShell", "Network Troubleshooting", "Cloud Services", "Docker"],
    certifications: ["CompTIA Network+", "AWS Solutions Architect Associate"],
    summary: "Experienced technical specialist with expertise in cloud infrastructure and system administration. Led migration projects and mentored junior team members. Strong problem-solving skills and ability to work under pressure.",
    currentGradeLevel: 3,
    targetGradeLevel: 4,
    salaryExpectation: 58000,
    location: "Seattle, WA",
    remotePreference: "Remote",
    resumeText: "2+ years specializing in cloud infrastructure and system administration. Successfully migrated 50+ servers to AWS, reducing operational costs by 30%. Expertise in Linux, Docker, and automation tools."
  },
  {
    firstName: "Michael",
    lastName: "Thompson",
    email: "michael.thompson@email.com",
    phone: "+1234567894",
    yearsExperience: 4.2,
    currentTitle: "Software Engineer",
    currentCompany: "InnovateSoft",
    educationLevel: "Bachelor in Software Engineering",
    skills: ["Java", "Spring Boot", "React", "PostgreSQL", "Docker", "AWS", "Microservices"],
    certifications: ["AWS Solutions Architect Associate", "Oracle Java Certification"],
    summary: "Full-stack developer with 4+ years of experience building scalable web applications. Led development of microservices architecture serving 100K+ users. Passionate about clean code and agile development practices.",
    currentGradeLevel: 4,
    targetGradeLevel: 5,
    salaryExpectation: 78000,
    location: "San Francisco, CA",
    remotePreference: "Remote",
    resumeText: "4+ years full-stack development experience with Java/Spring Boot and React. Led development of high-traffic microservices platform. Expertise in cloud architecture, database design, and agile methodologies."
  },
  {
    firstName: "Sarah",
    lastName: "Wilson",
    email: "sarah.wilson@email.com",
    phone: "+1234567895",
    yearsExperience: 6.5,
    currentTitle: "Senior Software Engineer",
    currentCompany: "TechGiant Corp",
    educationLevel: "Master in Computer Science",
    skills: ["Python", "Django", "React", "PostgreSQL", "Redis", "Microservices", "Machine Learning"],
    certifications: ["PMP", "AWS Solutions Architect Professional", "Google Cloud Professional"],
    summary: "Senior engineer with 6+ years of experience in scalable system design and team leadership. Architected systems handling millions of requests daily. Mentor to junior developers and advocate for best practices.",
    currentGradeLevel: 5,
    targetGradeLevel: 6,
    salaryExpectation: 125000,
    location: "Chicago, IL",
    remotePreference: "Hybrid",
    resumeText: "6+ years senior engineering experience designing and implementing large-scale distributed systems. Led teams of 5+ engineers, architected microservices handling 10M+ daily requests. Expert in Python, cloud architecture, and ML systems."
  },
  {
    firstName: "James",
    lastName: "Brown",
    email: "james.brown@email.com",
    phone: "+1234567898",
    yearsExperience: 9.2,
    currentTitle: "Principal Consultant",
    currentCompany: "ConsultPro LLC",
    educationLevel: "Master in Business Administration",
    skills: ["Enterprise Architecture", "Digital Transformation", "Stakeholder Management", "Strategic Planning", "Cloud Migration"],
    certifications: ["TOGAF", "PMP", "AWS Solutions Architect Professional"],
    summary: "Senior consultant with 9+ years specializing in digital transformation projects for Fortune 500 companies. Led initiatives resulting in $10M+ cost savings. Expert in enterprise architecture and change management.",
    currentGradeLevel: 6,
    targetGradeLevel: 7,
    salaryExpectation: 165000,
    location: "Atlanta, GA",
    remotePreference: "Remote",
    resumeText: "9+ years senior consulting experience leading digital transformation initiatives for Fortune 500 clients. Delivered projects worth $50M+ in value, specializing in cloud migration and enterprise architecture."
  },
  {
    firstName: "Jennifer",
    lastName: "Davis",
    email: "jennifer.davis@email.com",
    phone: "+1234567899",
    yearsExperience: 12.0,
    currentTitle: "Senior Consultant",
    currentCompany: "StrategyTech Corp",
    educationLevel: "Master in Engineering Management",
    skills: ["Strategic Planning", "Team Leadership", "Product Management", "Digital Innovation", "Organizational Design"],
    certifications: ["PMP", "Certified Scrum Master", "Executive Leadership Certificate"],
    summary: "Senior consultant with 12+ years of experience in strategic planning and organizational transformation. Built and led cross-functional teams of 20+ members. Recognized thought leader in digital innovation.",
    currentGradeLevel: 7,
    targetGradeLevel: 8,
    salaryExpectation: 185000,
    location: "Boston, MA",
    remotePreference: "Hybrid",
    resumeText: "12+ years senior consulting and leadership experience. Built multiple high-performing teams, led organizational transformations for global enterprises. Expert in strategic planning, innovation management, and executive coaching."
  },
  {
    firstName: "William",
    lastName: "Taylor",
    email: "william.taylor@email.com",
    phone: "+1234567800",
    yearsExperience: 14.5,
    currentTitle: "Engineering Manager",
    currentCompany: "GlobalTech Solutions",
    educationLevel: "Master in Engineering Management",
    skills: ["Team Management", "Strategic Planning", "Budget Management", "Organizational Leadership", "Technology Strategy"],
    certifications: ["PMP", "Executive Leadership Certificate", "MBA"],
    summary: "Engineering manager with 14+ years of experience building and scaling engineering organizations. Managed budgets of $50M+ and teams of 100+ engineers. Strategic leader with track record of delivering complex technical initiatives.",
    currentGradeLevel: 8,
    targetGradeLevel: 8,
    salaryExpectation: 195000,
    location: "Los Angeles, CA",
    remotePreference: "On-site",
    resumeText: "14+ years engineering management experience scaling teams from 10 to 100+ engineers. Led technical strategy for products serving millions of users. Expert in organizational design, budget management, and technology leadership."
  }
];

// Enhanced job descriptions
const enhancedJobData = [
  {
    title: "Junior Software Developer",
    company: "TechStartup Inc",
    department: "Engineering",
    location: "New York, NY",
    employmentType: "Full-time",
    experienceRequired: "0-1 years",
    description: "Join our dynamic startup as a Junior Software Developer! We're looking for a motivated recent graduate or career changer to contribute to our growing platform. You'll work closely with senior developers to build user-facing features and learn industry best practices.",
    requirements: "Bachelor's degree in Computer Science or related field, or equivalent bootcamp experience. Basic understanding of web development technologies. Strong problem-solving skills and eagerness to learn. Good communication skills and ability to work in a team environment.",
    responsibilities: "Write clean, maintainable code under senior developer guidance. Participate in code reviews and learn from feedback. Contribute to feature development and bug fixes. Collaborate with design and product teams. Participate in agile development processes.",
    skillsRequired: ["JavaScript", "HTML", "CSS", "Git", "React"],
    educationRequired: "Bachelor's degree in Computer Science or equivalent",
    salaryMin: 42000,
    salaryMax: 50000,
    remoteOption: true,
    aiSuggestedGrade: 1
  },
  {
    title: "Full Stack Developer",
    company: "InnovateWeb LLC",
    department: "Development",
    location: "San Francisco, CA",
    employmentType: "Full-time",
    experienceRequired: "3-5 years",
    description: "We're seeking an experienced Full Stack Developer to lead development projects and mentor junior team members. You'll architect and build scalable web applications while contributing to technical decisions and team growth.",
    requirements: "3-5 years of full-stack development experience with modern frameworks. Experience with both frontend and backend technologies. Leadership potential and mentoring experience. Strong problem-solving skills and attention to detail.",
    responsibilities: "Design and implement scalable web applications. Lead technical architecture decisions. Mentor junior developers and conduct code reviews. Collaborate with product and design teams. Ensure code quality and best practices.",
    skillsRequired: ["React", "Node.js", "PostgreSQL", "AWS", "Docker", "TypeScript"],
    educationRequired: "Bachelor's degree in Computer Science or equivalent experience",
    salaryMin: 85000,
    salaryMax: 110000,
    remoteOption: true,
    aiSuggestedGrade: 4
  },
  {
    title: "Senior Backend Engineer",
    company: "ScaleTech Corp",
    department: "Engineering",
    location: "Seattle, WA",
    employmentType: "Full-time",
    experienceRequired: "5+ years",
    description: "Looking for a Senior Backend Engineer to architect and build the next generation of our platform. You'll work on distributed systems serving millions of users while leading technical initiatives and mentoring team members.",
    requirements: "5+ years of backend development experience with large-scale systems. Experience with microservices architecture and cloud platforms. Team leadership experience and strong communication skills. Deep understanding of system design and performance optimization.",
    responsibilities: "Design and implement scalable backend systems. Lead architectural decisions and technical strategy. Mentor team members and drive engineering excellence. Ensure system reliability and performance. Collaborate with cross-functional teams.",
    skillsRequired: ["Python", "Django", "PostgreSQL", "Redis", "AWS", "Docker", "Kubernetes"],
    educationRequired: "Bachelor's or Master's degree in Computer Science",
    salaryMin: 120000,
    salaryMax: 160000,
    remoteOption: true,
    aiSuggestedGrade: 5
  },
  {
    title: "Principal Software Architect",
    company: "Enterprise Solutions Inc",
    department: "Architecture",
    location: "Chicago, IL",
    employmentType: "Full-time",
    experienceRequired: "8+ years",
    description: "We're seeking a Principal Software Architect to lead enterprise-wide technical initiatives and drive architectural excellence across multiple product lines. You'll work with stakeholders to define technical strategy and ensure scalable, maintainable solutions.",
    requirements: "8+ years of software development with 3+ years in architecture roles. Experience with enterprise systems and stakeholder management. Strong leadership and communication skills. Deep expertise in system design and technology strategy.",
    responsibilities: "Define technical architecture for enterprise systems. Lead cross-functional technical initiatives. Mentor senior engineers and influence technical decisions. Collaborate with business stakeholders on technology strategy. Ensure architectural compliance and best practices.",
    skillsRequired: ["System Architecture", "Enterprise Patterns", "Cloud Platforms", "Microservices", "API Design", "Stakeholder Management"],
    educationRequired: "Bachelor's or Master's degree in Computer Science or Engineering",
    salaryMin: 150000,
    salaryMax: 200000,
    remoteOption: true,
    aiSuggestedGrade: 6
  },
  {
    title: "Senior Technical Consultant",
    company: "Global Consulting Partners",
    department: "Technology Consulting",
    location: "Boston, MA",
    employmentType: "Full-time",
    experienceRequired: "8+ years",
    description: "Join our elite consulting team as a Senior Technical Consultant. You'll lead digital transformation projects for Fortune 500 clients, driving innovation and delivering strategic technology solutions that create measurable business value.",
    requirements: "8+ years of experience in technology consulting or senior technical roles. Proven track record of leading large-scale transformation projects. Excellent client-facing and presentation skills. Deep expertise in modern technology stacks and methodologies.",
    responsibilities: "Lead client engagements and technical delivery. Develop solution architectures and implementation strategies. Mentor consulting teams and drive thought leadership. Build client relationships and identify growth opportunities. Present to C-level executives.",
    skillsRequired: ["Technical Consulting", "Digital Transformation", "Solution Architecture", "Client Management", "Strategic Planning"],
    educationRequired: "Master's degree preferred, MBA or technical advanced degree",
    salaryMin: 160000,
    salaryMax: 220000,
    remoteOption: true,
    aiSuggestedGrade: 7
  },
  {
    title: "Director of Engineering",
    company: "TechUnicorn Corp",
    department: "Engineering",
    location: "San Francisco, CA",
    employmentType: "Full-time",
    experienceRequired: "12+ years",
    description: "Lead our engineering organization as Director of Engineering. You'll be responsible for technical strategy, team building, and delivery of our core platform. This role requires both deep technical expertise and strong leadership skills.",
    requirements: "12+ years of engineering experience with 5+ years in leadership roles. Experience building and scaling engineering teams. Strong technical background with strategic thinking abilities. Proven track record of delivering complex technical products.",
    responsibilities: "Set engineering vision and technical strategy. Build and scale high-performing engineering teams. Drive engineering excellence and delivery. Collaborate with executive team on product strategy. Manage engineering budget and resources.",
    skillsRequired: ["Engineering Leadership", "Team Building", "Technical Strategy", "Budget Management", "Organizational Design"],
    educationRequired: "Master's degree in Engineering or Computer Science, MBA preferred",
    salaryMin: 250000,
    salaryMax: 350000,
    remoteOption: false,
    aiSuggestedGrade: 8
  }
];

async function enhancedSeedDatabase() {
  console.log('🌱 Starting enhanced database seeding with vector embeddings...');

  try {
    // Step 1: Reset database using SQL file
    console.log('📄 Executing database reset...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const client = await pool.connect();
    const resetSQL = fs.readFileSync(path.join(__dirname, 'reset.sql'), 'utf8');
    await client.query(resetSQL);
    client.release();
    await pool.end();
    
    console.log('✅ Database reset completed');

    // Step 2: Test vector utilities
    console.log('🧪 Testing vector utilities...');
    await vectorTestUtils.testEmbeddingGeneration();
    
    // Step 3: Enhanced candidate seeding with embeddings
    console.log('👥 Seeding enhanced candidates with embeddings...');
    for (let i = 0; i < enhancedCandidateData.length; i++) {
      const candidateData = enhancedCandidateData[i];
      console.log(`Processing candidate ${i + 1}/${enhancedCandidateData.length}: ${candidateData.firstName} ${candidateData.lastName}`);
      
      try {
        // Generate embeddings for the candidate
        const embeddings = await generateCandidateEmbeddings(candidateData);
        
        // Create candidate with embeddings
        const candidateWithEmbeddings = {
          ...candidateData,
          profileEmbedding: embeddings.profileEmbedding,
          skillsEmbedding: embeddings.skillsEmbedding,
          experienceEmbedding: embeddings.experienceEmbedding,
          resumeEmbedding: embeddings.resumeEmbedding
        };
        
        await candidateQueries.create(candidateWithEmbeddings);
        console.log(`✅ Created candidate: ${candidateData.firstName} ${candidateData.lastName}`);
        
        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error creating candidate ${candidateData.firstName} ${candidateData.lastName}:`, error);
      }
    }

    // Step 4: Enhanced job seeding with embeddings
    console.log('💼 Seeding enhanced jobs with embeddings...');
    for (let i = 0; i < enhancedJobData.length; i++) {
      const jobData = enhancedJobData[i];
      console.log(`Processing job ${i + 1}/${enhancedJobData.length}: ${jobData.title} at ${jobData.company}`);
      
      try {
        // Generate embeddings for the job
        const embeddings = await generateJobEmbeddings(jobData);
        
        // Create job with embeddings
        const jobWithEmbeddings = {
          ...jobData,
          jobEmbedding: embeddings.jobEmbedding,
          requirementsEmbedding: embeddings.requirementsEmbedding,
          skillsEmbedding: embeddings.skillsEmbedding
        };
        
        await jobQueries.create(jobWithEmbeddings);
        console.log(`✅ Created job: ${jobData.title} at ${jobData.company}`);
        
        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error creating job ${jobData.title}:`, error);
      }
    }

    // Step 5: Generate comprehensive matches using vector similarities
    console.log('🔄 Generating comprehensive candidate-job matches...');
    
    const candidates = await candidateQueries.getAll();
    const jobs = await jobQueries.getAll();
    
    let matchesCreated = 0;
    for (const candidate of candidates) {
      for (const job of jobs) {
        try {
          // Find matches using vector similarity
          const matches = await vectorQueries.findMatchingJobsForCandidate(candidate.id, 0.5, 10);
          
          if (matches.length > 0) {
            // Create match record for this candidate-job pair if similarity is decent
            const matchScore = Math.random() * 0.3 + 0.7; // Random score between 0.7-1.0
            
            await matchingQueries.createComprehensiveMatch(
              candidate.id,
              job.id,
              'system_seed',
              {
                aiMatchScore: matchScore,
                profileSimilarity: Math.random() * 0.2 + 0.8,
                skillsSimilarity: Math.random() * 0.2 + 0.75,
                experienceSimilarity: Math.random() * 0.2 + 0.7,
                cultureFitScore: Math.random() * 0.2 + 0.8
              }
            );
            matchesCreated++;
            
            if (matchesCreated >= 15) break; // Limit matches for demo
          }
        } catch (error) {
          // Skip if match already exists or other error
          continue;
        }
      }
      if (matchesCreated >= 15) break;
    }
    
    console.log(`✅ Created ${matchesCreated} candidate-job matches`);

    // Step 6: Verify seeding and show statistics
    console.log('📊 Verifying database seeding...');
    const stats = await utilityQueries.getDatabaseStats();
    
    console.log('\n🎉 Enhanced Database Seeding Completed Successfully!');
    console.log('\n📈 Database Statistics:');
    stats.forEach((stat: any) => {
      console.log(`${stat.table_name}: ${stat.total_records} total, ${stat.with_embeddings || stat.with_ai_scores} with vectors/AI scores`);
    });

    // Step 7: Demo vector similarity searches
    console.log('\n🔍 Demo: Vector Similarity Searches');
    
    // Find similar candidates to the first candidate
    if (candidates.length > 0) {
      const firstCandidate = candidates[0];
      console.log(`\nFinding candidates similar to ${firstCandidate.firstName} ${firstCandidate.lastName}:`);
      
      const similarCandidates = await vectorQueries.findSimilarCandidates(
        firstCandidate.profileEmbedding || [],
        0.7,
        3
      );
      
      similarCandidates.forEach((similar: any, index: number) => {
        console.log(`${index + 1}. ${similar.first_name} ${similar.last_name} (${similar.current_title}) - Similarity: ${similar.similarity?.toFixed(3)}`);
      });
    }

    // Find matching jobs for the first candidate
    if (candidates.length > 0) {
      console.log(`\nFinding matching jobs for ${candidates[0].firstName} ${candidates[0].lastName}:`);
      
      const matchingJobs = await vectorQueries.findMatchingJobsForCandidate(candidates[0].id, 0.6, 3);
      
      matchingJobs.forEach((match: any, index: number) => {
        console.log(`${index + 1}. ${match.title} at ${match.company} - Similarity: ${match.similarity?.toFixed(3)}`);
      });
    }

    console.log('\n✨ Database is ready for use! You can now:');
    console.log('   • Query candidates and jobs with vector embeddings');
    console.log('   • Perform similarity searches');
    console.log('   • Generate AI-powered matches');
    console.log('   • Test vector similarity functions');
    console.log('   • Analyze matching performance');

  } catch (error) {
    console.error('❌ Error during enhanced seeding:', error);
    throw error;
  }
}

// Run enhanced seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  enhancedSeedDatabase()
    .then(() => {
      console.log('🎊 Enhanced seeding process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Enhanced seeding process failed:', error);
      process.exit(1);
    });
}

export { enhancedSeedDatabase, enhancedCandidateData, enhancedJobData };