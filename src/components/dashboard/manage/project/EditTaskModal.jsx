import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { X } from 'lucide-react';
import { updateTask } from '../../../../services/projectService';
import { fetchDropdown } from '../../../../services/dropdownService';

const EditTaskModal = ({
  open,
  onClose,
  task,
  projectId,
  onTaskUpdated
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target: '',
    teamIds: [],
    // assistantManagerIds: [],
    // qaManagerIds: [],
  });
  // Removed Assistant and QA Manager fields
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState('');

  useEffect(() => {
    if (open && task) {
      let teamIds = [];
      if (Array.isArray(task.task_team)) {
        teamIds = task.task_team.map(id => String(id));
      } else if (Array.isArray(task.task_team_id)) {
        teamIds = task.task_team_id.map(id => String(id));
      } else if (Array.isArray(task.teamIds)) {
        teamIds = task.teamIds.map(id => String(id));
      }
      setFormData({
        name: task.task_name || task.name || '',
        description: task.task_description || task.description || '',
        target: task.task_target || task.target || '',
        teamIds,
      });
      setShowTeamDropdown(false);
    } else if (!open) {
      // Reset form data when modal closes to avoid stale data
      setFormData({
        name: '',
        description: '',
        target: '',
        teamIds: [],
      });
      setShowTeamDropdown(false);
    }
  }, [open, task]);

  useEffect(() => {
    const loadAgents = async () => {
      setAgentsLoading(true);
      setAgentsError('');
      try {
        const data = await fetchDropdown('agent', projectId);
        const normalized = (data || []).map((item) => {
          const candidate = Array.isArray(item) ? item[0] : item;
          const id = candidate?.user_id || candidate?.team_id || candidate?.id;
          const label = candidate?.label || candidate?.name || candidate?.user_name || candidate?.team_name || '';
          return id ? { id: String(id), label } : null;
        }).filter(Boolean);
        setAgents(normalized);
      } catch (error) {
        setAgentsError('Unable to load agents');
      } finally {
        setAgentsLoading(false);
      }
    };
    loadAgents();
  }, [projectId]);
  // Multi-select handlers for assistant managers and QA managers
  // Removed Assistant/QA selection handlers

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

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

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'Task name is required';
    if (!formData.target) {
      errors.target = 'Target is required';
    } else if (Number(formData.target) <= 0) {
      errors.target = 'Target must be greater than 0';
    }
    if (formData.teamIds.length === 0) errors.teamIds = 'Select at least one agent';
    // Removed Assistant/QA validation
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    // Log all selected data for debugging
    console.log('Submitting Task Edit:', {
      teamIds: formData.teamIds,
    });
    const payload = {
      task_id: task.task_id || task.id,
      project_id: projectId,
      task_name: formData.name,
      task_description: formData.description,
      task_target: formData.target,
      task_team_id: formData.teamIds.map(id => (isNaN(id) ? id : Number(id))),
      // assistant_manager_ids and qa_manager_ids removed
    };
    try {
      const res = await updateTask(payload);
      setIsSubmitting(false);
      if (res && (res.status === 200 || res.success || res.updated || res.message === 'Task updated successfully')) {
        toast.success('Task updated successfully');
        onTaskUpdated && onTaskUpdated();
        onClose();
      } else {
        setFormErrors({ submit: res?.message || 'Failed to update task' });
      }
    } catch (err) {
      setIsSubmitting(false);
      setFormErrors({ submit: err?.message || 'Failed to update task' });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
        <div className="p-4 bg-blue-800 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-lg font-bold text-left">Edit Task</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
            title="Close"
            aria-label="Close"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white">
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-700 mb-3 text-left">Edit Task</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 text-left">Task Name <span className="text-red-600">*</span></label>
                <input
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task name"
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  disabled={isSubmitting}
                />
                {formErrors.name && <p className="text-xs text-red-600 mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 text-left">Target <span className="text-red-600">*</span></label>
                <input
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Target"
                  type="number"
                  value={formData.target}
                  onChange={e => handleChange('target', e.target.value)}
                  disabled={isSubmitting}
                />
                {formErrors.target && <p className="text-xs text-red-600 mt-1">{formErrors.target}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1 text-left">Task Description</label>
                <textarea
                  className="w-full text-sm p-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[70px]"
                  placeholder="Add a short description"
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1 text-left">Team (Agents) <span className="text-red-600">*</span></label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTeamDropdown((prev) => !prev)}
                    className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-50"
                  >
                    <span className="truncate text-left">
                      {formData.teamIds.length === 0
                        ? (agentsLoading ? 'Loading agents...' : 'Select agents')
                        : agents
                            .filter((a) => formData.teamIds.includes(a.id))
                            .map((a) => a.label)
                            .filter(Boolean)
                            .join(', ') || `${formData.teamIds.length} selected`}
                    </span>
                  </button>
                  {showTeamDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {agentsLoading && (
                        <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
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
                            &times;
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Assistant Project Manager(s) and QA Manager(s) fields removed */}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
            {formErrors.submit && <div className="text-red-500 text-xs mb-2">{formErrors.submit}</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTaskModal;
