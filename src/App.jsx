import React, { useEffect, useState, useRef } from 'react';
import { Container, Typography, Tabs, Tab, Box, Snackbar, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

const API_BASE = 'http://localhost:9000';


const TASK_TABS = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
  { label: 'Missed', value: 'missed' },
];

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [addOpen, setAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '' });
  const [addError, setAddError] = useState('');
  const [lastCompletedId, setLastCompletedId] = useState(null);
  const [transitioningTask, setTransitioningTask] = useState(null);
  const highlightTimeout = useRef(null);
  // Track previous upcoming tasks to detect transitions to missed
  const prevUpcomingRef = useRef([]);

  useEffect(() => {
    fetchTasks();
  }, [tab]);

  useEffect(() => {
    // Poll every 5 seconds
    const interval = setInterval(() => {
      fetchTasks();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const now = new Date(); // Always use current time
    const currentUpcoming = tasks.filter(
      (task) => task.status === 'pending' && new Date(task.due_date) > now
    ).map(task => task.id);

    prevUpcomingRef.current = currentUpcoming;
  }, [tasks]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/tasks/tasks/`);
      const tasks = res.data;
      setTasks(tasks);
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to load tasks.' });
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async (taskId) => {
    setTransitioningTask({ id: taskId, start: Date.now() });
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, status: 'completed' } : task
    );
    setTasks(updatedTasks); // Optimistic update
    setLastCompletedId(taskId);
    const completedTask = tasks.find(task => task.id === taskId);
    setSnackbar({ open: true, message: `Task "${completedTask?.title || 'Task'}" marked as completed.` });
    if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
    highlightTimeout.current = setTimeout(() => setLastCompletedId(null), 1200);

    // Remove from old tab after 1.5s
    setTimeout(() => setTransitioningTask(null), 1500);

    try {
      await axios.post(`${API_BASE}/tasks/tasks/${taskId}/complete/`);
      fetchTasks();
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to complete task.' });
    }
  };

  const handleAddTask = async () => {
    setAddError('');
    if (!newTask.title || !newTask.due_date) {
      setAddError('Title and due date are required.');
      return;
    }
    if (new Date(newTask.due_date) <= new Date()) {
      setAddError('Due date must be in the future.');
      return;
    }
    try {
      await axios.post(`${API_BASE}/tasks/tasks/`, newTask);
      setSnackbar({ open: true, message: 'Task created.' });
      setAddOpen(false);
      setNewTask({ title: '', description: '', due_date: '' });
      fetchTasks();
    } catch (err) {
      setAddError('Failed to create task.');
    }
  };

  const now = new Date();

  const filteredTasks = tasks.filter((task) => {
    if (TASK_TABS[tab].value === 'upcoming') {
      // Only show pending tasks and transitioning-to-completed tasks
      return (
        task.status === 'pending' ||
        (transitioningTask && transitioningTask.id === task.id)
      );
    }
    if (TASK_TABS[tab].value === 'completed') {
      return task.status === 'completed';
    }
    if (TASK_TABS[tab].value === 'missed') {
      return task.status === 'overdue' && new Date(task.due_date) <= now;
    }
    return false;
  });

  const missedCount = tasks.filter(
    (task) => task.status === 'overdue' && new Date(task.due_date) <= new Date()
  ).length;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" align="center" gutterBottom>
          Task Manager
        </Typography>
        <Button variant="contained" color="primary" onClick={() => setAddOpen(true)}>
          Add Task
        </Button>
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          {TASK_TABS.map((status, idx) => (
            <Tab
              key={status.value}
              label={
                status.value === 'missed'
                  ? (
                      <span>
                        {status.label}
                        {missedCount > 0 && (
                          <Chip
                            label={missedCount}
                            color="error"
                            size="small"
                            sx={{ ml: 1, fontWeight: 'bold' }}
                          />
                        )}
                      </span>
                    )
                  : status.label
              }
            />
          ))}
        </Tabs>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {filteredTasks.length === 0 ? (
            <Typography align="center" color="text.secondary">
              No tasks in this bucket.
            </Typography>
          ) : (
            filteredTasks.map((task) => (
              <Box key={task.id} sx={{
                p: 2, mb: 2, border: '1px solid #eee', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                transition: 'background 0.5s, opacity 1s',
                background: lastCompletedId === task.id ? '#e0ffe0' : 'white',
                opacity: (transitioningTask && transitioningTask.id === task.id && TASK_TABS[tab].value === 'upcoming') ? 0.5 : 1,
              }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {task.title}
                    {transitioningTask && transitioningTask.id === task.id && TASK_TABS[tab].value === 'upcoming' && (
                      <Chip label="Moving to Completed..." color="success" size="small" />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Due: {task.due_date}</Typography>
                </Box>
                {task.status === 'completed' ? (
                  <Button variant="contained" color="success" disabled startIcon={<CheckCircleIcon />}>
                    Completed
                  </Button>
                ) : (
                  <Button variant="contained" color="success" onClick={() => handleComplete(task.id)}>
                    Mark Complete
                  </Button>
                )}
              </Box>
            ))
          )}
        </Box>
      )}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
          <TextField
            label="Title"
            value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
            required
            autoFocus
          />
          <TextField
            label="Description"
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            multiline
            minRows={2}
          />
          <TextField
            label="Due Date"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={newTask.due_date}
            onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
            required
          />
          {addError && <Typography color="error">{addError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Container>
  );
}

export default App; 