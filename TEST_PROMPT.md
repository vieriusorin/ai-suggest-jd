# Test Prompt for Candidate Search - Seed Data Testing

## Overview
This test prompt is designed to work with your specific seed data containing:
- **Alex Johnson**: Junior Developer (0.5 years experience, JavaScript/React skills)
- **Maria Rodriguez**: Support Technician (1.2 years experience, IT support skills)

## Test Case 1: Perfect Match for Alex Johnson

**Job Description:**
```
Position: Junior Software Developer
Company: TechStartup Inc
Location: New York, NY
Employment Type: Full-time

We are looking for a Junior Software Developer to join our dynamic startup team. This is an excellent opportunity for a recent graduate or someone with minimal professional experience to grow their career in software development.

Key Responsibilities:
- Write clean, maintainable code under senior developer guidance
- Collaborate with the development team on web applications
- Participate in code reviews and learn best practices
- Debug and troubleshoot application issues
- Assist in testing and quality assurance processes

Required Skills & Experience:
- 0-1 years of professional software development experience
- Strong fundamentals in JavaScript, HTML, and CSS
- Experience with React framework
- Familiarity with Git version control
- Bachelor's degree in Computer Science or related field
- Willingness to learn and grow in a fast-paced environment

Preferred Qualifications:
- Any cloud platform experience (AWS preferred)
- Understanding of responsive web design
- Previous internship or project experience

What We Offer:
- Salary range: $42,000 - $50,000
- Remote and hybrid work options available
- Mentorship from senior developers
- Career growth opportunities
```

**Search Parameters:**
- Experience Level: "junior"
- Required Skills: ["JavaScript", "HTML", "CSS", "React", "Git"]
- Location: "New York, NY"
- Max Results: 5

**Expected Result:** Alex Johnson should be the top match with high similarity scores.

---

## Test Case 2: IT Support Role for Maria Rodriguez

**Job Description:**
```
Position: IT Support Specialist
Company: TechCorp Solutions
Location: Austin, TX
Employment Type: Full-time

We are seeking an experienced IT Support Specialist to join our growing IT department. The ideal candidate will have hands-on experience in troubleshooting, customer service, and maintaining IT infrastructure.

Key Responsibilities:
- Provide technical support via help desk tickets and phone calls
- Troubleshoot Windows and Linux operating system issues
- Manage Office 365 administration and user accounts
- Support networking issues and connectivity problems
- Document solutions and maintain knowledge base
- Escalate complex issues to senior IT staff

Required Skills & Experience:
- 1-3 years of IT support or help desk experience
- Strong knowledge of Windows and Linux operating systems
- Experience with Office 365 administration
- Understanding of networking fundamentals
- Excellent troubleshooting and problem-solving skills
- Customer service oriented with good communication skills

Preferred Qualifications:
- CompTIA A+ certification
- ITIL Foundation certification
- Experience with ticketing systems
- Associate degree in IT or related field

What We Offer:
- Competitive salary: $45,000 - $55,000
- On-site position with structured work environment
- Professional development opportunities
- Health and dental benefits
```

**Search Parameters:**
- Experience Level: "junior"
- Required Skills: ["Help Desk", "Windows", "Linux", "Office 365", "Troubleshooting"]
- Location: "Austin, TX"
- Max Results: 5

**Expected Result:** Maria Rodriguez should be the top match.

---

## Test Case 3: Cross-Skills Search (Both Candidates)

**Job Description:**
```
Position: Technical Support Developer
Company: InnovateTech
Location: Remote
Employment Type: Full-time

We're looking for a unique role that combines technical support with basic development skills. Perfect for someone who wants to bridge the gap between support and development.

Key Responsibilities:
- Provide technical support for software applications
- Write simple scripts and tools to automate support tasks
- Debug basic application issues
- Document technical processes and solutions
- Collaborate with both support and development teams

Required Skills & Experience:
- 1-2 years of experience in tech-related role
- Basic programming knowledge (JavaScript preferred)
- Experience with troubleshooting and problem-solving
- Customer service or support experience
- Willingness to learn both technical and development skills

What We Offer:
- Salary range: $45,000 - $60,000
- Fully remote position
- Cross-functional learning opportunities
```

**Search Parameters:**
- Experience Level: "junior"
- Required Skills: ["JavaScript", "Troubleshooting"]
- Location: null (remote)
- Max Results: 10

**Expected Result:** Both candidates should appear, with different strengths highlighted.

---

## Test Case 4: No Match Scenario

**Job Description:**
```
Position: Senior DevOps Engineer
Company: CloudTech Enterprise
Location: San Francisco, CA

We need a Senior DevOps Engineer with extensive cloud infrastructure experience.

Required Skills & Experience:
- 5+ years of DevOps experience
- Expert-level AWS, Docker, Kubernetes
- Infrastructure as Code (Terraform, CloudFormation)
- CI/CD pipeline management
- Python and Go programming
```

**Search Parameters:**
- Experience Level: "senior"
- Required Skills: ["AWS", "Docker", "Kubernetes", "Terraform", "Python"]
- Location: "San Francisco, CA"
- Max Results: 5

**Expected Result:** No candidates should match (or very low scores).

---

## Test Case 5: Location Flexibility Test

**Job Description:**
```
Position: Remote JavaScript Developer
Company: GlobalTech
Location: Remote

We're hiring a JavaScript developer for remote work. Open to candidates from anywhere.

Required Skills & Experience:
- 0-2 years of JavaScript experience
- HTML, CSS knowledge
- Git version control
- Remote work capability
```

**Search Parameters:**
- Experience Level: "junior"
- Required Skills: ["JavaScript", "HTML", "CSS", "Git"]
- Location: null (remote)
- Max Results: 10

**Expected Result:** Alex Johnson should match well due to skills alignment.

---

## Validation Questions

After running each test, check:

1. **Match Accuracy**: Are the right candidates appearing for each job?
2. **Score Analysis**: Do the similarity scores make sense based on the job requirements?
3. **Filtering**: Are experience level and location filters working correctly?
4. **Skills Matching**: Are candidates with more matching skills ranked higher?
5. **No Match Handling**: Does the system properly handle cases with no suitable candidates?

---

## Usage Instructions

For each test case, use the candidateSearch tool with this format:

```
Please search for candidates using the candidateSearch tool with these parameters:
- Job Description: [Copy the full job description from above]
- Experience Level: [As specified]
- Required Skills: [As specified in the array]
- Location: [As specified]
- Max Results: [As specified]
```

---

## Expected Behavior Summary

- **Alex Johnson** should match well for JavaScript/React developer roles
- **Maria Rodriguez** should match well for IT support roles
- **Cross-functional roles** should show both candidates with different scores
- **Senior/highly specialized roles** should return no matches or very low scores
- **Remote positions** should be accessible to both candidates based on skills

This testing approach will validate that your semantic search is working correctly with the known seed data.