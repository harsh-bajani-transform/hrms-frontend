/**
 * File: QATrackerReport.jsx
 * Author: Naitik Maisuriya
 * Description: QA Tracker Report - Shows tracker entries for assigned agents with filters
 */
import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Download, Filter, FileDown, Users as UsersIcon, Calendar, RotateCcw, RefreshCw, Edit, Trash2, X } from "lucide-react";
import { toast } from "react-hot-toast";
import * as XLSX from 'xlsx';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { log, logError } from "../../config/environment";
import { useDeviceInfo } from "../../hooks/useDeviceInfo";

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const QATrackerReport = () => {
  const { user } = useAuth();
  const { device_id, device_type } = useDeviceInfo();
  
  // Check if user is QA agent (QA agents should not see edit/delete actions)
  // Use comprehensive role checking like in DashboardPage
  const roleId = user?.role_id;
  const role = user?.role_name || user?.role || '';
  const designation = user?.designation || user?.user_designation || '';
  const isQAAgent = roleId === 5 || 
                    String(designation).toLowerCase() === 'qa' || 
                    String(role).toLowerCase().includes('qa');
  
  const [trackers, setTrackers] = useState([]);
  const [allTrackers, setAllTrackers] = useState([]); // Store all trackers for frontend filtering
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter states - Multi-select for agents
  const [selectedAgents, setSelectedAgents] = useState([]);
  const [startDate, setStartDate] = useState(getTodayDate()); // Default to today
  const [endDate, setEndDate] = useState(getTodayDate()); // Default to today
  const [summary, setSummary] = useState([]);

  // Custom calendar picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Custom dropdown states
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  
  // Edit modal dropdown states
  const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
  const [showEditTaskDropdown, setShowEditTaskDropdown] = useState(false);

  // Store per-hour targets from dropdown API
  const [dropdownTaskMap, setDropdownTaskMap] = useState({});

  // Edit modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTracker, setEditingTracker] = useState(null);
  const [editProjects, setEditProjects] = useState([]);
  const [editTasks, setEditTasks] = useState([]);
  const [editFormData, setEditFormData] = useState({
    project_id: "",
    task_id: "",
    production: "",
    base_target: "",
    tracker_file: null,
  });
  const [editFilePreview, setEditFilePreview] = useState(null);
  const [editFileBase64, setEditFileBase64] = useState(null);
  const [editFileError, setEditFileError] = useState("");
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTracker, setDeletingTracker] = useState(null);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Extract unique agents from trackers for frontend filtering
  const uniqueAgents = useMemo(() => {
    const agentsMap = new Map();
    allTrackers.forEach(tracker => {
      if (tracker.user_id && tracker.user_name) {
        agentsMap.set(tracker.user_id, {
          user_id: tracker.user_id,
          user_name: tracker.user_name
        });
      }
    });
    return Array.from(agentsMap.values()).sort((a, b) => 
      a.user_name.localeCompare(b.user_name)
    );
  }, [allTrackers]);

  // Fetch projects with tasks for edit modal
  const fetchProjectsWithTasks = async () => {
    try {
      log('[QATrackerReport] Fetching projects with tasks for edit modal');
      const payload = {
        dropdown_type: "projects with tasks",
        logged_in_user_id: user?.user_id
      };
      const res = await api.post("/dropdown/get", payload);
      const projectsWithTasks = res.data?.data || [];
      setEditProjects(projectsWithTasks);
      log('[QATrackerReport] Projects with tasks fetched:', projectsWithTasks.length);
    } catch (error) {
      logError('[QATrackerReport] Error fetching projects with tasks:', error);
      setEditProjects([]);
      toast.error("Failed to load projects");
    }
  };

  // Fetch trackers and summary from tracker/view API with only date range (no agent filter in API)
  const fetchData = async () => {
    try {
      setLoading(true);
      let payload = {
        logged_in_user_id: user?.user_id,
      };
      if (startDate) payload.date_from = startDate;
      if (endDate) payload.date_to = endDate;
      // If no date filter, use today's date for both from/to
      if (!startDate && !endDate) {
        const today = getTodayDate();
        payload.date_from = today;
        payload.date_to = today;
      }
      const res = await api.post("/tracker/view", payload);
      const data = res.data?.data || {};
      const fetchedTrackers = Array.isArray(data.trackers) ? data.trackers : [];
      setAllTrackers(fetchedTrackers); // Store all trackers
      setTrackers(fetchedTrackers); // Initially show all
      setSummary(Array.isArray(data.month_summary) ? data.month_summary : []);
    } catch (err) {
      logError('[QATrackerReport] Error fetching tracker/view:', err);
      toast.error("Failed to load tracker data");
      setAllTrackers([]);
      setTrackers([]);
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch tracker data when date filters change
  useEffect(() => {
    if (user?.user_id) {
      fetchData();
    }
  }, [user?.user_id, startDate, endDate]);

  // Filter trackers based on selected agents (frontend filtering)
  useEffect(() => {
    if (selectedAgents.length === 0) {
      // No agents selected, show all trackers
      setTrackers(allTrackers);
    } else {
      // Filter by selected agents
      const filtered = allTrackers.filter(tracker => 
        selectedAgents.includes(String(tracker.user_id))
      );
      setTrackers(filtered);
    }
  }, [selectedAgents, allTrackers]);

  // Remove in-memory filtering; handled by API

  // Format date and time to display format: 3/Feb/2026 and 9:52 PM (UTC)
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '-', time: '-' };
    
    try {
      const dt = new Date(dateTimeStr);
      if (isNaN(dt.getTime())) return { date: '-', time: '-' };
      
      // Format date as: 3/Feb/2026 (UTC)
      const day = dt.getUTCDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[dt.getUTCMonth()];
      const year = dt.getUTCFullYear();
      const date = `${day}/${month}/${year}`;
      
      // Format time as: 9:52 PM (UTC)
      let hours = dt.getUTCHours();
      const minutes = String(dt.getUTCMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12; // Convert to 12-hour format
      const time = `${hours}:${minutes} ${ampm}`;
      
      return { date, time };
    } catch (error) {
      return { date: '-', time: '-' };
    }
  };

  // Format number to 2 decimal places
  const formatDecimal = (value) => {
    if (value === null || value === undefined || value === '') return '0.00';
    const num = Number(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  // Convert yyyy-mm-dd to dd/mm/yyyy for display
  const formatToDisplay = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Convert dd/mm/yyyy to yyyy-mm-dd for storage
  const formatToStorage = (day, month, year) => {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Handle date selection from custom calendar
  const handleDateSelect = (name, dateValue) => {
    if (name === 'start') {
      setStartDate(dateValue);
      setShowStartPicker(false);
    } else if (name === 'end') {
      setEndDate(dateValue);
      setShowEndPicker(false);
    }
  };

  // Generate calendar days
  const generateCalendar = (currentDate) => {
    const date = currentDate ? new Date(currentDate) : new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { year, month, daysInMonth, startingDayOfWeek };
  };

  const CustomDatePicker = ({ name, value, onSelect, show, onClose }) => {
    const [viewDate, setViewDate] = useState(value || new Date().toISOString().split('T')[0]);
    const { year, month, daysInMonth, startingDayOfWeek } = generateCalendar(viewDate);
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const handlePrevMonth = () => {
      const newDate = new Date(year, month - 1, 1);
      setViewDate(newDate.toISOString().split('T')[0]);
    };

    const handleNextMonth = () => {
      const newDate = new Date(year, month + 1, 1);
      setViewDate(newDate.toISOString().split('T')[0]);
    };

    if (!show) return null;

    return (
      <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-xl border-2 border-blue-200 p-3 w-64">
        {/* Month/Year Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="font-bold text-sm text-slate-800">{monthNames[month]} {year}</span>
          <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-bold text-slate-600">{day}</div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: startingDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = formatToStorage(day, month + 1, year);
            const isSelected = dateStr === value;
            return (
              <button
                key={day}
                onClick={() => onSelect(name, dateStr)}
                className={`text-xs p-1.5 rounded hover:bg-blue-100 transition-colors ${
                  isSelected ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="w-full mt-3 text-xs text-slate-600 hover:text-slate-800 font-semibold"
        >
          Close
        </button>
      </div>
    );
  };

  // Multi-Select Dropdown Component for Agents with Checkboxes
  const MultiSelectAgentDropdown = ({ options, selectedValues, onChange, show, onClose }) => {
    if (!show) return null;

    const allSelected = options.length > 0 && selectedValues.length === options.length;

    const handleToggleAgent = (agentId) => {
      const agentIdStr = String(agentId);
      if (selectedValues.includes(agentIdStr)) {
        onChange(selectedValues.filter(id => id !== agentIdStr));
      } else {
        onChange([...selectedValues, agentIdStr]);
      }
    };

    const handleSelectAll = () => {
      if (allSelected) {
        onChange([]);
      } else {
        onChange(options.map(opt => String(opt.user_id)));
      }
    };

    return (
      <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border-2 border-blue-200 max-h-80 overflow-y-auto">
        {/* Agent Options */}
        {options.map((agent) => {
          const agentId = String(agent.user_id);
          const isSelected = selectedValues.includes(agentId);
          
          return (
            <div
              key={agent.user_id}
              onClick={() => handleToggleAgent(agent.user_id)}
              className={`px-4 py-2.5 cursor-pointer transition-all hover:bg-blue-50 ${
                isSelected ? 'bg-blue-50/50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Custom Checkbox */}
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected 
                    ? 'bg-blue-600 border-blue-600' 
                    : 'border-slate-300 bg-white'
                }`}>
                  {isSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${
                  isSelected ? 'text-blue-700 font-semibold' : 'text-slate-700'
                }`}>{agent.user_name}</span>
              </div>
            </div>
          );
        })}
        
        {/* Select All Option at the bottom */}
        {options.length > 0 && (
          <div
            onClick={handleSelectAll}
            className="px-4 py-2.5 cursor-pointer transition-all hover:bg-blue-50 border-t-2 border-slate-200 bg-slate-50 sticky bottom-0"
          >
            <div className="flex items-center gap-3">
              {/* Custom Checkbox for Select All */}
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                allSelected 
                  ? 'bg-blue-600 border-blue-600' 
                  : 'border-slate-300 bg-white'
              }`}>
                {allSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
              </div>
              <span className={`text-sm font-bold ${
                allSelected ? 'text-blue-700' : 'text-slate-700'
              }`}>Select All</span>
            </div>
          </div>
        )}
        
        {/* Close Button */}
        <div className="p-2 border-t border-slate-200 bg-white sticky bottom-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Apply Filter ({selectedValues.length} selected)
          </button>
        </div>
      </div>
    );
  };

  // Custom Dropdown Component for Edit Modal (single select)
  const CustomDropdown = ({ options, value, onChange, placeholder, show, onClose, disabled, valueKey, labelKey }) => {
    if (!show || disabled) return null;

    return (
      <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border-2 border-blue-200 max-h-60 overflow-y-auto">
        {/* All option */}
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange('');
            onClose();
          }}
          className={`px-4 py-2.5 cursor-pointer transition-all border-b border-slate-100 ${
            !value ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-blue-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {!value && (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
            <span className="text-sm">{placeholder}</span>
          </div>
        </div>
        
        {/* Options */}
        {options.map((option) => {
          const optionValue = valueKey ? option[valueKey] : option.user_id;
          const optionLabel = labelKey ? (option[labelKey] || option.label || 'Unknown') : option.user_name;
          
          return (
            <div
              key={optionValue}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(optionValue);
                onClose();
              }}
              className={`px-4 py-2.5 cursor-pointer transition-all ${
                String(value) === String(optionValue)
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'hover:bg-blue-50 text-slate-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {String(value) === String(optionValue) && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                )}
                <span className="text-sm">{optionLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Clear filters
  const handleClearFilters = () => {
    const today = getTodayDate();
    setSelectedAgents([]);
    setStartDate(today);
    setEndDate(today);
  };

  // Handle edit tracker
  const handleEdit = async (tracker) => {
    log('[QATrackerReport] Opening edit modal for tracker:', tracker.tracker_id);
    log('[QATrackerReport] Tracker object:', tracker, 'Keys:', Object.keys(tracker));
    log('[QATrackerReport] User object from context:', user, 'user.user_tenure:', user?.user_tenure);
    setEditingTracker(tracker);
    setShowEditModal(true);
    setLoadingEditData(true);

    try {
      // Fetch projects with tasks if not already fetched
      if (editProjects.length === 0) {
        await fetchProjectsWithTasks();
      }

      // Fetch existing tracker data from tracker/view API
      const payload = {
        logged_in_user_id: user?.user_id,
        device_id: device_id,
        device_type: device_type,
        tracker_id: tracker.tracker_id
      };

      const res = await api.post("/tracker/view", payload);
      const data = res.data?.data || {};
      const trackerData = Array.isArray(data.trackers) && data.trackers.length > 0 
        ? data.trackers[0] 
        : tracker;

      // Set form data with existing values
      setEditFormData({
        project_id: trackerData.project_id || "",
        task_id: trackerData.task_id || "",
        production: trackerData.production || "",
        base_target: trackerData.tenure_target || trackerData.actual_target || "",
        tracker_file: null,
      });

      // Set file preview if tracker has file
      if (trackerData.tracker_file) {
        setEditFilePreview(trackerData.tracker_file);
      }

      // Update tasks based on selected project
      if (trackerData.project_id && editProjects.length > 0) {
        const project = editProjects.find(p => String(p.project_id) === String(trackerData.project_id));
        setEditTasks(project?.tasks || []);
      }

      log('[QATrackerReport] Edit form data loaded:', editFormData);
    } catch (error) {
      logError('[QATrackerReport] Error loading tracker data:', error);
      toast.error("Failed to load tracker data");
    } finally {
      setLoadingEditData(false);
    }
  };

  // Handle delete tracker - Show confirmation modal
  const handleDelete = (tracker) => {
    log('[QATrackerReport] Opening delete modal for tracker:', tracker.tracker_id);
    setDeletingTracker(tracker);
    setShowDeleteModal(true);
  };

  // Confirm delete tracker
  const confirmDelete = async () => {
    if (!deletingTracker) return;

    setSubmittingDelete(true);
    try {
      await api.post("/tracker/delete", { tracker_id: deletingTracker.tracker_id });
      setTrackers(trackers.filter(t => t.tracker_id !== deletingTracker.tracker_id));
      toast.success("Tracker deleted successfully!");
      log('[QATrackerReport] Tracker deleted:', deletingTracker.tracker_id);
      setShowDeleteModal(false);
      setDeletingTracker(null);
    } catch (error) {
      logError('[QATrackerReport] Delete error:', error);
      toast.error("Failed to delete tracker.");
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Close delete modal
  const handleCloseDeleteModal = () => {
    if (submittingDelete) return;
    setShowDeleteModal(false);
    setDeletingTracker(null);
  };

  // Handle edit form field changes
  const handleEditFieldChange = (field, value) => {
    setEditFormData(prev => {
      const updated = { ...prev, [field]: value };

      // If project changes, update tasks
      if (field === 'project_id') {
        const project = editProjects.find(p => String(p.project_id) === String(value));
        log('[QATrackerReport] Project changed:', value, 'Found project:', project);
        setEditTasks(project?.tasks || []);
        
        // Clear task and base target if task doesn't exist in new project
        if (!project?.tasks?.find(t => String(t.task_id) === String(prev.task_id))) {
          updated.task_id = "";
          updated.base_target = "";
        } else {
          // Recalculate base target if task still exists in new project
          const task = project?.tasks?.find(t => String(t.task_id) === String(prev.task_id));
          log('[QATrackerReport] Task object:', task, 'user_tenure:', editingTracker?.user_tenure || user?.user_tenure);
          const userTenure = editingTracker?.user_tenure || user?.user_tenure;
          if (task && userTenure) {
            const perHourTarget = task.task_target || task.per_hour_target || task.target || 0;
            updated.base_target = Number(perHourTarget) * Number(userTenure);
            log('[QATrackerReport] Recalculated base target for existing task:', updated.base_target);
          }
        }
      }

      // If task changes, calculate base target
      if (field === 'task_id' && value) {
        const project = editProjects.find(p => String(p.project_id) === String(updated.project_id));
        const task = project?.tasks?.find(t => String(t.task_id) === String(value));
        log('[QATrackerReport] Task changed:', value, 'Found task:', task, 'All task keys:', task ? Object.keys(task) : 'none');
        const userTenure = editingTracker?.user_tenure || user?.user_tenure;
        log('[QATrackerReport] user_tenure from editingTracker:', editingTracker?.user_tenure, 'from user context:', user?.user_tenure, 'using:', userTenure);
        if (task && userTenure) {
          const perHourTarget = task.task_target || task.per_hour_target || task.target || 0;
          updated.base_target = Number(perHourTarget) * Number(userTenure);
          log('[QATrackerReport] Calculated base target:', updated.base_target, 'per hour:', perHourTarget, 'tenure:', userTenure);
        } else {
          log('[QATrackerReport] Could not calculate - task:', !!task, 'user_tenure:', userTenure);
        }
      }

      return updated;
    });
  };

  // Handle edit file upload
  const handleEditFileChange = async (e) => {
    const fileObj = e.target.files[0];
    if (!fileObj) return;

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileObj.size > maxSize) {
      setEditFileError("File size must not exceed 10MB");
      setEditFormData(prev => ({ ...prev, tracker_file: null, newFile: null }));
      setEditFilePreview(null);
      toast.error("File size exceeds 10MB limit", { duration: 4000 });
      e.target.value = null;
      return;
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv'
    ];

    if (!allowedTypes.includes(fileObj.type)) {
      setEditFileError("Invalid file type. Please upload Excel, PDF, Word, or CSV files.");
      setEditFormData(prev => ({ ...prev, tracker_file: null, newFile: null }));
      setEditFilePreview(null);
      toast.error("Invalid file type", { duration: 4000 });
      e.target.value = null;
      return;
    }

    setEditFileError("");
    // Store file object directly for FormData upload
    setEditFormData(prev => ({ ...prev, tracker_file: fileObj, newFile: fileObj }));
    setEditFilePreview(fileObj.name); // Show filename as preview
    toast.success(`File selected: ${fileObj.name}`);
    log('[QATrackerReport] Edit file selected:', fileObj.name);
  };

  // Handle edit form submit
  const handleEditSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!editFormData.project_id || !editFormData.task_id || !editFormData.production) {
      toast.error("Please fill all required fields");
      return;
    }

    if (editFileError) {
      toast.error("Please fix file upload errors before submitting");
      return;
    }

    setSubmittingEdit(true);

    try {
      // Create FormData for multipart/form-data upload
      const formData = new FormData();
      formData.append('tracker_id', editingTracker.tracker_id);
      formData.append('project_id', Number(editFormData.project_id));
      formData.append('task_id', Number(editFormData.task_id));
      formData.append('user_id', editingTracker.user_id);
      formData.append('production', Number(editFormData.production));
      formData.append('base_target', Number(editFormData.base_target));

      // Add file only if new file was uploaded
      if (editFormData.newFile) {
        formData.append('tracker_file', editFormData.newFile);
        log('[QATrackerReport] Uploading new file:', editFormData.newFile.name);
      }

      log('[QATrackerReport] Submitting tracker update with FormData');
      const res = await api.post("/tracker/update", formData, {
        headers: {
          'Content-Type': undefined // Let browser set multipart/form-data with boundary
        }
      });

      if (res.data?.status === 200 || res.status === 200) {
        toast.success("Tracker updated successfully!");
        setShowEditModal(false);
        setEditingTracker(null);
        setEditFormData({
          project_id: "",
          task_id: "",
          production: "",
          base_target: "",
          tracker_file: null,
          newFile: null
        });
        setEditFilePreview(null);
        setEditFileError("");
        
        // Refresh tracker data
        fetchData();
      } else {
        toast.error(res.data?.message || "Failed to update tracker");
      }
    } catch (error) {
      logError('[QATrackerReport] Error updating tracker:', error);
      toast.error(error?.response?.data?.message || "Failed to update tracker");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Close edit modal
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTracker(null);
    setEditFormData({
      project_id: "",
      task_id: "",
      production: "",
      base_target: "",
      tracker_file: null,
    });
    setEditFilePreview(null);
    setEditFileBase64(null);
    setEditFileError("");
  };

  // Calculate totals from filtered trackers
  const totals = useMemo(() => {
    return trackers.reduce((acc, tracker) => {
      acc.tenureTarget += Number(tracker.tenure_target) || 0;
      acc.production += Number(tracker.production) || 0;
      acc.billableHours += Number(tracker.billable_hours) || 0;
      return acc;
    }, { tenureTarget: 0, production: 0, billableHours: 0 });
  }, [trackers]);

  // Calculate monthly summary from filtered trackers
  const monthlySummary = useMemo(() => {
    const monthlyData = {};
    
    trackers.forEach(tracker => {
      if (!tracker.date_time) return;
      
      // Extract year and month from date_time
      const dateObj = new Date(tracker.date_time);
      const year = dateObj.getFullYear();
      const month = dateObj.getMonth(); // 0-11
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          year,
          month: month + 1,
          monthName: dateObj.toLocaleString('default', { month: 'long' }),
          tenureTarget: 0,
          production: 0,
          billableHours: 0
        };
      }
      
      monthlyData[monthKey].tenureTarget += Number(tracker.tenure_target) || 0;
      monthlyData[monthKey].production += Number(tracker.production) || 0;
      monthlyData[monthKey].billableHours += Number(tracker.billable_hours) || 0;
    });
    
    // Convert to array and sort by date
    return Object.values(monthlyData).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [trackers]);

  // Export to Excel function
  const handleExportToExcel = () => {
    if (trackers.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Prepare data for export
      const exportData = trackers.map((tracker) => ({
        'Date/Time': tracker.date_time ? tracker.date_time : "-",
        'Agent': tracker.user_name || "-",
        'Project': tracker.project_name || "-",
        'Task': tracker.task_name || "-",
        'Per Hour Target': tracker.tenure_target || 0,
        'Production': tracker.production || 0,
        'Billable Hours': tracker.billable_hours !== null && tracker.billable_hours !== undefined
          ? Number(tracker.billable_hours).toFixed(2)
          : "0.00",
        'Has File': tracker.tracker_file ? 'Yes' : 'No'
      }));

      // Add totals row
      exportData.push({
        'Date/Time': '',
        'Agent': '',
        'Project': '',
        'Task': 'TOTALS',
        'Per Hour Target': totals.tenureTarget.toFixed(2),
        'Production': totals.production.toFixed(2),
        'Billable Hours': totals.billableHours.toFixed(2),
        'Has File': ''
      });

      // Create workbook and worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Tracker Report");

      // Generate filename with date range
      const filename = `QA_Tracker_Report_${startDate}_to_${endDate}.xlsx`;

      // Download
      XLSX.writeFile(workbook, filename);
      toast.success("Report exported successfully!");
      log('[QATrackerReport] Excel export completed:', filename);
    } catch (error) {
      logError('[QATrackerReport] Excel export error:', error);
      toast.error("Failed to export data");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <UsersIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight cursor-default">Tracker Report</h2>
                <p className="text-slate-600 text-sm font-medium mt-1 cursor-default">View and manage assigned agents' tracker records</p>
              </div>
            </div>
            <button
              onClick={handleExportToExcel}
              disabled={loading || trackers.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
              title="Export filtered data to Excel"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg p-3 mb-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Start Date */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Start Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatToDisplay(startDate)}
                  readOnly
                  className="w-full px-3 py-1.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all cursor-pointer"
                  placeholder="dd/mm/yyyy"
                />
                <button
                  type="button"
                  onClick={() => setShowStartPicker(!showStartPicker)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-100 rounded transition-colors"
                >
                  <Calendar className="w-4 h-4 text-blue-600" />
                </button>
                <CustomDatePicker 
                  name="start"
                  value={startDate}
                  onSelect={handleDateSelect}
                  show={showStartPicker}
                  onClose={() => setShowStartPicker(false)}
                />
              </div>
            </div>

            {/* End Date */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                End Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formatToDisplay(endDate)}
                  readOnly
                  className="w-full px-3 py-1.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all cursor-pointer"
                  placeholder="dd/mm/yyyy"
                />
                <button
                  type="button"
                  onClick={() => setShowEndPicker(!showEndPicker)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-100 rounded transition-colors"
                >
                  <Calendar className="w-4 h-4 text-blue-600" />
                </button>
                <CustomDatePicker 
                  name="end"
                  value={endDate}
                  onSelect={handleDateSelect}
                  show={showEndPicker}
                  onClose={() => setShowEndPicker(false)}
                />
              </div>
            </div>

            {/* Agent Multi-Select Dropdown */}
            <div className="relative">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                <UsersIcon className="w-3.5 h-3.5 text-blue-600" />
                Filter by Agents
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className="w-full px-3 py-1.5 pr-10 text-sm text-left border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all hover:bg-white"
                >
                  {selectedAgents.length === 0 ? (
                    <span className="text-slate-500">All Agents ({uniqueAgents.length})</span>
                  ) : selectedAgents.length === uniqueAgents.length ? (
                    <span className="text-blue-700 font-semibold">All Agents Selected ({uniqueAgents.length})</span>
                  ) : (
                    <span className="text-blue-700 font-semibold">{selectedAgents.length} Agent{selectedAgents.length > 1 ? 's' : ''} Selected</span>
                  )}
                </button>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
                <MultiSelectAgentDropdown
                  options={uniqueAgents}
                  selectedValues={selectedAgents}
                  onChange={setSelectedAgents}
                  show={showAgentDropdown}
                  onClose={() => setShowAgentDropdown(false)}
                />
              </div>
            </div>
          </div>
          
          {/* Clear Filters and Refresh Buttons */}
          <div className="mt-2 flex justify-end gap-3">
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all duration-200 group"
              type="button"
            >
              <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
              Reset Filters
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-sm shadow-sm hover:shadow-md transition-all duration-200 group"
              type="button"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
              Refresh
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span className="font-medium">{error}</span>
        </div>}

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="min-w-full text-sm text-slate-700 table-fixed">
                <colgroup>
                  <col style={{ width: isQAAgent ? '11%' : '10%' }}/>
                  <col style={{ width: isQAAgent ? '13%' : '11%' }}/>
                  <col style={{ width: isQAAgent ? '16%' : '14%' }}/>
                  <col style={{ width: isQAAgent ? '16%' : '14%' }}/>
                  <col style={{ width: isQAAgent ? '12%' : '10%' }}/>
                  <col style={{ width: isQAAgent ? '12%' : '10%' }}/>
                  <col style={{ width: isQAAgent ? '13%' : '10%' }}/>
                  <col style={{ width: isQAAgent ? '7%' : '6%' }}/>
                  {!isQAAgent && <col style={{ width: '15%' }}/>}
                </colgroup>
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Date/Time</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Agent</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Project</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Task</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Per Hour Target</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Production</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Billable Hours</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-center">File</th>
                    {!isQAAgent && <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={isQAAgent ? "8" : "9"} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-slate-600 font-medium text-base">Loading tracker data...</p>
                  </div>
                </td>
              </tr>
            ) : trackers.length === 0 ? (
              <tr>
                <td colSpan={isQAAgent ? "8" : "9"} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-600 font-medium text-base">No tracker data found for the selected filters</p>
                  </div>
                </td>
              </tr>
            ) : trackers.map((tracker, index) => {
              const { date, time } = formatDateTime(tracker.date_time);
              return (
                <tr 
                  key={tracker.tracker_id || index} 
                  className={`hover:bg-slate-50 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}
                >
                  <td className="px-5 py-3 align-middle">
                    <div className="flex flex-col">
                      <span className="text-slate-800 font-semibold">{date}</span>
                      <span className="text-slate-600 text-xs">{time}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 align-middle font-semibold text-blue-700 whitespace-nowrap">
                    {tracker.user_name || "-"}
                  </td>
                  <td className="px-5 py-3 align-middle whitespace-nowrap">
                    {tracker.project_name || "-"}
                  </td>
                  <td className="px-5 py-3 align-middle whitespace-nowrap">
                    {tracker.task_name || "-"}
                  </td>
                  <td className="px-5 py-3 align-middle whitespace-nowrap text-slate-800">
                    {formatDecimal(tracker.tenure_target || dropdownTaskMap[tracker.task_id])}
                  </td>
                  <td className="px-5 py-3 align-middle font-bold text-green-700 whitespace-nowrap">
                    {formatDecimal(tracker.production)}
                  </td>
                  <td className="px-5 py-3 align-middle font-bold text-purple-700 whitespace-nowrap">
                    {formatDecimal(tracker.billable_hours)}
                  </td>
                  <td className="px-5 py-3 align-middle text-center">
                    {tracker.tracker_file ? (
                      <a
                        href={tracker.tracker_file}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 group-hover:bg-blue-100 rounded-full p-2 shadow-sm"
                        title="Download file"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {!isQAAgent && (
                    <td className="px-5 py-3 align-middle">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(tracker)}
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 hover:bg-blue-100 rounded-full p-2 shadow-sm"
                          title="Edit tracker"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(tracker)}
                          className="inline-flex items-center justify-center text-red-600 hover:text-red-800 transition-colors bg-red-50 hover:bg-red-100 rounded-full p-2 shadow-sm"
                          title="Delete tracker"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
            </div>
          </div>
        </div>

      {/* Totals Summary Card */}
      {!loading && trackers.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200 mt-6">
          <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-blue-600 to-blue-700 rounded-full"></div>
            Summary Totals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Per Hour Target */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-2xl p-6 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2">Per Hour Target</p>
              <p className="text-4xl font-extrabold text-blue-900">{totals.tenureTarget.toFixed(2)}</p>
            </div>
            
            {/* Production */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-2xl p-6 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300">
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Production</p>
              <p className="text-4xl font-extrabold text-green-900">{totals.production.toFixed(2)}</p>
            </div>
            
            {/* Billable Hours */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-6 shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">Billable Hours</p>
              <p className="text-4xl font-extrabold text-purple-900">{totals.billableHours.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

        {/* Loader spinner style */}
        <style>{`
          .loader {
            border: 4px solid #e0e7ef;
            border-top: 4px solid #2563eb;
            border-radius: 50%;
            width: 36px;
            height: 36px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Confirm Delete</h3>
              </div>
              <p className="mb-6 text-slate-600 leading-relaxed">
                Are you sure you want to delete this tracker entry for <span className="font-semibold text-slate-800">{deletingTracker?.user_name}</span>? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseDeleteModal}
                  disabled={submittingDelete}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={submittingDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submittingDelete ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Tracker Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <Edit className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Edit Tracker</h3>
                    <p className="text-blue-100 text-sm">Update tracker details for {editingTracker?.user_name}</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseEditModal}
                  className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleEditSubmit} className="p-6">
                {loadingEditData ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                    <p className="text-slate-600 font-medium">Loading tracker data...</p>
                  </div>
                ) : (
                  <>
                    {/* Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                      {/* Project Selection */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M2 20h20"></path>
                            <path d="m5 9 3-3 3 3"></path>
                            <path d="M2 4h20"></path>
                            <path d="m19 15-3 3-3-3"></path>
                          </svg>
                          Project Name
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowEditProjectDropdown(!showEditProjectDropdown)}
                            className="w-full px-3 py-2.5 pr-10 text-sm text-left border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all"
                          >
                            {editFormData.project_id ? (
                              <span className="text-slate-700">{editProjects.find(p => String(p.project_id) === String(editFormData.project_id))?.project_name || 'Select Project'}</span>
                            ) : (
                              <span className="text-slate-500">Select a project...</span>
                            )}
                          </button>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                          <CustomDropdown
                            options={editProjects}
                            value={editFormData.project_id}
                            onChange={(value) => handleEditFieldChange('project_id', value)}
                            placeholder="Select a project..."
                            show={showEditProjectDropdown}
                            onClose={() => setShowEditProjectDropdown(false)}
                            disabled={false}
                            valueKey="project_id"
                            labelKey="project_name"
                          />
                        </div>
                      </div>

                      {/* Task Selection */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <path d="M9 11 4 6l5-5 5 5-5 5Z"></path>
                            <path d="M13 13 8 8l5-5 5 5-5 5Z"></path>
                            <path d="m20 16-5 5-5-5 5-5 5 5Z"></path>
                          </svg>
                          Task Name
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => editFormData.project_id && setShowEditTaskDropdown(!showEditTaskDropdown)}
                            disabled={!editFormData.project_id}
                            className="w-full px-3 py-2.5 pr-10 text-sm text-left border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {!editFormData.project_id ? (
                              <span className="text-slate-400">Select project first...</span>
                            ) : editFormData.task_id ? (
                              <span className="text-slate-700">{editTasks.find(t => String(t.task_id) === String(editFormData.task_id))?.task_name || editTasks.find(t => String(t.task_id) === String(editFormData.task_id))?.label || 'Select Task'}</span>
                            ) : (
                              <span className="text-slate-500">Select a task...</span>
                            )}
                          </button>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                          <CustomDropdown
                            options={editTasks}
                            value={editFormData.task_id}
                            onChange={(value) => handleEditFieldChange('task_id', value)}
                            placeholder="Select a task..."
                            show={showEditTaskDropdown}
                            onClose={() => setShowEditTaskDropdown(false)}
                            disabled={!editFormData.project_id}
                            valueKey="task_id"
                            labelKey="task_name"
                          />
                        </div>
                      </div>

                      {/* Base Target */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <circle cx="12" cy="12" r="10"></circle>
                            <circle cx="12" cy="12" r="6"></circle>
                            <circle cx="12" cy="12" r="2"></circle>
                          </svg>
                          Base Target
                          <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="w-full bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-300 rounded-lg px-4 py-3 text-sm font-bold text-slate-700 shadow-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                              <rect width="14" height="10" x="5" y="11" rx="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                            <span>{editFormData.base_target || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Production Target */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                            <line x1="12" x2="12" y1="2" y2="22"></line>
                            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                          Production
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm hover:bg-white"
                          value={editFormData.production}
                          onChange={(e) => handleEditFieldChange('production', e.target.value)}
                          placeholder="Enter production"
                        />
                      </div>
                    </div>

                    {/* File Upload Section */}
                    <div className="mb-5">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                          <polyline points="14 2 14 8 20 8"></polyline>
                        </svg>
                        Project Files
                      </label>
                      
                      {/* Existing file preview */}
                      {editFilePreview && !editFormData.tracker_file && (
                        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            </svg>
                            <span className="text-sm font-medium text-blue-700">Existing file attached</span>
                          </div>
                          <a
                            href={editFilePreview}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
                          >
                            View
                          </a>
                        </div>
                      )}

                      <div
                        onClick={() => document.getElementById('edit-file-upload').click()}
                        className={`relative border-2 border-dashed rounded-lg px-6 py-6 text-center transition-all cursor-pointer group ${
                          editFileError 
                            ? 'border-red-300 bg-red-50/30 hover:border-red-400' 
                            : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors ${
                            editFileError ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={editFileError ? 'text-red-600' : 'text-blue-600'}>
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="17 8 12 3 7 8"></polyline>
                              <line x1="12" x2="12" y1="3" y2="15"></line>
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              {editFormData.tracker_file ? (
                                <span className="text-blue-600">{editFormData.tracker_file.name}</span>
                              ) : (
                                <>Click to upload new file <span className="text-blue-600">or drag and drop</span></>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">Max file size: 10MB</p>
                          </div>
                        </div>
                        <input
                          id="edit-file-upload"
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                          onChange={handleEditFileChange}
                          className="hidden"
                        />
                      </div>
                      {editFileError && (
                        <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" x2="12" y1="8" y2="12"></line>
                            <line x1="12" x2="12.01" y1="16" y2="16"></line>
                          </svg>
                          {editFileError}
                        </p>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center gap-4 pt-3 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={handleCloseEditModal}
                        className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingEdit}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {submittingEdit ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Updating...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Update Tracker
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QATrackerReport;
