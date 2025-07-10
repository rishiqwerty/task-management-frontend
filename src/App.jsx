import React, { useEffect, useState, useRef } from 'react';
import { Container, Typography, Tabs, Tab, Box, Snackbar, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';

const API_BASE = import.meta.env.VITE_API_BASE;

const TASK_TABS = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
  { label: 'Missed', value: 'missed' },
];

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low', color: 'default' },
  { label: 'Medium', value: 'medium', color: 'warning' },
  { label: 'High', value: 'high', color: 'error' },
  { label: 'Urgent', value: 'urgent', color: 'error' }
];

// Utility: Convert local datetime-local string to UTC ISO string
function toUTCISOString(localDateTimeString) {
  if (!localDateTimeString) return '';
  const date = new Date(localDateTimeString);
  return date.toISOString();
}

// Utility: Format date string for display in local time
function formatDisplayLocal(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// Utility: Convert tags string to array and vice versa
function tagsToString(tags) {
  return Array.isArray(tags) ? tags.join(', ') : tags || '';
}

function stringToTags(tagsString) {
  return tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });
  const [addOpen, setAddOpen] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', priority: '' });
  const [addError, setAddError] = useState('');
  const [lastCompletedId, setLastCompletedId] = useState(null);
  const [transitioningTask, setTransitioningTask] = useState(null);
  const highlightTimeout = useRef(null);
  const prevUpcomingRef = useRef([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [editError, setEditError] = useState('');
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [textLoading, setTextLoading] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState(new Set());

  useEffect(() => {
    fetchTasks();
  }, [tab]);

  useEffect(() => {
    // Poll every 30 seconds
    const interval = setInterval(() => {
      fetchTasks();
    }, 30000);
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
      const tasks = Array.isArray(res.data) ? res.data : [];
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
      const payload = { 
        ...newTask, 
        due_date: toUTCISOString(newTask.due_date)
      };
      await axios.post(`${API_BASE}/tasks/tasks/`, payload);
      setSnackbar({ open: true, message: 'Task created.' });
      setAddOpen(false);
      setNewTask({ title: '', description: '', due_date: '', priority: '' });
      fetchTasks();
    } catch (err) {
      setAddError('Failed to create task.');
    }
  };

  const handleEditOpen = (task) => {
    const date = new Date(task.due_date);
    const formattedDueDate = date.toISOString().slice(0, 16); // This is UTC, not local!
    // To get local time
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    console.log(local);
    setEditTask({ ...task, due_date: local });
    setEditOpen(true);
    setEditError('');
  };

  const handleEditSave = async () => {
    setEditError('');
    if (!editTask.title || !editTask.due_date) {
      setEditError('Title and due date are required.');
      return;
    }
    if (editTask.status !== 'completed' && new Date(editTask.due_date) <= new Date()) {
      setEditError('Due date must be in the future.');
      return;
    }
    try {
      const payload = { 
        ...editTask, 
        due_date: toUTCISOString(editTask.due_date)
      };
      await axios.patch(`${API_BASE}/tasks/tasks/${editTask.id}/`, payload);
      setSnackbar({ open: true, message: 'Task updated.' });
      setEditOpen(false);
      setEditTask(null);
      fetchTasks();
    } catch (err) {
      setEditError('Failed to update task.');
    }
  };

  const handleDelete = async (taskId) => {
    const taskToDelete = tasks.find(task => task.id === taskId);
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    setDeletingTaskId(taskId);
    setTimeout(async () => {
      try {
        await axios.delete(`${API_BASE}/tasks/tasks/${taskId}/`);
        setSnackbar({ open: true, message: `Task "${taskToDelete?.title || 'Task'}" deleted.` });
        fetchTasks();
      } catch (err) {
        setSnackbar({ open: true, message: 'Failed to delete task.' });
      }
      setDeletingTaskId(null);
    }, 1200); // 1.2 seconds highlight
  };

  const handleTextToTask = async () => {
    if (!textInput.trim()) {
      setSnackbar({ open: true, message: 'Please enter some text to create tasks.' });
      return;
    }
    setTextLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/tasks/tasks/text_to_task_action/`, {
        text: textInput
      });
      setSnackbar({ open: true, message: response.data.message || 'Tasks created successfully from text!' });
      setTextInput('');
      fetchTasks();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || 'Failed to create tasks from text.' });
    } finally {
      setTextLoading(false);
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
  }).sort((a, b) => {
    // First sort by due date (earliest first)
    const aDate = new Date(a.due_date);
    const bDate = new Date(b.due_date);
    if (aDate.getTime() !== bDate.getTime()) {
      return aDate.getTime() - bDate.getTime();
    }
    
    // If due dates are the same, sort by priority: urgent > high > medium > low > empty
    const priorityOrder = { 'urgent': 4, 'high': 3, 'medium': 2, 'low': 1, '': 0 };
    const aPriority = priorityOrder[a.priority] || 0;
    const bPriority = priorityOrder[b.priority] || 0;
    return bPriority - aPriority; // Higher priority first
  });

  const missedCount = tasks.filter(
    (task) => task.status === 'overdue' && new Date(task.due_date) <= new Date()
  ).length;

  const toggleDescription = (taskId) => {
    const newExpanded = new Set(expandedDescriptions);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedDescriptions(newExpanded);
  };

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
      <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 2, backgroundColor: '#f9f9f9' }}>
        <Typography variant="h6" gutterBottom>
          Create Tasks from Text
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Describe what you want to accomplish and AI will create tasks for you.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="I am planning to create a App which can help me track my expense, can you create task list which over the month tech stack will be python django and flutter frontend"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={textLoading}
          />
          <Button
            variant="contained"
            onClick={handleTextToTask}
            disabled={textLoading || !textInput.trim()}
            sx={{ minWidth: 120 }}
          >
            {textLoading ? <CircularProgress size={20} /> : 'Create Tasks'}
          </Button>
        </Box>
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
                background: lastCompletedId === task.id ? '#e0ffe0' : deletingTaskId === task.id ? '#ffe0e0' : 'white',
                opacity: (transitioningTask && transitioningTask.id === task.id) ? 0.5 : (deletingTaskId === task.id ? 0.5 : 1),
              }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {task.title}
                    {task.priority && (
                      <Chip 
                        label={PRIORITY_OPTIONS.find(p => p.value === task.priority)?.label || task.priority} 
                        color={PRIORITY_OPTIONS.find(p => p.value === task.priority)?.color || 'default'} 
                        size="small" 
                      />
                    )}
                    {transitioningTask && transitioningTask.id === task.id && TASK_TABS[tab].value === 'upcoming' && (
                      <Chip label="Moving to Completed..." color="success" size="small" />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Due: {formatDisplayLocal(task.due_date)}</Typography>
                  {task.description && task.description.trim() && (
                    <Box sx={{ mt: 0.5 }}>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          fontStyle: 'italic',
                          display: '-webkit-box',
                          WebkitLineClamp: expandedDescriptions.has(task.id) ? 'unset' : 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {task.description}
                      </Typography>
                      {task.description.length > 100 && (
                        <Button
                          size="small"
                          onClick={() => toggleDescription(task.id)}
                          sx={{ mt: 0.5, p: 0, minWidth: 'auto', textTransform: 'none' }}
                        >
                          {expandedDescriptions.has(task.id) ? 'Show Less' : 'Show More'}
                        </Button>
                      )}
                    </Box>
                  )}
                  {task.tag && task.tag.length > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {Array.isArray(task.tag) ? task.tag.map((tag, index) => (
                        <Chip key={index} label={tag} size="small" variant="outlined" />
                      )) : (
                        <Chip label={task.tag} size="small" variant="outlined" />
                      )}
                    </Box>
                  )}
                </Box>
                {task.status !== 'completed' && (
                  <>
                    <IconButton aria-label="edit" onClick={() => handleEditOpen(task)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton aria-label="delete" onClick={() => handleDelete(task.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </>
                )}
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
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={newTask.priority}
              label="Priority"
              onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
            >
              <MenuItem value="">Auto-assign (AI)</MenuItem>
              {PRIORITY_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {addError && <Typography color="error">{addError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button onClick={handleAddTask} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Edit Task</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 350 }}>
          <TextField
            label="Title"
            value={editTask?.title || ''}
            onChange={e => setEditTask({ ...editTask, title: e.target.value })}
            required
            autoFocus
          />
          <TextField
            label="Description"
            value={editTask?.description || ''}
            onChange={e => setEditTask({ ...editTask, description: e.target.value })}
            multiline
            minRows={2}
          />
          <TextField
            label="Due Date"
            type="datetime-local"
            InputLabelProps={{ shrink: true }}
            value={editTask?.due_date || ''}
            onChange={e => setEditTask({ ...editTask, due_date: e.target.value })}
            required
          />
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={editTask?.priority || ''}
              label="Priority"
              onChange={e => setEditTask({ ...editTask, priority: e.target.value })}
            >
              <MenuItem value="">Auto-assign (AI)</MenuItem>
              {PRIORITY_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {editError && <Typography color="error">{editError}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSave} variant="contained">Save</Button>
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