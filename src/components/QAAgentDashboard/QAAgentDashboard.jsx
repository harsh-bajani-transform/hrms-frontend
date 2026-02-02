/**
 * File: QAAgentDashboard.jsx
 * Author: Naitik Maisuriya
 * Description: QA Agent Dashboard with stats and pending QC files
 */
import React, { useEffect, useState } from "react";
// Set your backend base URL here or use an environment variable (Vite uses import.meta.env)
const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_URL || "";
import { format } from "date-fns";
import { Users, FileCheck, Download, FileText, TrendingUp, Activity } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useDeviceInfo } from "../../hooks/useDeviceInfo";
import { log, logError } from "../../config/environment";
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import ErrorMessage from '../common/ErrorMessage';
import AppLayout from "../../layouts/AppLayout";
import QATabsNavigation from "./QATabsNavigation";
import BillableReport from "../common/BillableReport";
import QAFilterBar from "./QAFilterBar";

const QAAgentDashboard = ({ embedded = false }) => {
      // StatCard component for dashboard stats
      const StatCard = ({ title, value, subtitle, icon, iconBgColor, iconColor }) => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div className={`w-10 h-10 flex items-center justify-center rounded-lg ${iconBgColor}`}>
              {React.createElement(icon, { className: `w-6 h-6 ${iconColor}` })}
            </div>
            <span className="text-xs font-semibold text-slate-400">{subtitle}</span>
          </div>
          <div className="font-bold text-2xl text-blue-700 mb-1">{value}</div>
          <div className="text-sm text-slate-600 font-medium">{title}</div>
        </div>
      );
    // Handle QC Form action
    const handleQCForm = (tracker) => {
      log('[QAAgentDashboard] Opening QC Form for tracker:', tracker.tracker_id);
      // TODO: Implement QC Form modal or navigation
      toast.success("QC Form functionality coming soon!");
    };
  const { user } = useAuth();
  const { device_id, device_type } = useDeviceInfo();
  

  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalAgents: 0,
    pendingQCFiles: 0,
    placeholder1: 0,
    placeholder2: 0
  });
  const [pendingFiles, setPendingFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  // By default, show empty date range in filter, but show today's data if no filter is applied
  const todayStr = new Date().toISOString().slice(0, 10);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  // Helper to get full file URL for download
  const getFileUrl = (filePath) => {
    if (!filePath) return "";
    // If filePath is already absolute (starts with http), return as is
    if (/^https?:\/\//i.test(filePath)) return filePath;
    // Otherwise, prepend backend base URL
    return BACKEND_BASE_URL + filePath;
  };

  // Fetch dashboard data on mount
  // Call dashboard/filter on any filter change (add date/task/project if needed)

  // Fetch dashboard data with filter
  const fetchDashboardData = async (customRange) => {
      // ...existing code...
    try {
      setLoading(true);
      log('[QAAgentDashboard] Fetching dashboard data');
      let payload = {
        logged_in_user_id: user?.user_id,
        device_id,
        device_type
      };
      // If a valid filter is set, use it; otherwise always use today's date
      if (customRange && customRange.start && customRange.end) {
        payload = { ...payload, from_date: customRange.start, to_date: customRange.end };
      } else {
        // Always show today's data by default if no filter is set
        const today = new Date().toISOString().slice(0, 10);
        payload = { ...payload, from_date: today, to_date: today };
      }
      console.log('[QAAgentDashboard] API payload:', payload);
      const res = await api.post('/dashboard/filter', payload);
      console.log('[QAAgentDashboard] API response:', res.data);
      if (res.status === 200 && res.data?.data) {
        const responseData = res.data.data;
        const trackers = responseData.tracker || [];
        const users = responseData.users || [];
        const tasks = responseData.tasks || [];
        const summary = responseData.summary || {};
        console.log('[QAAgentDashboard] Raw trackers:', trackers);
        // Create a map for task lookup
        const taskMap = {};
        tasks.forEach(task => {
          taskMap[task.task_id] = {
            task_name: task.task_name,
            task_target: task.task_target
          };
        });
        // Filter trackers with files and enrich with task names
        let trackersWithFiles = trackers
          .filter(tracker => tracker.tracker_file)
          .map(tracker => {
            const taskInfo = taskMap[tracker.task_id] || {};
            return {
              ...tracker,
              task_name: taskInfo.task_name || 'N/A'
            };
          });
        console.log('[QAAgentDashboard] trackersWithFiles after file filter:', trackersWithFiles);

        // Filter by date range if set, otherwise by today
        let fromDate, toDate;
        if (customRange && customRange.start && customRange.end) {
          fromDate = new Date(customRange.start);
          toDate = new Date(customRange.end);
        } else {
          const today = new Date().toISOString().slice(0, 10);
          fromDate = new Date(today);
          toDate = new Date(today);
        }
        trackersWithFiles = trackersWithFiles.filter(tracker => {
          if (!tracker.date_time) return false;
          
          // Parse the date_time field - handle various formats
          let trackerDate;
          try {
            // Try parsing as-is first
            trackerDate = new Date(tracker.date_time);
            
            // If invalid, try extracting date portion
            if (isNaN(trackerDate.getTime())) {
              // Extract YYYY-MM-DD pattern from the string
              const dateMatch = tracker.date_time.match(/(\d{4})-(\d{2})-(\d{2})/);
              if (dateMatch) {
                trackerDate = new Date(dateMatch[0]);
              } else {
                return false;
              }
            }
          } catch (e) {
            console.error('[QAAgentDashboard] Error parsing date:', tracker.date_time, e);
            return false;
          }
          
          // Compare only date parts (ignore time)
          const trackerDateOnly = new Date(trackerDate.getFullYear(), trackerDate.getMonth(), trackerDate.getDate());
          const fromDateOnly = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
          const toDateOnly = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
          
          return trackerDateOnly >= fromDateOnly && trackerDateOnly <= toDateOnly;
        });
        console.log('[QAAgentDashboard] trackersWithFiles after date filter:', trackersWithFiles);

        // Sort by date_time descending (latest first)
        trackersWithFiles.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

        // Set stats
        setStats({
          totalAgents: users.length || 0,
          pendingQCFiles: trackersWithFiles.length || 0,
          placeholder1: summary.tracker_rows || 0,
          placeholder2: summary.project_count || 0
        });
        setPendingFiles(trackersWithFiles);
        log('[QAAgentDashboard] Dashboard data loaded - Agents:', users.length, 'Files:', trackersWithFiles.length);
      } else {
        setStats({
          totalAgents: 0,
          pendingQCFiles: 0,
          placeholder1: 0,
          placeholder2: 0
        });
        setPendingFiles([]);
      }
    } catch (err) {
      logError('[QAAgentDashboard] Error fetching dashboard data:', err);
      setError(getFriendlyErrorMessage(err));
      toast.error(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // On mount, show today's data by default
  useEffect(() => {
    if (user?.user_id) {
      fetchDashboardData({ start: todayStr, end: todayStr });
    }
    // eslint-disable-next-line
  }, [user, device_id, device_type]);

  // Auto-apply filter on date change
  useEffect(() => {
    // Only fetch if both start and end are set (user applied filter)
    if (dateRange.start && dateRange.end) {
      fetchDashboardData(dateRange);
    } else if (!dateRange.start && !dateRange.end) {
      // If both are cleared, show today's data
      fetchDashboardData({ start: todayStr, end: todayStr });
    }
    // eslint-disable-next-line
  }, [dateRange.start, dateRange.end]);

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const handleClear = () => {
    setDateRange({ start: '', end: '' });
  };

  // Debug: log pendingFiles to help diagnose production issues
  useEffect(() => {
    if (pendingFiles) {
      console.log('[QAAgentDashboard] pendingFiles:', pendingFiles);
      pendingFiles.forEach((file, idx) => {
        console.log(`[QAAgentDashboard] File #${idx + 1} download URL:`, getFileUrl(file.tracker_file));
      });
    }
  }, [pendingFiles]);

  const content = (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Filter Bar for Organization Analytics (before navigation tabs) */}
      <QAFilterBar
        dateRange={dateRange}
        handleDateRangeChange={handleDateRangeChange}
        handleClear={handleClear}
      />
      {/* Navigation Tabs after filter */}
      <QATabsNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
      {/* Stats Cards */}
      {activeTab === 'overview' && (
        error ? (
          <ErrorMessage message={error} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              title="Total Agents"
              value={stats.totalAgents}
              subtitle="Assigned agents"
              iconBgColor="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={FileCheck}
              title="Pending QC Files"
              value={stats.pendingQCFiles}
              subtitle="Files to review"
              iconBgColor="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={TrendingUp}
              title="Placeholder 1"
              value={stats.placeholder1}
              subtitle="Data pending"
              iconBgColor="bg-blue-50"
              iconColor="text-blue-600"
            />
            <StatCard
              icon={Activity}
              title="Placeholder 2"
              value={stats.placeholder2}
              subtitle="Data pending"
              iconBgColor="bg-blue-50"
              iconColor="text-blue-600"
            />
          </div>
        )
      )}
      {activeTab === 'billable_report' && <BillableReport />}
      {/* Latest Pending QC Files */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Blue Header Section */}
          <div className="bg-blue-600 px-6 py-4">
            <div className="flex items-center gap-3 text-white">
              <FileText className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Latest Pending QC Files</h2>
                <p className="text-sm text-blue-100 mt-0.5">Files awaiting quality check review</p>
              </div>
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="text-gray-500">Loading pending files...</span>
              </div>
            </div>
          ) : pendingFiles.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-blue-300" />
              </div>
              <p className="text-slate-600 font-medium text-lg mb-1">No pending QC files</p>
              <p className="text-slate-400 text-sm">All files have been reviewed</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingFiles.slice(0, 5).map((file, index) => (
                <div
                  key={file.tracker_id || index}
                  className="px-6 py-4 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 flex-1">
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Date/Time</p>
                          <p className="text-sm font-medium text-slate-700">
                            {file.date_time ? file.date_time : "-"}
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
                            {file.project_name || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">Task</p>
                          <p className="text-sm text-slate-700">
                            {file.task_name || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-0.5">File</p>
                          {file.tracker_file ? (
                            <a
                              href={getFileUrl(file.tracker_file)}
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
                    <button
                      onClick={() => handleQCForm(file)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shrink-0"
                    >
                      <FileText className="w-4 h-4" />
                      QC Form
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // If embedded, return just the content
  if (embedded) {
    return content;
  }

  // Otherwise wrap in AppLayout
  return <AppLayout>{content}</AppLayout>;
}
export default QAAgentDashboard;
