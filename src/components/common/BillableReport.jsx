import * as XLSX from 'xlsx';
import { toast } from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { fetchDropdown } from "../../services/dropdownService";
import { useAuth } from "../../context/AuthContext";
import MonthCard from "./MonthCard";
import UserCard from "./UserCard";
import { fetchMonthlyBillableReport } from "../../services/billableReportService";
import api from "../../services/api";
import { useDeviceInfo } from "../../hooks/useDeviceInfo";

const BillableReport = ({ userId }) => {
  // Device info (declare once at top)
  const { device_id, device_type } = useDeviceInfo();

  // Helper to format date/time for display and export
  // Always return raw backend string for date/time
  function formatDateTime(dateInput) {
    if (!dateInput) return '-';
    return dateInput;
  }

  // Team filter state (must be before any usage)
  const [teamFilter, setTeamFilter] = useState('');
  const [teamOptions, setTeamOptions] = useState([]);
  const { user } = useAuth();


  // Fetch team dropdown options on mount
  useEffect(() => {
    async function fetchTeams() {
      if (!user?.user_id) return;
      const teams = await fetchDropdown("teams", user.user_id);
      setTeamOptions(Array.isArray(teams) ? teams.map(t => ({ label: t.label, value: t.label, team_id: t.team_id })) : []);
    }
    fetchTeams();
  }, [user]);

  // Export all users' daily data (filtered by team if set)
  function handleExportAllUsers() {
    try {
      // Filter daily data by team and month
      const exportRows = dailyData.filter(row => {
        if (teamFilter && row.team_name !== teamFilter) return false;
        if (dailyMonth) {
          const rowDate = row.date_time || row.date;
          if (!rowDate) return false;
          const d = new Date(rowDate);
          if (isNaN(d)) return false;
          const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (monthStr !== dailyMonth) return false;
        }
        return true;
      });

      if (!exportRows.length) {
        toast.error('No data to export.');
        return;
      }

      // Prepare export data
      const exportData = exportRows.map(row => ({
        'User Name': row.user_name || '-',
        'Team': row.team_name || '-',
        'Date-Time': row.date_time ?? row.date ?? '-',
        'Assigned Hour': row.assign_hours !== undefined ? Number(row.assign_hours).toFixed(2) : (row.assignHours ?? row.assigned_hour ?? '-'),
        'Worked Hours': row.billable_hours !== undefined ? Number(row.billable_hours).toFixed(2) : (row.workedHours ?? row.worked_hours ?? '-'),
        'QC Score': 'qc_score' in row ? (row.qc_score !== null && row.qc_score !== undefined ? Number(row.qc_score).toFixed(2) : '-') : (row.qcScore ?? row.qc_score ?? '-'),
        'Daily Required Hours': row.tenure_target !== undefined ? Number(row.tenure_target).toFixed(2) : (row.dailyRequiredHours ?? row.daily_required_hours ?? '-')
      }));

      // Add total row for countable columns
      if (exportData.length > 0) {
        const totalAssigned = exportData.reduce((sum, r) => sum + (parseFloat(r['Assigned Hour']) || 0), 0);
        const totalWorked = exportData.reduce((sum, r) => sum + (parseFloat(r['Worked Hours']) || 0), 0);
        const totalQC = exportData.reduce((sum, r) => sum + (parseFloat(r['QC Score']) || 0), 0);
        const totalRequired = exportData.reduce((sum, r) => sum + (parseFloat(r['Daily Required Hours']) || 0), 0);
        exportData.push({
          'User Name': 'Total',
          'Team': '',
          'Date-Time': '',
          'Assigned Hour': totalAssigned.toFixed(2),
          'Worked Hours': totalWorked.toFixed(2),
          'QC Score': totalQC.toFixed(2),
          'Daily Required Hours': totalRequired.toFixed(2)
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 18 }, // User Name
        { wch: 16 }, // Team
        { wch: 24 }, // Date-Time
        { wch: 16 }, // Assigned Hour
        { wch: 16 }, // Worked Hours
        { wch: 12 }, // QC Score
        { wch: 20 }, // Daily Required Hours
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily_Report');
      XLSX.writeFile(workbook, 'All_Users_Daily_Report.xlsx');
      toast.success('Exported all users daily report!');
    } catch {
      toast.error('Failed to export all users');
    }
  }

  // Export only the visible (filtered) table data for a month (for MonthCard)
  const handleExportMonthTable = async (monthObj, usersArr) => {
    try {
      if (!usersArr || usersArr.length === 0) {
        toast.error('No data to export for this table.');
        return;
      }
      let exportData = usersArr.map(user => ({
        'User Name': user.user_name || '-',
        'Team': user.team_name || '-',
        'Billable Hour Delivered': user.total_billable_hours ? Number(user.total_billable_hours).toFixed(2) : '-',
        'Monthly Goal': user.monthly_target ?? '-',
        'Pending Target': user.pending_target ? Number(user.pending_target).toFixed(2) : '-',
        'Avg. QC Score': user.avg_qc_score ? Number(user.avg_qc_score).toFixed(2) : '-',
      }));
      // Add totals row for numeric columns
      if (exportData.length > 0) {
        const totalBillable = exportData.reduce((sum, r) => sum + (parseFloat(r['Billable Hour Delivered']) || 0), 0);
        const totalGoal = exportData.reduce((sum, r) => sum + (parseFloat(r['Monthly Goal']) || 0), 0);
        const totalPending = exportData.reduce((sum, r) => sum + (parseFloat(r['Pending Target']) || 0), 0);
        // For Avg. QC Score, show average if all are numbers
        const qcScores = exportData.map(r => Number(r['Avg. QC Score'])).filter(v => !isNaN(v));
        const avgQC = qcScores.length > 0 ? (qcScores.reduce((a, b) => a + b, 0) / qcScores.length).toFixed(2) : '-';
        exportData.push({
          'User Name': 'Total',
          'Team': '',
          'Billable Hour Delivered': totalBillable.toFixed(2),
          'Monthly Goal': totalGoal.toFixed(2),
          'Pending Target': totalPending.toFixed(2),
          'Avg. QC Score': avgQC,
        });
      }
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 18 }, // User Name
        { wch: 16 }, // Team
        { wch: 24 }, // Billable Hour Delivered
        { wch: 16 }, // Monthly Goal
        { wch: 16 }, // Pending Target
        { wch: 16 }, // Avg. QC Score
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${monthObj.label}_${monthObj.year}`);
      XLSX.writeFile(workbook, `Monthly_Table_${monthObj.label}_${monthObj.year}.xlsx`);
      toast.success('Table exported!');
    } catch {
      toast.error('Failed to export table');
    }
  };


  // State for tab toggle (must be first hook)
  const [activeToggle, setActiveToggle] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('billable_active_tab') || 'daily';
    }
    return 'daily';
  });

  // Persist tab selection to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('billable_active_tab', activeToggle);
    }
  }, [activeToggle]);
  // (Date range filter removed)
  // State for month filter (monthly)
  const [monthlyMonth, setMonthlyMonth] = useState('');
  // State for month filter (daily report) - default to current month
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const [dailyMonth, setDailyMonth] = useState(getCurrentMonth());

  // State for API data, loading, and error
  const [dailyData, setDailyData] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [errorDaily, setErrorDaily] = useState(null);

  // Helper to get YYYY-MM-DD string
  const getDateString = (date) => date.toISOString().slice(0, 10);

  // Fetch daily report data using /tracker/view_daily API
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDaily(true);
      setErrorDaily(null);
      try {
        if (!user?.user_id) {
          setDailyData([]);
          setLoadingDaily(false);
          return;
        }
        let payload = {
          logged_in_user_id: user.user_id
        };
        // Team filter
        if (teamFilter) {
          const selectedTeam = teamOptions.find(t => t.label === teamFilter);
          if (selectedTeam && selectedTeam.team_id) {
            payload.team_id = selectedTeam.team_id;
          }
        }
        // Month filter
        if (dailyMonth) {
          const [year, month] = dailyMonth.split('-');
          const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          const monthLabel = monthNames[Number(month) - 1];
          payload.month_year = `${monthLabel}${year}`;
          // Set date_from and date_to for the selected month (inclusive)
          const firstDay = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
          // To ensure inclusivity, set lastDay to the end of the day
          const lastDay = new Date(Date.UTC(Number(year), Number(month), 0, 23, 59, 59, 999));
          payload.date_from = firstDay.toISOString().slice(0, 10);
          payload.date_to = lastDay.toISOString().slice(0, 10);
        }
        // User filter (if userId is passed as prop)
        if (userId) payload.user_id = userId;
        // Call the /tracker/view_daily API
        const res = await api.post('/tracker/view_daily', payload);
        console.log('Daily report API response:', res.data);
        console.log('Payload sent:', payload);
        // Ensure all dates on or before date_to are included
        let trackers = Array.isArray(res.data?.data?.trackers) ? res.data.data.trackers : [];
        console.log('Trackers extracted:', trackers);
        if (payload.date_from && payload.date_to) {
          // Normalize all dates to YYYY-MM-DD for comparison (ignore time)
          const fromStr = payload.date_from;
          const toStr = payload.date_to;
          trackers = trackers.filter(row => {
            const rowDate = row.work_date || row.date_time || row.date;
            if (!rowDate) return false;
            // Always compare only the date part (YYYY-MM-DD)
            const dStr = new Date(rowDate).toISOString().slice(0, 10);
            return dStr >= fromStr && dStr <= toStr;
          });
        }
        console.log('Trackers after date filter:', trackers);
        setDailyData(trackers);
      } catch {
        setErrorDaily("Failed to fetch daily report data");
      } finally {
        setLoadingDaily(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, [userId, dailyMonth, teamFilter, teamOptions]);

  // Fetch monthly report data from API when monthly tab is active
  const [monthlySummaryData, setMonthlySummaryData] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [errorMonthly, setErrorMonthly] = useState(null);
  useEffect(() => {
    if (activeToggle !== 'monthly') return;
    const fetchData = async () => {
      setLoadingMonthly(true);
      setErrorMonthly(null);
      try {
        let payload = {};
        if (monthlyMonth) {
          // monthlyMonth is in format YYYY-MM
          const [year, month] = monthlyMonth.split('-');
          const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          const monthLabel = monthNames[Number(month) - 1];
          payload = { month_year: `${monthLabel}${year}` };
        } else {
          // Default: last 3 months (fallback, not using month_year)
          const now = new Date();
          const firstMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          const lastMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          payload = {
            date_from: getDateString(firstMonth),
            date_to: getDateString(lastMonth)
          };
        }
        const res = await fetchMonthlyBillableReport(payload);
        setMonthlySummaryData(Array.isArray(res.data) ? res.data : []);
      } catch {
        setErrorMonthly("Failed to fetch monthly report data");
      } finally {
        setLoadingMonthly(false);
      }
    };
    fetchData();
  }, [activeToggle, userId, monthlyMonth]);

  // No longer need to filter dailyData by month, as API returns filtered data
  const filteredDailyData = dailyData;

  // Export all daily data for a given user and month (from monthly report)

  const handleExportMonthDailyData = async (user, monthObj) => {
    try {
      const month_year = user.month_year || monthObj?.label + monthObj?.year;
      let payload = {
        month_year,
        user_id: user.user_id,
        logged_in_user_id: user.user_id, // fallback, but API may override
        device_id,
        device_type
      };
      // Set date_from and date_to for the month (inclusive)
      if (monthObj?.label && monthObj?.year) {
        const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
        const monthIdx = monthNames.indexOf(monthObj.label.toUpperCase());
        if (monthIdx !== -1) {
          const firstDay = new Date(Date.UTC(Number(monthObj.year), monthIdx, 1));
          const lastDay = new Date(Date.UTC(Number(monthObj.year), monthIdx + 1, 0, 23, 59, 59, 999));
          payload.date_from = firstDay.toISOString().slice(0, 10);
          payload.date_to = lastDay.toISOString().slice(0, 10);
        }
      }
      // Use the same API as daily report for consistency
      const res = await api.post('/tracker/view', payload);
      let dailyRows = Array.isArray(res.data?.data?.trackers) ? res.data.data.trackers : [];
      // Filter by date range (inclusive, by date only)
      if (payload.date_from && payload.date_to) {
        const fromStr = payload.date_from;
        const toStr = payload.date_to;
        dailyRows = dailyRows.filter(row => {
          const rowDate = row.date_time || row.date;
          if (!rowDate) return false;
          const dStr = new Date(rowDate).toISOString().slice(0, 10);
          return dStr >= fromStr && dStr <= toStr;
        });
      }
      if (!dailyRows.length) {
        toast.error('No daily data found for this user/month');
        return;
      }
      let exportData = dailyRows.map(row => ({
        'Date-Time': row.date_time ?? row.date ?? '-',
        'Assigned Hour': row.assign_hours !== undefined ? Number(row.assign_hours).toFixed(2) : (row.assignHours ?? row.assigned_hour ?? '-'),
        'Worked Hours': row.billable_hours !== undefined ? Number(row.billable_hours).toFixed(2) : (row.workedHours ?? row.worked_hours ?? '-'),
        'QC Score': 'qc_score' in row ? (row.qc_score !== null && row.qc_score !== undefined ? Number(row.qc_score).toFixed(2) : '-') : (row.qcScore ?? row.qc_score ?? '-'),
        'Daily Required Hours': row.tenure_target !== undefined ? Number(row.tenure_target).toFixed(2) : (row.dailyRequiredHours ?? row.daily_required_hours ?? '-')
      }));
      // Add total row for countable columns
      if (exportData.length > 0) {
        const totalAssigned = exportData.reduce((sum, r) => sum + (parseFloat(r['Assigned Hour']) || 0), 0);
        const totalWorked = exportData.reduce((sum, r) => sum + (parseFloat(r['Worked Hours']) || 0), 0);
        const totalQC = exportData.reduce((sum, r) => sum + (parseFloat(r['QC Score']) || 0), 0);
        const totalRequired = exportData.reduce((sum, r) => sum + (parseFloat(r['Daily Required Hours']) || 0), 0);
        exportData.push({
          'Date-Time': 'Total',
          'Assigned Hour': totalAssigned.toFixed(2),
          'Worked Hours': totalWorked.toFixed(2),
          'QC Score': totalQC.toFixed(2),
          'Daily Required Hours': totalRequired.toFixed(2)
        });
      }
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 24 }, // Date-Time
        { wch: 16 }, // Assigned Hour
        { wch: 16 }, // Worked Hours
        { wch: 12 }, // QC Score
        { wch: 20 }, // Daily Required Hours
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `${user.user_name || month_year}`);
      const filename = `Daily_Report_${user.user_name || 'User'}_${month_year}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success(`Exported daily data for ${user.user_name || 'User'} (${month_year})!`);
    } catch {
      toast.error('Failed to export daily data for this user/month');
    }
  };

  // Removed unused handleExportDailyExcel and related code

  return (
    <div className="max-w-7xl mx-auto py-8 px-2 sm:px-4">
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-7xl flex items-center gap-4 mb-8">
          <button
            className={`px-6 py-2 rounded-lg font-semibold text-blue-700 border-2 border-blue-700 transition-all duration-150 focus:outline-none ${activeToggle === 'daily' ? 'bg-blue-700 text-white' : 'bg-white'}`}
            onClick={() => setActiveToggle('daily')}
          >
            Daily Report
          </button>
          <button
            className={`px-6 py-2 rounded-lg font-semibold text-blue-700 border-2 border-blue-700 transition-all duration-150 focus:outline-none ${activeToggle === 'monthly' ? 'bg-blue-700 text-white' : 'bg-white'}`}
            onClick={() => setActiveToggle('monthly')}
          >
            Monthly Report
          </button>
        </div>
      </div>
      {/* Daily Report view (user cards, QA agent side only) */}
      {activeToggle === 'daily' && (
        <div className="w-full max-w-7xl mx-auto mt-4 px-6">
          {/* Team-wise filter, Month filter, and Export All button */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            {/* Team Filter Dropdown */}
            <label className="font-semibold text-blue-700 mr-2">Team:</label>
            <select
              className="border border-blue-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-500 bg-white shadow-sm transition min-w-[120px]"
              value={teamFilter || ''}
              onChange={e => setTeamFilter(e.target.value)}
              style={{ minWidth: 120 }}
            >
              <option value="">All</option>
              {teamOptions.map(team => (
                <option key={team.team_id} value={team.label}>{team.label}</option>
              ))}
            </select>
            {/* Month Filter Dropdown */}
            <label className="font-semibold text-blue-700 mr-2">Month:</label>
            <input
              type="month"
              className="border border-blue-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-500 bg-white shadow-sm transition min-w-[120px]"
              value={dailyMonth}
              onChange={e => setDailyMonth(e.target.value)}
              style={{ minWidth: 120 }}
            />
            {/* Export All Button */}
            <button
              className="px-3 py-1 rounded bg-linear-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white text-xs font-semibold border border-green-700 shadow-sm transition"
              onClick={handleExportAllUsers}
            >
              Export All
            </button>
            {/* Clear Filters Button */}
            <button
              className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs font-semibold border border-gray-400 shadow-sm transition"
              onClick={() => {
                setTeamFilter('');
                setDailyMonth('');
              }}
              type="button"
            >
              Clear Filters
            </button>
          </div>
          {/* User Cards for QA agent daily data, each with its own date range and export */}
          <div className="space-y-6">
            {loadingDaily ? (
              <div className="py-8 text-center text-blue-700 font-semibold">Loading daily report...</div>
            ) : errorDaily ? (
              <div className="py-8 text-center text-red-600 font-semibold">{errorDaily}</div>
            ) : filteredDailyData.length > 0 ? (
              // Group daily data by user_id, filter by team if set
              Object.entries(filteredDailyData.reduce((acc, row) => {
                if (teamFilter && row.team_name !== teamFilter) return acc;
                const key = row.user_id || 'unknown';
                if (!acc[key]) acc[key] = { user: row, rows: [] };
                acc[key].rows.push(row);
                return acc;
              }, {})).map(([userId, { user, rows }]) => (
                <UserCard
                  key={userId}
                  user={user}
                  dailyData={(() => {
                    const mappedData = rows.map(r => {
                      // Format date as DD-MM-YYYY, never show time
                      let date = '-';
                      if (r.work_date) {
                        const d = new Date(r.work_date);
                        if (!isNaN(d.getTime())) {
                          const pad = n => String(n).padStart(2, '0');
                          date = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
                        }
                      }
                      // Map response fields to display format
                      let worked_hours = '-';
                      if (r.cumulative_billable_hours_till_day !== null && r.cumulative_billable_hours_till_day !== undefined && !isNaN(Number(r.cumulative_billable_hours_till_day))) {
                        worked_hours = Number(r.cumulative_billable_hours_till_day).toFixed(2);
                      }
                      let daily_required_hours = '-';
                      if (r.daily_required_hours !== null && r.daily_required_hours !== undefined && !isNaN(Number(r.daily_required_hours))) {
                        daily_required_hours = Number(r.daily_required_hours).toFixed(2);
                      }
                      return {
                        date,
                        date_time: date, // Also set date_time for compatibility
                        assign_hours: '-',
                        assignHours: '-', // Alternative field name
                        worked_hours,
                        workedHours: worked_hours, // Alternative field name
                        billable_hours: worked_hours, // Alternative field name
                        qc_score: '-',
                        qcScore: '-', // Alternative field name
                        daily_required_hours,
                        dailyRequiredHours: daily_required_hours, // Alternative field name
                      };
                    });
                    console.log('Mapped data for UserCard:', mappedData);
                    return mappedData;
                  })()}
                  defaultCollapsed={true}
                  formatDateTime={formatDateTime}
                />
              ))
            ) : (
              <div className="py-8 text-center text-gray-400">No data available</div>
            )}
          </div>
        </div>
      )}




      {/* Monthly Report view (month cards with user-wise table) */}
      {activeToggle === 'monthly' && (
        <div className="w-full max-w-7xl mx-auto mt-4">
          {/* Month/Year Filter and Export All */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <label className="font-semibold text-blue-700">Month:</label>
            <input
              type="month"
              className="border border-blue-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-500 bg-white shadow-sm transition"
              value={monthlyMonth}
              onChange={e => setMonthlyMonth(e.target.value)}
              style={{ minWidth: 120 }}
            />
            {/* Clear Filters Button */}
            <button
              className="px-3 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs font-semibold border border-gray-400 shadow-sm transition"
              onClick={() => {
                setMonthlyMonth('');
              }}
              type="button"
            >
              Clear Filters
            </button>
          </div>
          {loadingMonthly ? (
            <div className="py-8 text-center text-blue-700 font-semibold">Loading monthly report...</div>
          ) : errorMonthly ? (
            <div className="py-8 text-center text-red-600 font-semibold">{errorMonthly}</div>
          ) : monthlySummaryData.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupByMonthYear(monthlySummaryData)).map(([month, users]) => (
                <MonthCard
                  key={month}
                  month={parseMonthYear(month)}
                  users={users}
                  onExport={(user) => handleExportMonthDailyData(user, parseMonthYear(month))}
                  onExportMonth={handleExportMonthTable}
                  teamOptions={teamOptions}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400">No monthly data available</div>
          )}
        </div>
      )}
    </div>
  );

// Helper to group data by month_year (robust, with fallback)
function groupByMonthYear(data) {
  return data.reduce((acc, item) => {
    let key = item.month_year;
    if (!key || typeof key !== 'string' || !/^[A-Z]+\d{4}$/.test(key)) {
      // fallback: try to build from item.month and item.year, or use 'Unknown'
      key = (item.month && item.year) ? `${item.month.toUpperCase()}${item.year}` : 'Unknown';
    }
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}


// Helper to parse month label and year from month_year string (e.g., JAN2026)
function parseMonthYear(monthYear) {
  if (!monthYear) return { label: '-', year: '-' };
  const match = monthYear.match(/^([A-Z]+)(\d{4})$/);
  if (match) {
    return { label: match[1], year: match[2] };
  }
  return { label: monthYear, year: '' };
}
}

export default BillableReport;