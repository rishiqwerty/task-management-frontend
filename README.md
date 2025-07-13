# Task Management Frontend

A modern, responsive React app for managing tasks with real-time feedback and AI-powered features.

## Features
- Task buckets: Upcoming, Completed, Missed
- Add, edit, complete, and delete tasks
- Priority badges and tag chips
- AI-powered: Generate tasks from natural language
- Instant feedback and smooth transitions
- Mobile-friendly
- Auto refresh every minute

## Quick Start

```bash
git clone https://github.com/rishiqwerty/task-management-frontend.git
cd task-management-frontend
npm install
npm run dev
```

- App runs at: http://localhost:5173
- Make sure the backend is running [see backend README](https://github.com/rishiqwerty/task-management?tab=readme-ov-file#task-management-platform)

## Configuration
- Update the API base URL in `.env` at `VITE_API_BASE`
- Add refresh time in `.env` at `VITE_REFERSH_TIME` default is 30000(30 seconds)
- For CORS, add your frontend URL to the backend `.env` (`CORS_ALLOWED_ORIGINS`)

## Usage
- Use the "Add Task" button to create tasks
- Use the text box at the top to generate tasks from a project description
- Click edit or delete icons on each task for quick actions
- Tasks are auto-sorted by due date and priority

## Tech Stack
- React (Vite)
- Material-UI (MUI)
- Axios
## Screenshots
<img width="1112" alt="Screenshot 2025-07-10 at 12 40 00 PM" src="https://github.com/user-attachments/assets/093e747d-7ef3-4822-bf3c-7effb3e74928" />


