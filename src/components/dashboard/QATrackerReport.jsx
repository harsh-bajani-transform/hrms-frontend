/**
 * File: QATrackerReport.jsx
 * Author: Naitik Maisuriya
 * Description: QA Tracker Report - Shows tracker entries for assigned agents with filters
 */
import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Download, Filter, FileDown, Users as UsersIcon } from "lucide-react";
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

const QATrackerReport = () => {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [assignedAgents, setAssignedAgents] = useState([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  // Filter states
  const [selectedAgent, setSelectedAgent] = useState("");
  const [startDate, setStartDate] = useState(""); // empty by default
  const [endDate, setEndDate] = useState(""); // empty by default
  const [summary, setSummary] = useState([]);

  // Store per-hour targets from dropdown API
  const [dropdownTaskMap, setDropdownTaskMap] = useState({});

  // Fetch trackers and summary from tracker/view API with date range and agent filter
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingAgents(true);
        let payload = {
          logged_in_user_id: user?.user_id,
        };
        if (selectedAgent) payload.user_id = selectedAgent;
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
        setTrackers(Array.isArray(data.trackers) ? data.trackers : []);
        setSummary(Array.isArray(data.month_summary) ? data.month_summary : []);
        // Optionally, set assigned agents from summary
        const agentList = Array.isArray(data.month_summary)
          ? data.month_summary.map(s => ({ user_id: s.user_id, user_name: s.user_name }))
          : [];
        setAssignedAgents(agentList);
      } catch (err) {
        logError('[QATrackerReport] Error fetching tracker/view:', err);
        toast.error("Failed to load tracker data");
        setTrackers([]);
        setSummary([]);
        setAssignedAgents([]);
      } finally {
        setLoading(false);
        setLoadingAgents(false);
      }
    };
    if (user?.user_id) {
      fetchData();
    }
  }, [user?.user_id, startDate, endDate, selectedAgent]);

  // Remove in-memory filtering; handled by API

  // Clear filters
  const handleClearFilters = () => {
    setSelectedAgent("");
    setStartDate("");
    setEndDate("");
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
    <div className="space-y-10 max-w-6xl mx-auto py-8">
      <div className="mb-8 flex items-center gap-3">
        <UsersIcon className="w-9 h-9 text-blue-700" />
        <h2 className="text-3xl font-extrabold text-blue-800 tracking-tight drop-shadow-sm">Tracker Report</h2>
      </div>

      {/* Filter Section */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 rounded-2xl p-6 mb-6 shadow border border-blue-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-700" />
            <h3 className="text-base font-bold text-blue-700 tracking-wide">Filters</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportToExcel}
              disabled={loading || trackers.length === 0}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
              title="Export filtered data to Excel"
            >
              <FileDown className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold shadow transition-all"
            >
              Clear Filters
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Start Date <span className="text-red-500">*</span>
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
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm"
              placeholder="End Date"
            />
          </div>

          {/* Assigned Agent Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-blue-900 mb-1">
              Assigned Agent
            </label>
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              disabled={loadingAgents}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">All Agents</option>
              {assignedAgents.map((agent) => (
                <option key={agent.user_id} value={agent.user_id}>
                  {agent.user_name}
                </option>
              ))}
            </select>
            {loadingAgents && (
              <p className="text-xs text-gray-500 mt-1">Loading agents...</p>
            )}
          </div>
        </div>
      </div>

      {error && <div className="text-red-600 mb-2 text-sm font-semibold">{error}</div>}

      {/* Scrollable table container */}
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-slate-200 rounded-2xl shadow-lg bg-white">
        <table className="min-w-full text-sm text-slate-700 table-fixed rounded-xl overflow-hidden">
          <colgroup>
            <col style={{ width: '14%' }}/>
            <col style={{ width: '12%' }}/>
            <col style={{ width: '16%' }}/>
            <col style={{ width: '16%' }}/>
            <col style={{ width: '12%' }}/>
            <col style={{ width: '12%' }}/>
            <col style={{ width: '12%' }}/>
            <col style={{ width: '6%' }}/>
          </colgroup>
          <thead className="bg-gradient-to-r from-blue-100 to-blue-50 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Date/Time</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Agent</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Project</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Task</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Per Hour Target</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Production</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200">Billable Hours</th>
              <th className="px-5 py-3 font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200 text-center">File</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="loader mb-2"></div>
                    <span className="text-blue-600 font-semibold text-lg animate-pulse">Loading tracker data...</span>
                  </div>
                </td>
              </tr>
            ) : trackers.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2">
                    <UsersIcon className="w-12 h-12 text-gray-300" />
                    <span className="text-gray-500 font-medium">No tracker data found</span>
                    <span className="text-gray-400 text-xs">Try adjusting your filters</span>
                  </div>
                </td>
              </tr>
            ) : trackers.map((tracker, index) => (
              <tr 
                key={tracker.tracker_id || index} 
                className="border-b border-slate-100 hover:bg-blue-50/60 transition-colors group"
              >
                <td className="px-5 py-3 align-middle whitespace-nowrap">
                  {tracker.date_time
                    ? (() => {
                        const d = new Date(tracker.date_time);
                        // Format as UTC, not local time
                        const pad = (n) => n.toString().padStart(2, '0');
                        return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
                      })()
                    : "-"}
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
                <td className="px-5 py-3 align-middle whitespace-nowrap">
                  {tracker.tenure_target || dropdownTaskMap[tracker.task_id] || "0"}
                </td>
                <td className="px-5 py-3 align-middle font-bold text-green-700 whitespace-nowrap">
                  {tracker.production || "0"}
                </td>
                <td className="px-5 py-3 align-middle font-bold text-purple-700 whitespace-nowrap">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Summary Card (from API summary) */}
      {!loading && summary.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-lg">
          <h3 className="text-lg font-bold text-blue-900 mb-6 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
            Summary Totals
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Billable Hours (sum for all agents) */}
            <div className="bg-white rounded-xl p-6 shadow border border-blue-100 flex flex-col items-center">
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Total Billable Hours</p>
              <p className="text-3xl font-extrabold text-blue-700">{summary.reduce((sum, s) => sum + (parseFloat(s.total_billable_hours_month) || 0), 0).toFixed(2)}</p>
            </div>
            {/* Total Agents */}
            <div className="bg-white rounded-xl p-6 shadow border border-green-100 flex flex-col items-center">
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Total Agents</p>
              <p className="text-3xl font-extrabold text-green-700">{summary.length}</p>
            </div>
            {/* Month-Year */}
            <div className="bg-white rounded-xl p-6 shadow border border-purple-100 flex flex-col items-center">
              <p className="text-xs text-gray-600 mb-1 uppercase tracking-wide">Month-Year</p>
              <p className="text-3xl font-extrabold text-purple-700">{summary[0]?.month_year || '-'}</p>
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
    </div>
  );
};

export default QATrackerReport;
