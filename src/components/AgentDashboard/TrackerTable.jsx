/**
 * File: TrackerTable.jsx
 * Author: Naitik Maisuriya
 * Description: Displays all tracker entries in a table, resolves project/task names, supports file download and delete actions.
 */
import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Download, Trash2, Filter, FileDown } from "lucide-react";
import { toast } from "react-hot-toast";
import * as XLSX from 'xlsx';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { log, logError } from "../../config/environment";

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
  const [startDate, setStartDate] = useState(""); // empty by default
  const [endDate, setEndDate] = useState(""); // empty by default


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
    setSelectedProject("");
    setSelectedTask("");
    setStartDate("");
    setEndDate("");
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

  // Export to Excel function
  const handleExportToExcel = () => {
    if (trackers.length === 0) {
      toast.error("No data to export");
      return;
    }

    try {
      // Prepare data for export
      const exportData = trackers.map((tracker) => ({
        'Date/Time': tracker.date_time
          ? format(new Date(tracker.date_time), "dd/MM/yyyy HH:mm")
          : "-",
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
    <div className="space-y-10 max-w-5xl mx-auto py-8">
      <div className="mb-8 flex items-center gap-3 justify-between">
        <h2 className="text-3xl font-extrabold text-blue-800 tracking-tight drop-shadow-sm">All Trackers</h2>
        <div className="flex gap-2">
          <button
            onClick={handleExportToExcel}
            disabled={loading || trackers.length === 0}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            title="Export filtered data to Excel"
          >
            <FileDown className="w-4 h-4" />
            Export to Excel
          </button>
          <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow">
            Back to Form
          </button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl p-6 mb-6 shadow border border-blue-100">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-bold text-blue-700 tracking-wide">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm"
              placeholder="Start Date"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm"
              placeholder="End Date"
            />
          </div>

          {/* Project Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => {
                setSelectedProject(e.target.value);
                setSelectedTask(""); // Clear task when project changes
              }}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project.project_id} value={project.project_id}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </div>

          {/* Task Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Task
            </label>
            <select
              value={selectedTask}
              onChange={(e) => setSelectedTask(e.target.value)}
              disabled={!selectedProject}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Tasks</option>
              {availableTasks.map((task) => (
                <option key={task.task_id} value={task.task_id}>
                  {task.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {/* Clear Filters Button */}
        <div className="mt-2.5 flex justify-end">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold shadow transition-all"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-2 font-semibold">{error}</div>}

      {/* Scrollable table container with max height for 10 rows */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-slate-200 rounded-2xl shadow-lg bg-white">
        <table className="min-w-full text-sm text-slate-700 table-fixed rounded-xl overflow-hidden">
          <colgroup><col style={{ width: '16%' }}/><col style={{ width: '16%' }}/><col style={{ width: '16%' }}/><col style={{ width: '12%' }}/><col style={{ width: '12%' }}/><col style={{ width: '12%' }}/><col style={{ width: '9%' }}/><col style={{ width: '7%' }}/></colgroup>
          <thead className="bg-gradient-to-r from-blue-100 to-blue-50 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Date/Time</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Project</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Task</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Per Hour Target</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Production</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Billable Hours</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Task File</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-16 font-semibold text-blue-600 animate-pulse">Loading...</td></tr>
            ) : trackers.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16 text-slate-400 font-medium">No tracker data found.</td></tr>
            ) : trackers.map(tracker => (
              <tr key={tracker.tracker_id} className="border-b border-slate-100 hover:bg-blue-50/60 transition-colors group">
                <td className="px-5 py-3 align-middle whitespace-nowrap">
                  {tracker.date_time ? tracker.date_time : "-"}
                </td>
                <td className="px-5 py-3 align-middle whitespace-nowrap">{tracker.project_name || getProjectName(tracker.project_id)}</td>
                <td className="px-5 py-3 align-middle whitespace-nowrap">{tracker.task_name || getTaskName(tracker.task_id, tracker.project_id) || '-'}</td>
                {/* Always show tenure_target from tracker/view for all roles */}
                <td className="px-5 py-3 align-middle whitespace-nowrap">{tracker.tenure_target ?? '-'}</td>
                <td className="px-5 py-3 align-middle whitespace-nowrap">{tracker.production}</td>
                <td className="px-5 py-3 align-middle whitespace-nowrap">
                  {tracker.billable_hours !== null && tracker.billable_hours !== undefined
                    ? Number(tracker.billable_hours).toFixed(2)
                    : "0.00"}
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
                <td className="px-5 py-3 align-middle text-center">
                  {isToday(tracker.date_time) ? (
                    <button
                      onClick={() => handleDelete(tracker.tracker_id)}
                      disabled={deletingId === tracker.tracker_id}
                      className="p-0 bg-transparent hover:bg-transparent focus:outline-none"
                      title="Delete Tracker"
                      aria-label="Delete Tracker"
                    >
                      <Trash2
                        className="w-6 h-6 text-red-500 bg-red-100 bg-opacity-40 rounded-full p-1 transition-colors duration-200 hover:text-white hover:bg-red-500 hover:bg-opacity-100"
                      />
                    </button>
                  ) : (
                    <span className="text-slate-300" title="Can only delete today's entries">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Summary Card */}
      {!loading && trackers.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-lg">
          <h3 className="text-lg font-bold text-blue-900 mb-6 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
            Summary Totals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Per Hour Target */}
            <div className="bg-white rounded-xl p-6 shadow border border-blue-100 flex flex-col items-center">
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Total Per Hour Target</p>
              <p className="text-3xl font-extrabold text-blue-700">{totals.tenureTarget.toFixed(2)}</p>
            </div>

            {/* Total Production */}
            <div className="bg-white rounded-xl p-6 shadow border border-green-100 flex flex-col items-center">
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Total Production</p>
              <p className="text-3xl font-extrabold text-green-700">{totals.production.toFixed(2)}</p>
            </div>

            {/* Total Billable Hours */}
            <div className="bg-white rounded-xl p-6 shadow border border-purple-100 flex flex-col items-center">
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Total Billable Hours</p>
              <p className="text-3xl font-extrabold text-purple-700">{totals.billableHours.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full pointer-events-auto">
            <h3 className="text-lg font-bold mb-4 text-slate-800">Confirm Delete</h3>
            <p className="mb-6 text-slate-600">Are you sure you want to delete this tracker entry?</p>
            <div className="flex justify-end gap-4">
              <button
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded font-semibold"
                onClick={() => setDeleteConfirm(null)}
                disabled={deletingId}
              >Cancel</button>
              <button
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded font-semibold"
                onClick={confirmDelete}
                disabled={deletingId}
              >{deletingId ? "Deleting..." : "Delete"}</button>
            </div>
          </div>
        </div>
      )}
      {/* Loader spinner style for consistency */}
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
    </div>
  );
};

export default TrackerTable;
