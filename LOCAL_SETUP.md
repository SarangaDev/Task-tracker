# Complete Local Setup Guide

This guide provides detailed, step-by-step instructions for running the Task Tracker application entirely locally without using Docker.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- PostgreSQL (v14 or higher)

## 1. Database Setup

1. Install PostgreSQL on your machine if you haven't already.
2. Open your terminal and access the PostgreSQL command line (e.g., using `psql -U postgres` or pgAdmin).
3. Create the database and user:
   ```sql
   CREATE USER taskuser WITH PASSWORD 'taskpassword';
   CREATE DATABASE tasktracker OWNER taskuser;
   ```

## 2. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Copy `.env.example` to `.env` (or create a `.env` file).
   - Ensure `DATABASE_URL` matches your local Postgres credentials:
     ```env
     DATABASE_URL="postgresql://taskuser:taskpassword@localhost:5432/tasktracker?schema=public"
     JWT_SECRET="your-super-secret-jwt-key"
     JWT_EXPIRES_IN="7d"
     PORT=3000
     NODE_ENV=development
     ```
4. Initialize the database schema and generate the Prisma client:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
5. (Optional) Seed the database with initial demo data:
   ```bash
   npm run db:seed
   ```
6. Start the backend development server:
   ```bash
   npm run dev
   ```
   The API will now be running at `http://localhost:3000`.

## 3. Frontend Setup

1. Open a **new** terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file in the `frontend` directory and add the backend API URL:
     ```env
     VITE_API_URL=http://localhost:3000/api
     ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at `http://localhost:5173`.

## 4. Usage

- Open your browser and navigate to `http://localhost:5173`.
- You can register a new account or log in with seeded credentials:
  - **Admin:** `admin@tasktracker.com` / `Admin@123`
  - **User:** `user@tasktracker.com` / `User@123`
