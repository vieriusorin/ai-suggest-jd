# AI Job Matching System

## Overview

This project is an AI-powered job matching system that leverages OpenAI's models to intelligently match candidates with job opportunities. The application provides a seamless chat interface for interacting with language models like GPT-4o-mini, with support for various features including tool integration, custom system prompts, and memory management.

## Features

- Interactive AI chat interface for job matching
- Support for custom system prompts
- Tool/function calling capabilities
- Temperature control for response randomness
- Memory management for conversation context
- Configurable model parameters
- Vector database integration for semantic search
- PostgreSQL database with pgvector extension

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Docker and Docker Compose
- OpenAI API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-job-matching-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   export OPENAI_API_KEY=your_api_key_here
   ```

4. **Start the services with Docker**
   ```bash
   docker-compose up
   ```

5. **Verify containers are running**
   ```bash
   docker ps
   ```

## Database Setup

1. **Push database schema**
   ```bash
   npx drizzle-kit push
   ```

2. **Open database studio**
   ```bash
   npm run db:studio
   ```

3. **Install pgvector extension**
   
   Check if pgvector is installed:
   ```sql
   SELECT * FROM pg_available_extensions WHERE name = 'vector';
   ```
   
   If not installed, run:
   ```sql
   CREATE EXTENSION vector;
   ```

4. **Populate the database**
   
   Copy the SQL content from `db/reset.sql` and execute it in the SQL tab of db:studio to populate the database with initial data.

## Usage

### Starting the Application
