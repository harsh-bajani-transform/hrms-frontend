import React, { useEffect, useState } from "react";
import AssistantManagerTabsNavigation from "./AssistantManagerTabsNavigation";
import { format } from "date-fns";
import { FileText, Users, Clock, TrendingUp, Download, Filter } from "lucide-react";

import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import ErrorMessage from '../common/ErrorMessage';
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useDeviceInfo } from '../../hooks/useDeviceInfo';
import BillableReport from "../common/BillableReport";
import QATrackerReport from './QATrackerReport';
import QAAgentList from './QAAgentList';

const AssistantManagerDashboard = () => {
  // Tab state for navigation
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();
  // Project/task name mapping state
  const [projectNameMap, setProjectNameMap] = useState({});
  const [taskNameMap, setTaskNameMap] = useState({});

  // Fetch project/task mapping once
  useEffect(() => {
    const fetchDropdownMapping = async () => {
      try {
        const dropdownRes = await api.post("/dropdown/get", {
          dropdown_type: "projects with tasks",
          logged_in_user_id: user?.user_id
        });
        const projectsWithTasks = dropdownRes.data?.data || [];
        const pMap = {};
        const tMap = {};
        projectsWithTasks.forEach(project => {
          pMap[String(project.project_id)] = project.project_name;
          (project.tasks || []).forEach(task => {
            tMap[String(task.task_id)] = task.task_name || task.label;
          });
        });
        setProjectNameMap(pMap);
        setTaskNameMap(tMap);
      } catch (err) {
        // Silent fail for dashboard
      }
    };
    if (user?.user_id) {
      fetchDropdownMapping();
    }
  }, [user?.user_id]);
  const { device_id, device_type } = useDeviceInfo();
  // By default, no date range (empty strings)
  const [dateRange, setDateRange] = useState({
    start: '',
    end: '',
  });
  const [stats, setStats] = useState({
    totalAgents: 0,
    qcPending: 0,
    billableHours: 0,
    avgQcScore: 0,
    latestQc: [],
  });
  const [loading, setLoading] = useState(false); // Restored loading state for async fetch
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      setLoading(true);
      try {
        // If no filter applied, show today's data only (but do not set date in filter UI)
        let payload = {
          logged_in_user_id: user?.user_id || user?.id,
          device_id,
          device_type,
        };
        // Do NOT send user_id in the payload, only logged_in_user_id
        // (If user_id is present elsewhere, ensure it's not included)
        // If user applies a date filter, use it; otherwise, send today's date in API only
        if (dateRange.start && dateRange.end) {
          payload.date_from = dateRange.start;
          payload.date_to = dateRange.end;
        } else if (!dateRange.start && !dateRange.end) {
          // Default: show today's data only
          const today = format(new Date(), 'yyyy-MM-dd'); // No time displayed here, so nothing to change
          payload.date_from = today;
          payload.date_to = today;
        }
        const res = await api.post('/dashboard/filter', payload);
        if (res.data && res.data.status === 200) {
          const data = res.data.data || {};
          console.log('[AssistantManagerDashboard] Dashboard API data:', data);
          // Only show trackers with files, sorted by date_time desc, limit 5
          const latestQc = (data.tracker || [])
            .filter(row => !!row.tracker_file)
            .sort((a, b) => new Date(b.date_time) - new Date(a.date_time))
            .slice(0, 5)
            .map(row => ({
              ...row,
              user_name: row.user_name || '-',
              project_name: projectNameMap[String(row.project_id)] || row.project_name || String(row.project_id) || '-',
              file_name: row.tracker_file ? row.tracker_file.split('/').pop() : '-',
              qc_score: row.qc_score || '-',
              date: row.date_time ? row.date_time.split(' ')[0] : '-',
              task_name: taskNameMap[String(row.task_id)] || row.task_name || String(row.task_id) || '-',
            }));
          setStats({
            totalAgents: (data.users || []).length,
            qcPending: (data.tracker || []).filter(row => row.tracker_file && row.qc_status === 'pending').length,
            billableHours: (data.summary?.total_billable_hours || 0).toFixed(2),
            avgQcScore: '-', // Not provided in response
            latestQc,
          });
        } else {
          setStats({ totalAgents: 0, qcPending: 0, billableHours: 0, avgQcScore: 0, latestQc: [] });
        }
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [user, dateRange, device_id, device_type, projectNameMap, taskNameMap]);

  // const handleDateChange = (field, value) => {
  //   setDateRange((prev) => ({ ...prev, [field]: value }));
  // };

  // Handler for date change
  const handleDateRangeChange = (field, value) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Filter Bar (single card below) */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
            {/* Title Section */}
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              <span className="text-sm sm:text-base">Organization Analytics</span>
            </div>
            {/* Date Range Picker + Clear Filter (grid style) */}
            <div className="w-full grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-2 lg:flex lg:flex-row lg:gap-4 lg:w-auto">
              {/* Start Date */}
              <div className="col-span-2 sm:col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-row items-center gap-3">
                <label className="text-xs text-slate-500 uppercase font-bold">FROM</label>
                <input
                  className="flex-1 bg-white border border-slate-300 text-slate-700 text-sm rounded px-2 py-1.5 outline-none"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  aria-label="Start date"
                />
              </div>
              {/* End Date */}
              <div className="col-span-2 sm:col-span-1 bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-row items-center gap-3">
                <label className="text-xs text-slate-500 uppercase font-bold">TO</label>
                <input
                  className="flex-1 bg-white border border-slate-300 text-slate-700 text-sm rounded px-2 py-1.5 outline-none"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  aria-label="End date"
                />
              </div>
              {/* Clear Filter Button */}
              <button
                type="button"
                onClick={() => setDateRange({ start: '', end: '' })}
                className="col-span-2 sm:col-span-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg px-4 py-2 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        {/* Navigation Tabs above stat cards */}
        <div className="mt-2">
          <AssistantManagerTabsNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      {/* Stat Cards (show only for overview tab) */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">Total Agents</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalAgents}</div>
          <div className="text-xs text-slate-400 mt-1">Assigned agents</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">Pending QC Files</span>
          </div>
          <div className="text-2xl font-bold">{stats.qcPending}</div>
          <div className="text-xs text-slate-400 mt-1">Files to review</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">Total Billable Hours</span>
          </div>
          <div className="text-2xl font-bold">{Number(stats.billableHours).toFixed(2)}</div>
          <div className="text-xs text-slate-400 mt-1">Billable hours</div>
        </div>
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-start">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <span className="font-semibold">Avg QC Score</span>
          </div>
          <div className="text-2xl font-bold">{stats.avgQcScore}</div>
          <div className="text-xs text-slate-400 mt-1">Average QC score</div>
        </div>
        </div>
      )}
      {/* Latest QC Done Files - show only for overview tab */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Blue Header Section - Dashboard-aligned */}
        <div className="bg-blue-600 px-6 py-4 flex items-center gap-4 justify-start">
          <div className="flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-lg">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col justify-center text-left">
            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">Latest QC Done Files</h2>
            <p className="text-xs sm:text-sm text-blue-100 mt-0.5">Files recently reviewed for quality check</p>
          </div>
        </div>
        {/* Table Content */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-gray-500">Loading QC files...</span>
            </div>
          </div>
        ) : stats.latestQc.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-blue-300" />
            </div>
            <p className="text-slate-600 font-medium text-lg mb-1">No QC files found</p>
            <p className="text-slate-400 text-sm">No QC files have been reviewed in this period.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {stats.latestQc.map((file, index) => (
              <div
                key={file.tracker_id || index}
                className="px-6 py-4 hover:bg-blue-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-1">
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Date/Time</p>
                        <p className="text-sm font-medium text-slate-700">
                          {file.date_time ? file.date_time : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Agent</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {file.user_name || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Project</p>
                        <p className="text-sm text-slate-700">
                          {projectNameMap[String(file.project_id)] || file.project_name || String(file.project_id) || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Task</p>
                        <p className="text-sm text-slate-700">
                          {taskNameMap[String(file.task_id)] || file.task_name || String(file.task_id) || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">File</p>
                        {file.tracker_file ? (
                          <a
                            href={file.tracker_file}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      )}
      {/* Billable Report Tab */}
      {activeTab === 'billable_report' && (
        <div className="max-w-7xl mx-auto mt-6">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">Billable Report</h2>
          <BillableReport />
        </div>
      )}
      {activeTab === 'tracker_report' && (
        <div className="max-w-7xl mx-auto mt-6">
          <QATrackerReport />
        </div>
      )}
      {activeTab === 'agent_file_report' && (
        <div className="max-w-7xl mx-auto mt-6">
          <QAAgentList />
        </div>
      )}
    </div>
  );
};

export default AssistantManagerDashboard;
