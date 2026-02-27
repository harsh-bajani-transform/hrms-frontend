
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import AppLayout from "../../layouts/AppLayout";
import api from "../../services/api";
import TrackerTable from "./TrackerTable";
import { useDeviceInfo } from '../../hooks/useDeviceInfo';
import { fileToBase64 } from "../../utils/fileToBase64";
import { useAuth } from "../../context/AuthContext";
import { log, logError } from "../../config/environment";
import SearchableSelect from "../common/SearchableSelect";
import { Briefcase, ListChecks, Clock } from "lucide-react";




const AgentDashboard = ({ embedded = false }) => {
  console.log('🟢 AgentDashboard is rendering, embedded:', embedded);
  // Auth context for user info
  const { user } = useAuth();
  // Determine if user is admin/superadmin
  const isAdmin = user?.role_name === 'admin' || user?.role_name === 'superadmin' || user?.isSuperAdmin;

  // Device info
  const { device_id, device_type } = useDeviceInfo();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [viewAll, setViewAll] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [shiftType, setShiftType] = useState("day");
  const [baseTarget, setBaseTarget] = useState("");
  const [baseTargetLoading, setBaseTargetLoading] = useState(false);
  const [productionTarget, setProductionTarget] = useState("");
  const [trackerNote, setTrackerNote] = useState("");
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const [fileError, setFileError] = useState("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validation state
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [, forceUpdate] = useState(0);

  // Date state for header (default to today)
  const [entryDate, setEntryDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  // Fetch projects with tasks for tracker form from dropdown/get API (fetch only once on mount or user change)
  useEffect(() => {
    const fetchProjectsWithTasks = async () => {
      try {
        setLoadingProjects(true);
        log('[AgentDashboard] Fetching projects with tasks from dropdown/get API');
        const payload = {
          dropdown_type: "projects with tasks",
          logged_in_user_id: user?.user_id
        };
        const res = await api.post("/dropdown/get", payload);
        const projectsWithTasks = res.data?.data || [];
        setProjects(projectsWithTasks);
      } catch (error) {
        logError('[AgentDashboard] Error fetching projects with tasks:', error);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjectsWithTasks();
  }, [user?.user_id]);

  // Update tasks when project changes
  useEffect(() => {
    if (!selectedProject) {
      setTasks([]);
      setSelectedTask("");
      setBaseTarget("");
      return;
    }
    setLoadingTasks(true);
    const project = projects.find(p => String(p.project_id) === String(selectedProject));
    setTasks(project?.tasks || []);
    // Only clear selectedTask if it is not in the new task list
    if (!project?.tasks?.find(t => String(t.task_id) === String(selectedTask))) {
      setSelectedTask("");
      setBaseTarget("");
    }
    setLoadingTasks(false);
  }, [selectedProject, projects]);



  // Update tasks when project changes
  useEffect(() => {
    if (!selectedProject) {
      setTasks([]);
      setSelectedTask("");
      setBaseTarget("");
      return;
    }
    setLoadingTasks(true);
    const project = projects.find(p => String(p.project_id) === String(selectedProject));
    setTasks(project?.tasks || []);
    // Only clear selectedTask if it is not in the new task list
    if (!project?.tasks?.find(t => String(t.task_id) === String(selectedTask))) {
      setSelectedTask("");
      setBaseTarget("");
    }
    setLoadingTasks(false);
  }, [selectedProject, projects]);



  // Calculate base target as user_tenure * task_target
  useEffect(() => {
    if (!selectedProject || !selectedTask || !user?.user_tenure) {
      setBaseTarget("");
      return;
    }
    setBaseTargetLoading(true);
    const project = projects.find(p => String(p.project_id) === String(selectedProject));
    const task = project?.tasks?.find(t => String(t.task_id) === String(selectedTask));
    if (task && user.user_tenure) {
      const calculated = Number(task.task_target) * Number(user.user_tenure);
      setBaseTarget(calculated.toFixed(2));
    } else {
      setBaseTarget("");
    }
    setBaseTargetLoading(false);
  }, [selectedProject, selectedTask, projects, user]);

  // Handle file upload with 10MB size validation
  const handleFileChange = async (e) => {
    const fileObj = e.target.files[0];
    if (!fileObj) return;
    
    // Validate file size (10MB = 10485760 bytes)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (fileObj.size > maxSize) {
      setFileError("File size must not exceed 10MB");
      setFile(null);
      setFilePreview(null);
      setFileBase64(null);
      toast.error("File size exceeds 10MB limit", { duration: 4000 });
      // Reset the input
      e.target.value = null;
      return;
    }
    
    // Clear any previous error
    setFileError("");
    
    log('[AgentDashboard] File selected:', fileObj.name);
    setFile(fileObj);
    setFilePreview(URL.createObjectURL(fileObj));
    
    try {
      const base64 = await fileToBase64(fileObj);
      setFileBase64(base64);
      log('[AgentDashboard] File converted to base64');
    } catch (error) {
      logError('[AgentDashboard] Error converting file:', error);
      setFileBase64(null);
      setFileError("Failed to process file");
      toast.error("Failed to process file");
    }
  };


  // Live validation function
  const validate = () => {
    const newErrors = {};
    if (!selectedProject) newErrors.selectedProject = "Project is required.";
    if (!selectedTask) newErrors.selectedTask = "Task is required.";
    if (!shiftType) newErrors.shiftType = "Shift is required.";
    if (!baseTarget) newErrors.baseTarget = "Base Target is required.";
    if (!productionTarget) newErrors.productionTarget = "Production Target is required.";
    else if (isNaN(Number(productionTarget)) || Number(productionTarget) < 0) newErrors.productionTarget = "Enter a valid number.";
    else if (baseTarget && Number(productionTarget) > (Number(baseTarget) * 2)) {
      newErrors.productionTarget = `Production cannot exceed ${(Number(baseTarget) * 2).toFixed(2)} (double of base target).`;
    }
    return newErrors;
  };

  // Live validation on field change
  useEffect(() => {
    setErrors(validate());
    // eslint-disable-next-line
  }, [selectedProject, selectedTask, shiftType, baseTarget, productionTarget]);

  // Handle blur for live validation
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setErrors(validate());
  };

  // Simulate backend validation (replace with real API call)
  const fakeBackendValidate = async () => {
    // Example: backend returns error if productionTarget > 10000
    if (Number(productionTarget) > 10000) {
      return { productionTarget: "Production Target cannot exceed 10000." };
    }
    return {};
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched to show all errors
    setTouched({ 
      selectedProject: true, 
      selectedTask: true, 
      shiftType: true,
      baseTarget: true, 
      productionTarget: true 
    });
    
    setTimeout(async () => {
      const clientErrors = validate();
      setErrors(clientErrors);
      forceUpdate(n => n + 1);
      
      // Check for validation errors or file error
      if (Object.keys(clientErrors).length > 0) {
        return;
      }
      
      if (fileError) {
        toast.error("Please fix file upload errors before submitting", { duration: 4000 });
        return;
      }
      
      setSubmitting(true);
      
      // Validate again before submission to ensure all fields are present
      if (!selectedProject || !selectedTask || !shiftType || !productionTarget) {
        toast.error("Please fill in all required fields");
        setSubmitting(false);
        return;
      }
      
      // Prepare FormData payload for /tracker/add (multipart/form-data)
      const formData = new FormData();
      formData.append('project_id', Number(selectedProject));
      formData.append('task_id', Number(selectedTask));
      formData.append('shift', shiftType);
      formData.append('user_id', user?.user_id);
      formData.append('production', Number(productionTarget));
      formData.append('tenure_target', Number(baseTarget));
      
      // Add tracker_note if provided (optional field)
      if (trackerNote && trackerNote.trim()) {
        formData.append('tracker_note', trackerNote.trim());
      }
      
      // Append the actual file if it exists
      if (file) {
        formData.append('tracker_file', file);
      }
      
      try {
        log('[AgentDashboard] Submitting tracker with FormData');
        const res = await api.post("/tracker/add", formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        // Log full response
        console.log('[AgentDashboard] Full API Response:', res);
        console.log('[AgentDashboard] Response Data:', res.data);
        console.log('[AgentDashboard] Response Status:', res.status);
        
        if (res.data?.status === 201 || res.status === 201 || res.status === 200) {
          log('[AgentDashboard] Tracker added successfully');
          toast.success("Tracker added successfully!");
          
          // Reset form fields
          setSelectedProject("");
          setSelectedTask("");
          setBaseTarget("");
          setProductionTarget("");
          setTrackerNote("");
          setFile(null);
          setFilePreview(null);
          setFileBase64(null);
          setFileError("");
          setTouched({});
          
          // Automatically switch to "View All" to show the newly added tracker
          setTimeout(() => {
            setViewAll(true);
          }, 500);
        } else {
          logError('[AgentDashboard] Unexpected response:', res.data);
          toast.error(res.data?.message || "Failed to add tracker.");
        }
      } catch (err) {
        logError('[AgentDashboard] Error submitting tracker:', err);
        toast.error(err?.response?.data?.message || err?.message || "Failed to add tracker.");
      } finally {
        setSubmitting(false);
      }
    }, 0);
  };

  // Handle view all data
  const handleViewAll = () => setViewAll(true);
  const handleBackToForm = () => setViewAll(false);

  const content = (
    <>
      {viewAll ? (
        <TrackerTable
          userId={isAdmin ? null : user?.user_id}
          isAdmin={isAdmin}
          projects={projects}
          tasks={allTasks}
          users={allUsers}
          onClose={handleBackToForm}
        />
      ) : (
        <div className="space-y-8 max-w-7xl mx-auto py-5">
          {/* Data Entry Form */}
          <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
            {/* Modern Header */}
            <div className="w-full max-w-7xl bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl px-8 py-5 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight cursor-default">Production Tracker</h2>
                    <p className="text-blue-100 text-sm font-medium mt-1 cursor-default">Logged in as <span className="font-semibold text-white">{user?.user_name || user?.name || "-"}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2.5 border border-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2"></rect>
                    <line x1="16" x2="16" y1="2" y2="6"></line>
                    <line x1="8" x2="8" y1="2" y2="6"></line>
                    <line x1="3" x2="21" y1="10" y2="10"></line>
                  </svg>
                  <span className="text-white font-semibold text-sm">{new Date(entryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <form
              className="bg-white rounded-b-2xl shadow-2xl p-6 w-full max-w-7xl border border-blue-50"
              onSubmit={handleSubmit}
            >
              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-5">
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
                  <SearchableSelect
                    value={selectedProject}
                    onChange={(value) => {
                      setSelectedProject(value);
                      handleBlur('selectedProject');
                    }}
                    options={[
                      { value: '', label: 'Select a project...' },
                      ...projects.map(p => ({ value: String(p.project_id), label: p.project_name }))
                    ]}
                    icon={Briefcase}
                    placeholder="Select a project..."
                    disabled={loadingProjects}
                  />
                  {touched.selectedProject && errors.selectedProject && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" x2="12" y1="8" y2="12"></line>
                        <line x1="12" x2="12.01" y1="16" y2="16"></line>
                      </svg>
                      {errors.selectedProject}
                    </p>
                  )}
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
                  <SearchableSelect
                    value={selectedTask}
                    onChange={(value) => {
                      const taskValue = String(value);
                      setSelectedTask(taskValue);
                      handleBlur('selectedTask');
                      log('[AgentDashboard] Task selected:', taskValue);
                      setTimeout(() => {
                        const project = projects.find(p => String(p.project_id) === String(selectedProject));
                        const task = project?.tasks?.find(t => String(t.task_id) === String(taskValue));
                        if (task && user?.user_tenure) {
                          const calculated = Number(task.task_target) * Number(user.user_tenure);
                          setBaseTarget(calculated.toFixed(2));
                        } else {
                          setBaseTarget("");
                        }
                      }, 0);
                    }}
                    options={[
                      { value: '', label: 'Select a task...' },
                      ...tasks.map(t => ({ value: String(t.task_id), label: t.task_name || t.label }))
                    ]}
                    icon={ListChecks}
                    placeholder="Select a task..."
                    disabled={!selectedProject || loadingTasks}
                  />
                  {touched.selectedTask && errors.selectedTask && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" x2="12" y1="8" y2="12"></line>
                        <line x1="12" x2="12.01" y1="16" y2="16"></line>
                      </svg>
                      {errors.selectedTask}
                    </p>
                  )}
                </div>

                {/* Shift Selection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Shift
                    <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    value={shiftType}
                    onChange={(value) => {
                      setShiftType(value);
                      handleBlur('shiftType');
                    }}
                    options={[
                      { value: 'day', label: 'Day' },
                      { value: 'night', label: 'Night' }
                    ]}
                    icon={Clock}
                    placeholder="Select shift..."
                    disabled={false}
                  />
                  {touched.shiftType && errors.shiftType && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" x2="12" y1="8" y2="12"></line>
                        <line x1="12" x2="12.01" y1="16" y2="16"></line>
                      </svg>
                      {errors.shiftType}
                    </p>
                  )}
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                        <rect width="14" height="10" x="5" y="11" rx="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>{baseTargetLoading ? 'Calculating...' : (baseTarget ? Number(baseTarget).toFixed(2) : '—')}</span>
                    </div>
                  </div>
                  {touched.baseTarget && errors.baseTarget && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" x2="12" y1="8" y2="12"></line>
                        <line x1="12" x2="12.01" y1="16" y2="16"></line>
                      </svg>
                      {errors.baseTarget}
                    </p>
                  )}
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
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none">
                      <line x1="12" x2="12" y1="2" y2="22"></line>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                    </svg>
                    <input
                      type="text"
                      className={`w-full bg-slate-50 border rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 transition-all shadow-sm hover:bg-white ${
                        touched.productionTarget && errors.productionTarget
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
                          : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                      value={productionTarget}
                      onChange={e => setProductionTarget(e.target.value)}
                      onBlur={(e) => {
                        handleBlur('productionTarget');
                        // Format to 2 decimal places
                        const value = e.target.value.trim();
                        if (value && !isNaN(value)) {
                          setProductionTarget(parseFloat(value).toFixed(2));
                        }
                      }}
                      placeholder="Enter production"
                    />
                  </div>
                  {touched.productionTarget && errors.productionTarget && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" x2="12" y1="8" y2="12"></line>
                        <line x1="12" x2="12.01" y1="16" y2="16"></line>
                      </svg>
                      {errors.productionTarget}
                    </p>
                  )}
                </div>

                {/* File Upload Section - Spans 2 rows */}
                <div className="space-y-2 md:row-span-2">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wide">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    Project Files
                  </label>
                  <div
                    onClick={() => document.getElementById('custom-file-upload').click()}
                    className={`relative h-[182px] flex items-center justify-center border-2 border-dashed rounded-lg px-4 py-4 text-center transition-all cursor-pointer group ${
                      fileError 
                        ? 'border-red-300 bg-red-50/30 hover:border-red-400' 
                        : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors ${
                        fileError ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={fileError ? 'text-red-600' : 'text-blue-600'}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" x2="12" y1="3" y2="15"></line>
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700">
                          {file ? (
                            <span className="text-blue-600 break-all">{file.name}</span>
                          ) : (
                            <>Click to <span className="text-blue-600">upload</span></>
                          )}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">Max: 10MB</p>
                      </div>
                    </div>
                    <input
                      id="custom-file-upload"
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                  {fileError && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" x2="12" y1="8" y2="12"></line>
                        <line x1="12" x2="12.01" y1="16" y2="16"></line>
                      </svg>
                      {fileError}
                    </p>
                  )}
                </div>

                {/* Notes Field - Spans 2 columns */}
                <div className="space-y-2 md:col-span-2">
                  <label className="flex items-center justify-between text-sm font-bold text-slate-700 uppercase tracking-wide">
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                      Notes
                    </span>
                    <span className={`text-xs font-medium ${
                      trackerNote.length > 200 ? 'text-red-600' : 'text-slate-500'
                    }`}>
                      {trackerNote.length}/200
                    </span>
                  </label>
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-3 text-blue-600 pointer-events-none">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    <textarea
                      rows="3"
                      maxLength="200"
                      className={`w-full bg-slate-50 border rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 transition-all shadow-sm hover:bg-white resize-none ${
                        trackerNote.length > 200 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-100' 
                          : 'border-slate-300 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                      value={trackerNote}
                      onChange={e => setTrackerNote(e.target.value)}
                      placeholder="Add any additional notes... (Optional)"
                    />
                  </div>
                  {trackerNote.length > 200 && (
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" x2="12" y1="8" y2="12"></line>
                        <line x1="12" x2="12.01" y1="16" y2="16"></line>
                      </svg>
                      Notes cannot exceed 200 characters
                    </p>
                  )}
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-4 pt-3 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      Submit Entry
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleViewAll}
                  className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                  View All Data
                </button>
              </div>
            </form>
        </div>
        </div>
      )}
    </>
  );

  return embedded ? content : <AppLayout>{content}</AppLayout>;
}

export default AgentDashboard;
