import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface EnhancedEmbeddingResult {
  fullEmbedding: number[];
  skillsEmbedding: number[];
  requirementsEmbedding: number[];
  expandedQuery?: string;
  extractedSkills?: string[];
  extractedRequirements?: string[];
}

export class EmbeddingService {
  /**
   * Generate embeddings for text using OpenAI's text-embedding-ada-002 model
   * This matches the 1536-dimensional vectors used in your candidates table
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text.trim(),
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error('Failed to generate embedding for text');
    }
  }

  /**
   * Enhanced job description embedding generation with query expansion
   */
  static async generateEnhancedJobDescriptionEmbeddings(jobDescription: string): Promise<EnhancedEmbeddingResult> {
    try {
      // 1. Expand the query with synonyms and related terms
      const expandedQuery = await this.expandJobDescription(jobDescription);
      
      // 2. Extract structured information
      const extractedSkills = this.extractTechnicalSkills(jobDescription);
      const extractedRequirements = this.extractRequirements(jobDescription);
      
      // 3. Create enhanced context sections
      const skillsSection = this.createSkillsContext(jobDescription, extractedSkills);
      const requirementsSection = this.createRequirementsContext(jobDescription, extractedRequirements);
      
      // 4. Generate embeddings for different aspects
      const [fullEmbedding, skillsEmbedding, requirementsEmbedding] = await Promise.all([
        this.generateEmbedding(expandedQuery), // Use expanded query for full embedding
        this.generateEmbedding(skillsSection),
        this.generateEmbedding(requirementsSection),
      ]);

      return {
        fullEmbedding,
        skillsEmbedding,
        requirementsEmbedding,
        expandedQuery,
        extractedSkills,
        extractedRequirements,
      };
    } catch (error) {
      console.error('Error generating enhanced job description embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for job description with different aspects (backward compatibility)
   */
  static async generateJobDescriptionEmbeddings(jobDescription: string): Promise<{
    fullEmbedding: number[];
    skillsEmbedding: number[];
    requirementsEmbedding: number[];
  }> {
    try {
      // Extract skills and requirements sections for targeted embeddings
      const skillsSection = this.extractSkillsFromJobDescription(jobDescription);
      const requirementsSection = this.extractRequirementsFromJobDescription(jobDescription);

      const [fullEmbedding, skillsEmbedding, requirementsEmbedding] = await Promise.all([
        this.generateEmbedding(jobDescription),
        this.generateEmbedding(skillsSection || jobDescription),
        this.generateEmbedding(requirementsSection || jobDescription),
      ]);

      return {
        fullEmbedding,
        skillsEmbedding,
        requirementsEmbedding,
      };
    } catch (error) {
      console.error('Error generating job description embeddings:', error);
      throw error;
    }
  }

  /**
   * Expand job description with synonyms and related terms using LLM
   */
  private static async expandJobDescription(jobDescription: string): Promise<string> {
    try {
      const prompt = `
        Expand this job description with relevant synonyms, alternative terms, and related technologies 
        that recruiters might use to find suitable candidates. Focus on:
        
        1. Technology synonyms (e.g., "JavaScript" → "JS, ECMAScript, Node.js")
        2. Framework alternatives (e.g., "React" → "ReactJS, React.js")
        3. Experience level variations (e.g., "senior" → "experienced, expert, lead")
        4. Related skills and tools
        5. Industry terminology variations
        
        Original job description:
        ${jobDescription}
        
        Return the expanded version that includes the original text plus a "Related terms:" section with additional keywords.
        Keep it concise and relevant.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.3,
      });

      const expandedDescription = response.choices[0]?.message?.content?.trim();
      return expandedDescription || jobDescription;
    } catch (error) {
      console.error('Error expanding job description:', error);
      // Fallback to original description if expansion fails
      return jobDescription;
    }
  }

  /**
   * Extract technical skills using pattern matching and NLP
   */
  private static extractTechnicalSkills(jobDescription: string): string[] {
    const skillPatterns = [
      // Programming languages
      /\b(javascript|js|typescript|ts|python|java|c#|c\+\+|cpp|c|ruby|php|go|golang|rust|kotlin|swift|scala|clojure|erlang|elixir|f#|haskell|perl|r|matlab|dart|objective-c|objc|assembly|cobol|fortran|julia|lua|bash|shell|powershell|vb\.net|visual basic)\b/gi,
      
      // Web technologies
      /\b(html|html5|css|css3|sass|scss|less|tailwind|bootstrap|material-ui|mui|ant design|chakra ui|bulma|foundation|semantic ui)\b/gi,
      
      // Frontend frameworks and libraries
      /\b(react|reactjs|angular|angularjs|vue|vuejs|svelte|ember|backbone|jquery|next\.js|nextjs|nuxt\.js|nuxtjs|gatsby|remix|astro|lit|alpine\.js|stimulus)\b/gi,
      
      // Backend frameworks
      /\b(node\.js|nodejs|express|expressjs|django|flask|fastapi|spring|spring boot|laravel|rails|ruby on rails|asp\.net|nest\.js|nestjs|koa|hapi|gin|fiber|actix|rocket|sinatra|phoenix|symfony|codeigniter|cakephp|zend)\b/gi,
      
      // Databases
      /\b(sql|mysql|postgresql|postgres|mongodb|mongo|redis|elasticsearch|elastic|cassandra|dynamodb|sqlite|oracle|sql server|mssql|mariadb|couchdb|neo4j|influxdb|timescaledb|snowflake|bigquery|firestore|supabase)\b/gi,
      
      // Cloud platforms and services
      /\b(aws|amazon web services|azure|microsoft azure|gcp|google cloud|heroku|vercel|netlify|digitalocean|linode|vultr|cloudflare|firebase|amplify|serverless|lambda|ec2|s3|rds|aurora|cloudformation)\b/gi,
      
      // DevOps and Infrastructure
      /\b(docker|kubernetes|k8s|jenkins|gitlab ci|github actions|travis ci|circleci|terraform|ansible|puppet|chef|vagrant|nginx|apache|prometheus|grafana|elk stack|datadog|new relic|splunk)\b/gi,
      
      // Mobile development
      /\b(react native|flutter|ionic|xamarin|cordova|phonegap|native script|android|ios|swift ui|kotlin multiplatform|expo)\b/gi,
      
      // Testing frameworks and tools
      /\b(jest|mocha|chai|jasmine|cypress|selenium|playwright|puppeteer|junit|pytest|rspec|minitest|phpunit|karma|protractor|cucumber|testng|mockito|sinon)\b/gi,
      
      // Build tools and bundlers
      /\b(webpack|vite|parcel|rollup|esbuild|gulp|grunt|yarn|npm|pnpm|maven|gradle|sbt|leiningen|cargo|composer|pip|bundler|cocoapods|carthage)\b/gi,
      
      // Version control and collaboration
      /\b(git|github|gitlab|bitbucket|svn|mercurial|perforce|jira|confluence|slack|teams|discord|notion|linear|asana|trello)\b/gi,
      
      // Methodologies and practices
      /\b(agile|scrum|kanban|lean|waterfall|devops|ci\/cd|continuous integration|continuous deployment|tdd|test driven development|bdd|behavior driven development|pair programming|code review|microservices|monolith|serverless|jamstack)\b/gi,
      
      // API technologies
      /\b(rest|restful|graphql|grpc|soap|webhooks|websockets|sse|server-sent events|json|xml|yaml|protobuf|openapi|swagger|postman|insomnia)\b/gi,
      
      // Data science and machine learning
      /\b(pandas|numpy|scikit-learn|sklearn|tensorflow|keras|pytorch|jupyter|matplotlib|seaborn|plotly|tableau|power bi|spark|hadoop|kafka|airflow|dbt|snowflake|databricks)\b/gi,
      
      // Security
      /\b(oauth|jwt|ssl|tls|https|encryption|hashing|authentication|authorization|csrf|xss|sql injection|penetration testing|owasp|security audit|firewall|vpn)\b/gi,
      
      // Monitoring and logging
      /\b(prometheus|grafana|elk stack|elasticsearch|logstash|kibana|datadog|new relic|sentry|rollbar|bugsnag|pagerduty|splunk|fluentd|jaeger|zipkin)\b/gi,
      
      // Blockchain and web3
      /\b(blockchain|ethereum|bitcoin|solidity|web3|smart contracts|nft|defi|metamask|truffle|hardhat|ganache|ipfs)\b/gi,
      
      // Game development
      /\b(unity|unreal engine|godot|phaser|three\.js|babylonjs|webgl|opengl|directx|game maker|construct|defold)\b/gi,
      
      // Design and UX tools
      /\b(figma|sketch|adobe xd|photoshop|illustrator|after effects|principle|framer|invision|zeplin|abstract|miro|whimsical)\b/gi,
      
      // Operating systems and platforms
      /\b(linux|ubuntu|centos|debian|red hat|fedora|arch|windows|macos|unix|freebsd|android|ios|docker|containerization)\b/gi,
      
      // Specialized technologies
      /\b(redis|memcached|rabbitmq|apache kafka|elasticsearch|solr|sphinx|lucene|opencv|tensorflow|pytorch|scikit-learn|r|stata|spss|sas|matlab|labview)\b/gi,
      
      // Architecture patterns
      /\b(mvc|mvp|mvvm|clean architecture|hexagonal architecture|onion architecture|cqrs|event sourcing|domain driven design|ddd|solid principles|design patterns)\b/gi,
      
      // Performance and optimization
      /\b(performance optimization|caching|cdn|load balancing|horizontal scaling|vertical scaling|database optimization|query optimization|indexing|compression)\b/gi,
      
      // Emerging technologies
      /\b(ai|artificial intelligence|machine learning|ml|deep learning|neural networks|computer vision|natural language processing|nlp|iot|internet of things|ar|augmented reality|vr|virtual reality|quantum computing)\b/gi,
    ];

    const skills = new Set<string>();
    
    skillPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern);
      if (matches) {
        matches.forEach(match => skills.add(match.toLowerCase()));
      }
    });

    // Add common skill variations
    const skillMap: Record<string, string[]> = {
      'js': ['javascript', 'node.js'],
      'react': ['reactjs', 'react.js'],
      'vue': ['vue.js', 'vuejs'],
      'node.js': ['nodejs', 'node'],
    };

    skills.forEach(skill => {
      if (skillMap[skill]) {
        skillMap[skill].forEach(variation => skills.add(variation));
      }
    });

    return Array.from(skills);
  }

  /**
   * Extract requirements and qualifications
   */
  private static extractRequirements(jobDescription: string): string[] {
    const requirementPatterns = [
      /(\d+)[\+\-]?\s*years?\s+(?:of\s+)?experience/gi,
      /bachelor'?s?\s+degree/gi,
      /master'?s?\s+degree/gi,
      /phd|doctorate/gi,
      /certification/gi,
      /\b(junior|senior|lead|principal|architect|manager)\b/gi,
    ];

    const requirements: string[] = [];
    
    requirementPatterns.forEach(pattern => {
      const matches = jobDescription.match(pattern);
      if (matches) {
        requirements.push(...matches.map(match => match.toLowerCase()));
      }
    });

    return requirements;
  }

  /**
   * Create enhanced skills context with synonyms
   */
  private static createSkillsContext(jobDescription: string, extractedSkills: string[]): string {
    const skillsFromDescription = this.extractSkillsFromJobDescription(jobDescription);
    const combinedSkills = [...new Set([...extractedSkills, skillsFromDescription])].join(', ');
    
    return `Skills and Technologies: ${combinedSkills}`;
  }

  /**
   * Create enhanced requirements context
   */
  private static createRequirementsContext(jobDescription: string, extractedRequirements: string[]): string {
    const requirementsFromDescription = this.extractRequirementsFromJobDescription(jobDescription);
    const combinedRequirements = [requirementsFromDescription, ...extractedRequirements].filter(Boolean).join('. ');
    
    return `Requirements and Qualifications: ${combinedRequirements}`;
  }

  /**
   * Extract skills section from job description (original implementation)
   */
  private static extractSkillsFromJobDescription(jobDescription: string): string {
    const text = jobDescription.toLowerCase();
    const skillsKeywords = ['skills', 'technologies', 'requirements', 'experience with'];
    
    // Find sections that mention skills
    const lines = text.split('\n');
    const skillsLines = lines.filter(line => 
      skillsKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    
    return skillsLines.join('\n') || jobDescription;
  }

  /**
   * Extract requirements section from job description (original implementation)
   */
  private static extractRequirementsFromJobDescription(jobDescription: string): string {
    const text = jobDescription.toLowerCase();
    const requirementsKeywords = ['requirements', 'qualifications', 'must have', 'required'];
    
    const lines = text.split('\n');
    const requirementsLines = lines.filter(line => 
      requirementsKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    
    return requirementsLines.join('\n') || jobDescription;
  }

  /**
   * Combine embeddings with weighted average
   */
  private static combineEmbeddings(
    embedding1: number[], 
    embedding2: number[], 
    weight1: number, 
    weight2: number
  ): number[] {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimensions');
    }

    return embedding1.map((val, idx) => 
      (val * weight1) + (embedding2[idx] * weight2)
    );
  }

  /**
   * Generate multiple query variations for enhanced retrieval
   */
  static async generateQueryVariations(originalQuery: string): Promise<string[]> {
    try {
      const prompt = `
        Generate 3 alternative phrasings of this job search query that maintain the same meaning 
        but use different terminology and phrasing styles:
        
        Original: "${originalQuery}"
        
        Return only the 3 variations, one per line, without numbering or extra text.
      `;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });

      const variations = response.choices[0]?.message?.content?.trim().split('\n') || [];
      return [originalQuery, ...variations.filter(v => v.trim().length > 0)];
    } catch (error) {
      console.error('Error generating query variations:', error);
      return [originalQuery]; // Fallback to original query
    }
  }
}