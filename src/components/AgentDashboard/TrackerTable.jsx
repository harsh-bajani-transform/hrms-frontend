/**
 * File: TrackerTable.jsx
 * Author: Naitik Maisuriya
 * Description: Displays all tracker entries in a table, resolves project/task names, supports file download and delete actions.
 */
import React, { useEffect, useState, useMemo } from "react";
import { Download, Trash2, Filter, FileDown, RotateCcw, RefreshCw, FolderOpen, ClipboardList, Info } from "lucide-react";
import { toast } from "react-hot-toast";
import * as XLSX from 'xlsx';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { log, logError } from "../../config/environment";
import { DateRangePicker } from '../common/CustomCalendar';
import SearchableSelect from '../common/SearchableSelect';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const TrackerTable = ({ userId, projects, onClose }) => {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [error, setError] = useState("");

  // Filter states
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [startDate, setStartDate] = useState(getTodayDate()); // Default to today
  const [endDate, setEndDate] = useState(getTodayDate()); // Default to today


  // Get tasks for selected project
  const availableTasks = useMemo(() => {
    if (!selectedProject) return [];
    const project = projects.find(p => String(p.project_id) === String(selectedProject));
    return project?.tasks || [];
  }, [selectedProject, projects]);



  // Lookup helpers (use new projects-with-tasks structure)
  const getProjectName = (id) => {
    const project = projects.find(p => String(p.project_id) === String(id));
    return (tracker && tracker.project_name) || project?.project_name || "-";
  };
  
  const getTaskName = (task_id, project_id) => {
    const project = projects.find(p => String(p.project_id) === String(project_id));
    return (tracker && tracker.task_name) || taskNameMap[String(task_id)] || (projects.find(p => String(p.project_id) === String(project_id))?.tasks?.find(t => String(t.task_id) === String(task_id))?.label) || "-";
  };
  // Check if tracker entry is from today
  const isToday = (dateTime) => {
    if (!dateTime) return false;
    const trackerDate = new Date(dateTime);
    const today = new Date();
    return (
      trackerDate.getFullYear() === today.getFullYear() &&
      trackerDate.getMonth() === today.getMonth() &&
      trackerDate.getDate() === today.getDate()
    );
  };
  // Fetch tracker data with filters
  // Fetch today's data on mount, and filtered data when filters are set
  useEffect(() => {
    if (!userId || !user) return;

    const fetchTrackers = async () => {
      try {
        setLoading(true);
        setError("");

        // If no filters, fetch today's data only
        let payload = {
          logged_in_user_id: userId,
          device_id: user.device_id || '',
          device_type: user.device_type || '',
        };

        // If any filter is set, add to payload
        if (selectedProject) payload.project_id = selectedProject;
        if (selectedTask) payload.task_id = selectedTask;
        if (startDate) payload.date_from = startDate;
        if (endDate) payload.date_to = endDate;

        // If no date filter, use today's date for both from/to
        if (!startDate && !endDate) {
          const today = getTodayDate();
          payload.date_from = today;
          payload.date_to = today;
        }

        log('[TrackerTable] Fetching trackers with filters:', payload);
        const res = await api.post("/tracker/view", payload);
        if (res.status === 200 && res.data?.data) {
          const responseData = res.data.data;
          const fetchedTrackers = responseData.trackers || [];
          // Enrich with project/task names for display
          const enrichedTrackers = fetchedTrackers.map(tracker => ({
            ...tracker,
            project_name: tracker.project_name || getProjectName(tracker.project_id),
            task_name: tracker.task_name || getTaskName(tracker.task_id, tracker.project_id),
          }));
          log('[TrackerTable] Fetched trackers:', enrichedTrackers.length);
          if (enrichedTrackers.length > 0) {
            log('[TrackerTable] Latest tracker data:', enrichedTrackers[0]);
          }
          setTrackers(enrichedTrackers);
        } else {
          setTrackers([]);
        }
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || "Unknown error";
        const errorMsg = "Failed to fetch tracker data: " + msg;
        logError('[TrackerTable] Error fetching trackers:', errorMsg);
        setError(errorMsg);
        setTrackers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTrackers();
  }, [userId, user, startDate, endDate, selectedProject, selectedTask, projects]);

  // Debug: Log tracker data for different roles
  useEffect(() => {
    if (!trackers || !user) return;
    const roleRaw = user?.role_name || user?.user_role || user?.role || '';
    const role = String(roleRaw).toLowerCase();
    const userId = user?.user_id || user?.id || '-';
    // Debug: log user object and role values
    console.log('[TrackerTable Debug] user:', user);
    console.log('[TrackerTable Debug] roleRaw:', roleRaw, '| role:', role, '| userId:', userId);
    if (role.includes('qa')) {
      console.log(`[QA Agent][user_id: ${userId}][role: ${roleRaw}] TrackerTable data:`, trackers);
    } else if (role.includes('assistant manager') || role.includes('asst')) {
      console.log(`[Assistant Manager][user_id: ${userId}][role: ${roleRaw}] TrackerTable data:`, trackers);
    } else if ((role.includes('agent') && !role.includes('qa')) || Number(user?.role_id) === 6) {
      console.log(`[Agent][user_id: ${userId}][role: ${roleRaw}] TrackerTable data:`, trackers);
    } else {
      console.log(`[Other Role][user_id: ${userId}][role: ${roleRaw}] TrackerTable data:`, trackers);
    }
  }, [trackers, user]);

  // Format date and time to display format: Returns object with date and time separate
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '-', time: '' };
    
    try {
      const date = new Date(dateTimeStr);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return { date: dateTimeStr, time: '' };
      
      // Month names abbreviated
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      // Get date components in UTC
      const day = date.getUTCDate();
      const month = monthNames[date.getUTCMonth()];
      const year = date.getUTCFullYear();
      
      // Get time components in UTC
      let hours = date.getUTCHours();
      const minutes = date.getUTCMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      // Convert to 12-hour format
      hours = hours % 12;
      hours = hours ? hours : 12; // 0 should be 12
      const minutesStr = String(minutes).padStart(2, '0');
      
      return {
        date: `${day}/${month}/${year}`,
        time: `${hours}:${minutesStr} ${ampm}`
      };
    } catch (error) {
      return { date: dateTimeStr, time: '' };
    }
  };

  const handleDelete = (tracker_id) => setDeleteConfirm(tracker_id);
  
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      setDeletingId(deleteConfirm);
      setError("");
      
      log('[TrackerTable] Deleting tracker:', deleteConfirm);
      
      await api.post("/tracker/delete", { tracker_id: deleteConfirm });
      
      setTrackers(trackers.filter(t => t.tracker_id !== deleteConfirm));
      setDeleteConfirm(null);
      toast.success("Tracker deleted successfully!");
      
      log('[TrackerTable] Tracker deleted successfully');
    } catch (err) {
      const errorMsg = "Delete failed. Please try again.";
      logError('[TrackerTable] Delete error:', err);
      setError(errorMsg);
      toast.error("Failed to delete tracker.");
    } finally {
      setDeletingId(null);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    const today = getTodayDate();
    setSelectedProject("");
    setSelectedTask("");
    setStartDate(today);
    setEndDate(today);
  };

  // Refresh/Reload data
  const handleRefresh = async () => {
    if (!userId || !user) return;

    try {
      setLoading(true);
      setError("");

      let payload = {
        logged_in_user_id: userId,
        device_id: user.device_id || '',
        device_type: user.device_type || '',
      };

      if (selectedProject) payload.project_id = selectedProject;
      if (selectedTask) payload.task_id = selectedTask;
      if (startDate) payload.date_from = startDate;
      if (endDate) payload.date_to = endDate;

      if (!startDate && !endDate) {
        const today = getTodayDate();
        payload.date_from = today;
        payload.date_to = today;
      }

      log('[TrackerTable] Refreshing trackers with filters:', payload);
      const res = await api.post("/tracker/view", payload);
      if (res.status === 200 && res.data?.data) {
        const responseData = res.data.data;
        const fetchedTrackers = responseData.trackers || [];
        const enrichedTrackers = fetchedTrackers.map(tracker => ({
          ...tracker,
          project_name: tracker.project_name || getProjectName(tracker.project_id),
          task_name: tracker.task_name || getTaskName(tracker.task_id, tracker.project_id),
        }));
        setTrackers(enrichedTrackers);
        toast.success("Data refreshed successfully!");
      } else {
        setTrackers([]);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Unknown error";
      const errorMsg = "Failed to refresh data: " + msg;
      logError('[TrackerTable] Refresh error:', errorMsg);
      setError(errorMsg);
      toast.error("Failed to refresh data");
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from filtered trackers
  // Always use tenure_target from tracker/view for all roles
  const totals = useMemo(() => {
    return trackers.reduce((acc, tracker) => {
      let perHourTarget = Number(tracker.tenure_target);
      acc.tenureTarget += perHourTarget;
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
        'Project': tracker.project_name || getProjectName(tracker.project_id),
        'Task': tracker.task_name || '-',
        // Always show tenure_target from tracker/view for all roles
        'Per Hour Target': tracker.tenure_target ?? 0,
        'Production': tracker.production || 0,
        'Billable Hours': tracker.billable_hours !== null && tracker.billable_hours !== undefined
          ? Number(tracker.billable_hours).toFixed(2)
          : "0.00",
        'Has File': tracker.tracker_file ? 'Yes' : 'No'
      }));

      // Add totals row
      exportData.push({
        'Date/Time': '',
        'Project': '',
        'Task': 'TOTAL',
        'Per Hour Target': totals.tenureTarget.toFixed(2),
        'Production': totals.production.toFixed(2),
        'Billable Hours': totals.billableHours.toFixed(2),
        'Has File': ''
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 18 }, // Date/Time
        { wch: 20 }, // Project
        { wch: 25 }, // Task
        { wch: 15 }, // Tenure Target
        { wch: 12 }, // Production
        { wch: 15 }, // Billable Hours
        { wch: 10 }  // Has File
      ];

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Trackers');

      // Generate filename with date range
      const filename = `Trackers_${startDate}_to_${endDate}.xlsx`;

      // Download file
      XLSX.writeFile(workbook, filename);

      toast.success(`Exported ${trackers.length} records successfully!`);
      log('[TrackerTable] Excel export successful:', filename);
    } catch (err) {
      logError('[TrackerTable] Excel export error:', err);
      toast.error("Failed to export data");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M3 3h18v18H3z"/>
                  <path d="M8 8h8M8 12h8M8 16h5"/>
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight cursor-default">All Trackers</h2>
                <p className="text-slate-600 text-sm font-medium mt-1 cursor-default">View and manage production records</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleExportToExcel}
                disabled={loading || trackers.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                title="Export filtered data to Excel"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button 
                onClick={onClose} 
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all"
              >
                Back to Form
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg p-3 mb-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date Range Picker */}
            <div className="lg:col-span-2">
              <DateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                noWrapper={true}
                showClearButton={false}
              />
            </div>

            {/* Project Dropdown */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase mb-1.5">
                <FolderOpen className="w-3 h-3 text-blue-600" />
                Project
              </label>
              <SearchableSelect
                icon={FolderOpen}
                value={selectedProject}
                onChange={(val) => {
                  setSelectedProject(val);
                  setSelectedTask('');
                }}
                options={projects.map(p => ({ value: p.project_id, label: p.project_name }))}
                placeholder="All Projects"
              />
            </div>

            {/* Task Dropdown */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase mb-1.5">
                <ClipboardList className="w-3 h-3 text-blue-600" />
                Task
              </label>
              <SearchableSelect
                icon={ClipboardList}
                value={selectedTask}
                onChange={setSelectedTask}
                options={availableTasks.map(t => ({ value: t.task_id, label: t.label }))}
                placeholder="All Tasks"
                disabled={!selectedProject}
              />
            </div>
          </div>
          {/* Filter Action Buttons */}
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
              onClick={handleRefresh}
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

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto">
              <table className="min-w-full text-sm text-slate-700 table-fixed">
                <colgroup><col style={{ width: '12%' }}/><col style={{ width: '12%' }}/><col style={{ width: '12%' }}/><col style={{ width: '9%' }}/><col style={{ width: '9%' }}/><col style={{ width: '9%' }}/><col style={{ width: '9%' }}/><col style={{ width: '13%' }}/><col style={{ width: '8%' }}/><col style={{ width: '7%' }}/></colgroup>
                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0 z-10">
                  <tr>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Date/Time</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Project</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Task</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Shift</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Per Hour Target</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Production</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Billable Hours</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Notes</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-center">Task File</th>
                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-20">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          <span className="font-semibold text-slate-600">Loading trackers...</span>
                        </div>
                      </td>
                    </tr>
                  ) : trackers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-20">
                        <div className="flex flex-col items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          <span className="text-slate-400 font-medium">No tracker data found</span>
                        </div>
                      </td>
                    </tr>
                  ) : trackers.map((tracker, index) => (
                    <tr key={tracker.tracker_id} className={`hover:bg-slate-50 transition-colors group ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-5 py-4 align-middle text-slate-700 font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold">{formatDateTime(tracker.date_time).date}</span>
                          <span className="text-xs text-slate-500">{formatDateTime(tracker.date_time).time}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 align-middle text-slate-700 font-medium">{tracker.project_name || getProjectName(tracker.project_id)}</td>
                      <td className="px-5 py-4 align-middle text-slate-700">{tracker.task_name || getTaskName(tracker.task_id, tracker.project_id) || '-'}</td>
                      <td className="px-5 py-4 align-middle text-slate-700">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          (tracker.shift || tracker.shift_type || '').toLowerCase() === 'day' || (tracker.shift || tracker.shift_type) === 'day_shift'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : (tracker.shift || tracker.shift_type || '').toLowerCase() === 'night' || (tracker.shift || tracker.shift_type) === 'night_shift'
                            ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {(tracker.shift || tracker.shift_type || '').toLowerCase() === 'day' || (tracker.shift || tracker.shift_type) === 'day_shift' ? 'Day' : (tracker.shift || tracker.shift_type || '').toLowerCase() === 'night' || (tracker.shift || tracker.shift_type) === 'night_shift' ? 'Night' : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle text-slate-700 font-semibold">
                        {tracker.tenure_target !== null && tracker.tenure_target !== undefined 
                          ? Number(tracker.tenure_target).toFixed(2) 
                          : '-'}
                      </td>
                      <td className="px-5 py-4 align-middle text-slate-700 font-semibold">
                        {tracker.production !== null && tracker.production !== undefined
                          ? Number(tracker.production).toFixed(2)
                          : '0.00'}
                      </td>
                      <td className="px-5 py-4 align-middle text-slate-700 font-semibold">
                        {tracker.billable_hours !== null && tracker.billable_hours !== undefined
                          ? Number(tracker.billable_hours).toFixed(2)
                          : "0.00"}
                      </td>
                      <td className="px-5 py-4 align-middle text-slate-600 text-sm">
                        {tracker.tracker_note || tracker.notes ? (
                          <div className="relative inline-flex items-center gap-1">
                            <span>
                              {(tracker.tracker_note || tracker.notes).length > 10
                                ? `${(tracker.tracker_note || tracker.notes).substring(0, 10)}...`
                                : tracker.tracker_note || tracker.notes}
                            </span>
                            {(tracker.tracker_note || tracker.notes).length > 10 && (
                              <div className="relative group/notes">
                                <Info className="w-4 h-4 text-blue-500 cursor-pointer hover:text-blue-700 transition-colors" />
                                {/* Tooltip - Only shows on hover of icon */}
                                <div className={`absolute right-0 ${index >= trackers.length - 3 ? 'bottom-full mb-2' : 'top-full mt-2'} hidden group-hover/notes:block z-50 pointer-events-none`}>
                                  <div className="bg-white text-slate-800 text-xs rounded-lg px-3 py-2 shadow-xl border border-slate-200 min-w-[400px] max-w-2xl max-h-32 break-words whitespace-normal">
                                    {tracker.tracker_note || tracker.notes}
                                    {/* Arrow */}
                                    {index >= trackers.length - 3 ? (
                                      <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                                    ) : (
                                      <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-middle text-center">
                        {tracker.tracker_file ? (
                          <a
                            href={tracker.tracker_file}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center text-blue-600 hover:text-white hover:bg-blue-600 transition-all bg-blue-50 rounded-lg p-2 shadow-sm"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-middle text-center">
                        {isToday(tracker.date_time) ? (
                          <button
                            onClick={() => handleDelete(tracker.tracker_id)}
                            disabled={deletingId === tracker.tracker_id}
                            className="inline-flex items-center justify-center text-red-600 hover:text-white hover:bg-red-600 transition-all bg-red-50 rounded-lg p-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Tracker"
                            aria-label="Delete Tracker"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 font-medium">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
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

        {/* Delete confirmation modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full transform transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Confirm Delete</h3>
              </div>
              <p className="mb-6 text-slate-600 leading-relaxed">Are you sure you want to delete this tracker entry? This action cannot be undone.</p>
              <div className="flex justify-end gap-3">
                <button
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-6 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deletingId}
                >
                  Cancel
                </button>
                <button
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  onClick={confirmDelete}
                  disabled={deletingId}
                >
                  {deletingId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackerTable;
