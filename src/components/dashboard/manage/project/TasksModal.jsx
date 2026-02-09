import React, { useEffect, useRef, useState } from 'react';
import { X, Plus, Loader2, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { fetchDropdown } from '../../../../services/dropdownService';
import { fetchProjectTasks } from '../../../../services/projectService';

const TasksModal = ({
  project,
  onClose,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  readOnly = false
}) => {
    const [tasks, setTasks] = useState([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [editTaskId, setEditTaskId] = useState(null);
    const [editFormData, setEditFormData] = useState(null);
    const [editFormErrors, setEditFormErrors] = useState({});
    const [editSubmitting, setEditSubmitting] = useState(false);
    // Fetch tasks for this project
    useEffect(() => {
      if (!project?.id) return;
      setTasksLoading(true);
      fetchProjectTasks(project.id)
        .then(res => {
          setTasks(Array.isArray(res.data) ? res.data : []);
        })
        .catch(() => setTasks([]))
        .finally(() => setTasksLoading(false));
    }, [project?.id]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target: '',
    teamIds: [],
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState('');
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const loadAgents = async () => {
      setAgentsLoading(true);
      setAgentsError('');
      try {
        const data = await fetchDropdown('agent', project?.id);
        const normalized = (data || []).map((item) => {
          const candidate = Array.isArray(item) ? item[0] : item;
          const id = candidate?.user_id || candidate?.team_id || candidate?.id;
          const label = candidate?.label || candidate?.name || candidate?.user_name || candidate?.team_name || '';
          return id ? { id: String(id), label } : null;
        }).filter(Boolean);
        setAgents(normalized);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        setAgentsError('Unable to load agents');
      } finally {
        setAgentsLoading(false);
      }
    };
    loadAgents();
  }, [project?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTeamDropdown && dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowTeamDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTeamDropdown]);

  const toggleTeamSelection = (id) => {
    setFormData((prev) => {
      const exists = prev.teamIds.includes(id);
      const updated = exists ? prev.teamIds.filter((t) => t !== id) : [...prev.teamIds, id];
      return { ...prev, teamIds: updated };
    });

    if (formErrors.teamIds) {
      setFormErrors((prev) => ({ ...prev, teamIds: '' }));
    }
  };

  const handleSelectAllTeams = (isChecked) => {
    if (isChecked) {
      // Select all agents
      const allAgentIds = agents.map(agent => agent.id);
      setFormData((prev) => ({ ...prev, teamIds: allAgentIds }));
    } else {
      // Deselect all agents
      setFormData((prev) => ({ ...prev, teamIds: [] }));
    }
    
    // Clear error when user makes a selection
    if (isChecked && formErrors.teamIds) {
      setFormErrors((prev) => ({ ...prev, teamIds: '' }));
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};

    console.log('Validating form data:', formData);
    console.log('teamIds:', formData.teamIds, 'length:', formData.teamIds.length);

    if (!formData.name.trim()) errors.name = 'Task name is required';

    if (!formData.target) {
      errors.target = 'Target is required';
    } else if (Number(formData.target) <= 0) {
      errors.target = 'Target must be greater than 0';
    }

    if (!formData.teamIds || formData.teamIds.length === 0) errors.teamIds = 'Select at least one agent';

    console.log('Validation errors:', errors);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddTask = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    const success = await onAddTask(formData);
    setIsSubmitting(false);
    if (success) {
      setFormData({ name: '', description: '', target: '', teamIds: [] });
      setShowTeamDropdown(false);
      // Refetch tasks
      setTasksLoading(true);
      fetchProjectTasks(project.id)
        .then(res => setTasks(Array.isArray(res.data) ? res.data : []))
        .finally(() => setTasksLoading(false));
    }
  };

  // Edit logic
  const startEditTask = (task) => {
    setEditTaskId(task.task_id || task.id);
    setEditFormData({
      name: task.task_name || task.name || '',
      description: task.task_description || task.description || '',
      target: task.task_target || task.target || '',
      teamIds: Array.isArray(task.task_team_id) ? task.task_team_id.map(String) : [],
    });
    setEditFormErrors({});
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editFormErrors[field]) setEditFormErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleEditTeamToggle = (id) => {
    setEditFormData(prev => {
      const exists = prev.teamIds.includes(id);
      const updated = exists ? prev.teamIds.filter(t => t !== id) : [...prev.teamIds, id];
      return { ...prev, teamIds: updated };
    });
    if (editFormErrors.teamIds) setEditFormErrors(prev => ({ ...prev, teamIds: '' }));
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editFormData.name?.trim()) errors.name = 'Task name is required';
    if (!editFormData.target) errors.target = 'Target is required';
    else if (Number(editFormData.target) <= 0) errors.target = 'Target must be greater than 0';
    if (!editFormData.teamIds?.length) errors.teamIds = 'Select at least one agent';
    setEditFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEditTask = async () => {
    if (!validateEditForm()) return;
    setEditSubmitting(true);
    const success = await onUpdateTask(project.id, editTaskId, editFormData);
    setEditSubmitting(false);
    if (success) {
      setEditTaskId(null);
      setEditFormData(null);
      // Refetch tasks
      setTasksLoading(true);
      fetchProjectTasks(project.id)
        .then(res => setTasks(Array.isArray(res.data) ? res.data : []))
        .finally(() => setTasksLoading(false));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    setTasksLoading(true);
    await onDeleteTask(project.id, taskId);
    fetchProjectTasks(project.id)
      .then(res => setTasks(Array.isArray(res.data) ? res.data : []))
      .finally(() => setTasksLoading(false));
  };

  const renderTeamLabel = () => {
    if (agentsLoading) return 'Loading agents...';
    if (formData.teamIds.length === 0) return 'Select agents';

    const names = agents
      .filter((a) => formData.teamIds.includes(a.id))
      .map((a) => a.label)
      .filter(Boolean);

    if (names.length === 0) return `${formData.teamIds.length} selected`;
    if (names.length > 2) return `${names.length} selected`;
    return names.join(', ');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        <div className="p-4 bg-blue-800 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold">Project Tasks</h2>
            <p className="text-blue-200 text-xs">{project.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
          {/* Add Task Form */}
          {!readOnly && (
            <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Add Task</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Task Name <span className="text-red-600">*</span></label>
                  <input
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                  />
                  {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Target <span className="text-red-600">*</span></label>
                  <input
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Target"
                    type="number"
                    value={formData.target}
                    onChange={(e) => handleChange('target', e.target.value)}
                  />
                  {formErrors.target && <p className="text-xs text-red-600 mt-1">{formErrors.target}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Task Description</label>
                  <textarea
                    className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px]"
                    placeholder="Add a short description"
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                  />
                </div>
                <div className="md:col-span-2" ref={dropdownRef}>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Team (Agents) <span className="text-red-600">*</span></label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTeamDropdown((prev) => !prev)}
                      className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-50"
                    >
                      <span className="truncate text-left">{renderTeamLabel()}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${showTeamDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showTeamDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {agentsLoading && (
                          <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading agents...
                          </div>
                        )}
                        {!agentsLoading && agents.length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-500">
                            {agentsError || 'No agents available'}
                          </div>
                        )}
                        {!agentsLoading && agents.length > 0 && (
                          <>
                            {/* Select All Option */}
                            <label className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-200 bg-slate-50 text-sm">
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-blue-600 border-slate-300 rounded mr-2"
                                checked={agents.length > 0 && formData.teamIds.length === agents.length}
                                onChange={(e) => handleSelectAllTeams(e.target.checked)}
                              />
                              <span className="font-semibold text-slate-900">Select All</span>
                            </label>
                            {agents.map((agent) => (
                              <label key={agent.id} className="flex items-center px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-blue-600 border-slate-300 rounded mr-2"
                                  checked={formData.teamIds.includes(agent.id)}
                                  onChange={() => toggleTeamSelection(agent.id)}
                                />
                                <span className="text-slate-700">{agent.label || 'Unnamed agent'}</span>
                              </label>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {formErrors.teamIds && <p className="text-xs text-red-600 mt-1">{formErrors.teamIds}</p>}
                  {formData.teamIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {formData.teamIds.map((id) => {
                        const agent = agents.find((a) => a.id === id);
                        return (
                          <span key={id} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {agent?.label || id}
                            <button onClick={() => toggleTeamSelection(id)} className="text-blue-600 hover:text-blue-800">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleAddTask}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isSubmitting ? 'Adding...' : 'Add Task'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TasksModal;
