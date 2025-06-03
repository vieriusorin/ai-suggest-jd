# AI Job Matching System

## Overview

This project is an AI-powered chat application that leverages OpenAI's models to generate intelligent responses. The application provides a seamless interface for interacting with language models like GPT-4o-mini, with support for various features including tool integration, custom system prompts, and memory management.

## Features

- Interactive AI chat interface
- Support for custom system prompts
- Tool/function calling capabilities
- Temperature control for response randomness
- Memory management for conversation context
- Configurable model parameters

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up your OpenAI API key in an environment variable:
   ```
   export OPENAI_API_KEY=your_api_key_here
   ```
4. Start the application:
   ```
   npm start "your message here"
   ```

## Usage

### PGAdmin

PGAdmin is a web-based tool for managing PostgreSQL databases. It provides a graphical interface for performing various database operations.

Using pgAdmin (Web Interface)

   URL: http://localhost:8080
   Email: admin@example.com
   Password: password123

Add server connection:

   Host: postgres (container name)
   Port: 5432
   Database: job_matching
   Username: admin
   Password: password123

# Connect to PGAdmin
   ```
   docker exec -it job_matching_db psql -U admin -d job_matching
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT License](LICENSE)
