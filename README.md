# Task Management Frontend

A modern, responsive React app for managing tasks with real-time feedback and AI-powered features.

## Features
- Task buckets: Upcoming, Completed, Missed
- Add, edit, complete, and delete tasks
- Priority badges and tag chips
- AI-powered: Generate tasks from natural language
- Instant feedback and smooth transitions
- Mobile-friendly (MUI)

## Quick Start

```bash
git clone https://github.com/rishiqwerty/task-management-frontend.git
cd task-management-frontend
npm install
npm run dev
```

- App runs at: http://localhost:5173
- Make sure the backend is running (see backend README)

## Configuration
- Update the API base URL in `src/App.jsx` if your backend is not on `localhost:9000`
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


