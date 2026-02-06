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
import { Users, Calendar, Download, RotateCcw } from "lucide-react";

const BillableReport = ({ userId }) => {
  // Device info (declare once at top)
  const { device_id, device_type } = useDeviceInfo();

  // Helper to format date/time for display and export
  // Always return raw backend string for date/time
  function formatDateTime(dateInput) {
    if (!dateInput) return '-';
    return dateInput;
  }

  // Search filter state (client-side filtering by agent name)
  const [searchQuery, setSearchQuery] = useState('');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showMonthlyMonthPicker, setShowMonthlyMonthPicker] = useState(false);
  const { user } = useAuth();

  // Check if user is Assistant Manager
  const isAssistantManager = user?.role_id === 4 || 
    (user?.role_name || user?.role || '').toLowerCase().includes('assistant');

  // Export all users' daily data (filtered by search query if set)
  function handleExportAllUsers() {
    try {
      // Filter daily data by search query
      const exportRows = dailyData.filter(row => {
        // Filter by search query (agent name)
        if (searchQuery) {
          const userName = (row.user_name || '').toLowerCase();
          const query = searchQuery.toLowerCase();
          if (!userName.includes(query)) return false;
        }
        return true;
      });

      if (!exportRows.length) {
        toast.error('No data to export.');
        return;
      }

      // Prepare export data
      const exportData = exportRows.map(row => {
        // Format date from work_date
        let dateDisplay = '-';
        if (row.work_date) {
          const d = new Date(row.work_date);
          if (!isNaN(d.getTime())) {
            const pad = n => String(n).padStart(2, '0');
            dateDisplay = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
          }
        }
        
        // Helper to safely format number or return '-'
        const formatNumber = (val) => {
          if (val === null || val === undefined || val === '') return '-';
          const num = Number(val);
          return isNaN(num) ? '-' : num.toFixed(2);
        };
        
        const rowData = {
          'User Name': row.user_name || '-',
          'Date': dateDisplay,
          'Worked Hours': formatNumber(row.total_billable_hours_day),
          'Daily Required Hours': formatNumber(row.daily_required_hours)
        };
        
        // Add Team column only if not Assistant Manager
        if (!isAssistantManager) {
          rowData['Team'] = row.team_name || '-';
        }
        
        return rowData;
      });

      // Add total row for countable columns
      if (exportData.length > 0) {
        const totalWorked = exportData.reduce((sum, r) => sum + (parseFloat(r['Worked Hours']) || 0), 0);
        const totalRequired = exportData.reduce((sum, r) => sum + (parseFloat(r['Daily Required Hours']) || 0), 0);
        const totalRow = {
          'User Name': 'Total',
          'Date': '',
          'Worked Hours': totalWorked.toFixed(2),
          'Daily Required Hours': totalRequired.toFixed(2)
        };
        
        if (!isAssistantManager) {
          totalRow['Team'] = '';
        }
        
        exportData.push(totalRow);
      }

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const colWidths = [
        { wch: 18 }, // User Name
      ];
      
      if (!isAssistantManager) {
        colWidths.push({ wch: 16 }); // Team
      }
      
      colWidths.push(
        { wch: 16 }, // Date
        { wch: 16 }, // Worked Hours
        { wch: 20 }  // Daily Required Hours
      );
      
      worksheet['!cols'] = colWidths;
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
      let exportData = usersArr.map(user => {
        const rowData = {
          'User Name': user.user_name || '-',
          'Billable Hour Delivered': user.total_billable_hours ? Number(user.total_billable_hours).toFixed(2) : '-',
          'Monthly Goal': user.monthly_total_target ?? '-',
          'Pending Target': user.pending_target ? Number(user.pending_target).toFixed(2) : '-',
          'Avg. QC Score': user.avg_qc_score ? Number(user.avg_qc_score).toFixed(2) : '-',
        };
        
        // Add Team column only if not Assistant Manager
        if (!isAssistantManager) {
          rowData['Team'] = user.team_name || '-';
        }
        
        return rowData;
      });
      // Add totals row for numeric columns
      if (exportData.length > 0) {
        const totalBillable = exportData.reduce((sum, r) => sum + (parseFloat(r['Billable Hour Delivered']) || 0), 0);
        const totalGoal = exportData.reduce((sum, r) => sum + (parseFloat(r['Monthly Goal']) || 0), 0);
        const totalPending = exportData.reduce((sum, r) => sum + (parseFloat(r['Pending Target']) || 0), 0);
        // For Avg. QC Score, show average if all are numbers
        const qcScores = exportData.map(r => Number(r['Avg. QC Score'])).filter(v => !isNaN(v));
        const avgQC = qcScores.length > 0 ? (qcScores.reduce((a, b) => a + b, 0) / qcScores.length).toFixed(2) : '-';
        
        const totalRow = {
          'User Name': 'Total',
          'Billable Hour Delivered': totalBillable.toFixed(2),
          'Monthly Goal': totalGoal.toFixed(2),
          'Pending Target': totalPending.toFixed(2),
          'Avg. QC Score': avgQC,
        };
        
        if (!isAssistantManager) {
          totalRow['Team'] = '';
        }
        
        exportData.push(totalRow);
      }
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const colWidths = [
        { wch: 18 }, // User Name
      ];
      
      if (!isAssistantManager) {
        colWidths.push({ wch: 16 }); // Team
      }
      
      colWidths.push(
        { wch: 24 }, // Billable Hour Delivered
        { wch: 16 }, // Monthly Goal
        { wch: 16 }, // Pending Target
        { wch: 16 }  // Avg. QC Score
      );
      
      worksheet['!cols'] = colWidths;
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
      return sessionStorage.getItem('billable_active_tab') || 'daily';
    }
    return 'daily';
  });

  // Persist tab selection to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('billable_active_tab', activeToggle);
    }
  }, [activeToggle]);
  // (Date range filter removed)
  // Helper function to get current month in YYYY-MM format
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  // State for month filter (monthly) - default to current month
  const [monthlyMonth, setMonthlyMonth] = useState(getCurrentMonth());
  // State for month filter (daily report) - default to current month
  const [dailyMonth, setDailyMonth] = useState(getCurrentMonth());

  // Helper function to get month's first and last day
  const getMonthDateRange = (monthStr) => {
    let year, month;
    
    if (!monthStr) {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1;
    } else {
      [year, month] = monthStr.split('-').map(Number);
    }
    
    const firstDay = 1;
    const lastDay = new Date(year, month, 0).getDate();
    const pad = (n) => String(n).padStart(2, '0');
    
    return {
      start: `${year}-${pad(month)}-${pad(firstDay)}`,
      end: `${year}-${pad(month)}-${pad(lastDay)}`
    };
  };

  // State for API data, loading, and error
  const [dailyData, setDailyData] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [errorDaily, setErrorDaily] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // State to track which user cards are expanded (persists across data refetches)
  const [expandedCards, setExpandedCards] = useState({});

  // Store user information persistently (so cards remain visible even with no data)
  const [userInfoMap, setUserInfoMap] = useState({});

  // Reset user map when month filter changes (not for search query changes)
  React.useEffect(() => {
    setUserInfoMap({});
  }, [dailyMonth]);

  // Helper to get YYYY-MM-DD string
  const getDateString = (date) => date.toISOString().slice(0, 10);

  // Track if this is a date-only filter change (to avoid showing loading spinner)
  const prevFiltersRef = React.useRef({ dailyMonth });

  React.useEffect(() => {
    const prev = prevFiltersRef.current;
    // Check if month changed
    if (prev.dailyMonth !== dailyMonth) {
      prevFiltersRef.current = { dailyMonth };
    }
  }, [dailyMonth]);

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
        // Month filter
        if (dailyMonth) {
          const [year, month] = dailyMonth.split('-');
          const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          const monthLabel = monthNames[Number(month) - 1];
          payload.month_year = `${monthLabel}${year}`;
        }
        // User filter (if userId is passed as prop)
        if (userId) payload.user_id = userId;
        // Call the /tracker/view_daily API
        const res = await api.post('/tracker/view_daily', payload);
        console.log('Daily report API response:', res.data);
        console.log('Payload sent:', payload);
        // Get trackers from API response
        let trackers = Array.isArray(res.data?.data?.trackers) ? res.data.data.trackers : [];
        console.log('Trackers extracted:', trackers);
        
        // Store user information for all users (persists across date filter changes)
        const newUserInfoMap = {};
        trackers.forEach(tracker => {
          if (tracker.user_id) {
            newUserInfoMap[tracker.user_id] = {
              user_id: tracker.user_id,
              user_name: tracker.user_name,
              team_name: tracker.team_name,
              team_id: tracker.team_id
            };
          }
        });
        setUserInfoMap(newUserInfoMap);
        
        setDailyData(trackers);
      } catch {
        setErrorDaily("Failed to fetch daily report data");
      } finally {
        setLoadingDaily(false);
      }
    };
    fetchData();
    // eslint-disable-next-line
  }, [userId, dailyMonth, refreshTrigger]);

  // Function to refresh daily data
  const handleRefreshData = () => {
    console.log('Refreshing daily report data...');
    setRefreshTrigger(prev => prev + 1);
  };

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

  // Custom Dropdown Component
  const CustomDropdown = ({ options, value, onChange, placeholder, show, onClose }) => {
    if (!show) return null;

    return (
      <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border-2 border-blue-200 max-h-60 overflow-y-auto">
        {/* All option */}
        <div
          onClick={() => {
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
        {options.map((option) => (
          <div
            key={option.value}
            onClick={() => {
              onChange(option.value);
              onClose();
            }}
            className={`px-4 py-2.5 cursor-pointer transition-all ${
              String(value) === String(option.value)
                ? 'bg-blue-50 text-blue-700 font-semibold'
                : 'hover:bg-blue-50 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {String(value) === String(option.value) && (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
              <span className="text-sm">{option.label}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Custom Month Picker Component
  const CustomMonthPicker = ({ value, onChange, show, onClose }) => {
    const [viewYear, setViewYear] = useState(() => {
      if (value) {
        const [year] = value.split('-');
        return parseInt(year);
      }
      return new Date().getFullYear();
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const handlePrevYear = () => setViewYear(viewYear - 1);
    const handleNextYear = () => setViewYear(viewYear + 1);

    const handleMonthSelect = (monthIndex) => {
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      onChange(`${viewYear}-${monthStr}`);
      onClose();
    };

    if (!show) return null;

    const [selectedYear, selectedMonth] = value ? value.split('-').map(Number) : [null, null];

    return (
      <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-xl border-2 border-blue-200 p-4 w-72">
        {/* Year Header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={handlePrevYear} className="p-1.5 hover:bg-slate-100 rounded transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="font-bold text-base text-slate-800">{viewYear}</span>
          <button onClick={handleNextYear} className="p-1.5 hover:bg-slate-100 rounded transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Month Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {monthNames.map((month, index) => {
            const isSelected = selectedYear === viewYear && selectedMonth === index + 1;
            const isCurrent = viewYear === currentYear && index === currentMonth;
            return (
              <button
                key={month}
                onClick={() => handleMonthSelect(index)}
                className={`text-sm py-3 px-2 rounded-lg font-semibold transition-all ${
                  isSelected 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : isCurrent
                    ? 'bg-blue-50 text-blue-700 border border-blue-300'
                    : 'text-slate-700 hover:bg-blue-50 border border-transparent'
                }`}
              >
                {month}
              </button>
            );
          })}
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="w-full text-sm text-slate-600 hover:text-slate-800 font-semibold py-2 hover:bg-slate-50 rounded transition"
        >
          Close
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-2 sm:px-4">
      <div className="w-full max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-blue-100 p-2 mb-6">
        <div className="flex items-center gap-2">
          <button
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${activeToggle === 'daily' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' : 'text-blue-700 hover:bg-blue-50'}`}
            onClick={() => setActiveToggle('daily')}
          >
            Daily Report
          </button>
          <button
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${activeToggle === 'monthly' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' : 'text-blue-700 hover:bg-blue-50'}`}
            onClick={() => setActiveToggle('monthly')}
          >
            Monthly Report
          </button>
        </div>
      </div>
      {/* Daily Report view (user cards, QA agent side only) */}
      {activeToggle === 'daily' && (
        <div className="w-full max-w-7xl mx-auto mt-4">
          {/* Filter Section - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-md border border-blue-100 p-6 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              {/* Search Filter - Expanded Width */}
              <div className="relative flex-1 min-w-[250px]">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  Search Agent
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by agent name..."
                  className="w-full px-4 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all hover:border-blue-400"
                />
              </div>
              
              {/* Month Filter */}
              <div className="relative">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Month
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={dailyMonth ? (() => {
                      const [year, month] = dailyMonth.split('-');
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    })() : ''}
                    readOnly
                    className="w-full px-4 py-2.5 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all min-w-[160px] cursor-pointer"
                    placeholder="Select month"
                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowMonthPicker(!showMonthPicker)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-100 rounded transition-colors"
                  >
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </button>
                  <CustomMonthPicker
                    value={dailyMonth}
                    onChange={(val) => setDailyMonth(val)}
                    show={showMonthPicker}
                    onClose={() => setShowMonthPicker(false)}
                  />
                </div>
              </div>
              
              {/* Reset Filters Button */}
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDailyMonth(getCurrentMonth());
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg px-6 py-2.5 transition-all shadow-sm hover:shadow-md group"
                type="button"
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                Reset Filters
              </button>
              
              {/* Export All Button */}
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                onClick={handleExportAllUsers}
              >
                <Download className="w-4 h-4" />
                Export All
              </button>
            </div>
          </div>
          {/* User Cards for QA agent daily data, each with its own date range and export */}
          <div className="space-y-6">
            {loadingDaily ? (
              <div className="py-8 text-center text-blue-700 font-semibold">Loading daily report...</div>
            ) : errorDaily ? (
              <div className="py-8 text-center text-red-600 font-semibold">{errorDaily}</div>
            ) : Object.keys(userInfoMap).length > 0 ? (
              // Show cards for all users that have ever appeared
              (() => {
                // First, group current data by user_id
                const groupedData = {};
                
                filteredDailyData.forEach(row => {
                  const key = row.user_id || 'unknown';
                  if (!groupedData[key]) {
                    groupedData[key] = { user: row, rows: [] };
                  }
                  groupedData[key].rows.push(row);
                });

                // Then, ensure ALL stored users have an entry (even if no data for current date range)
                Object.keys(userInfoMap).forEach(userId => {
                  const userInfo = userInfoMap[userId];
                  
                  if (!groupedData[userId]) {
                    // User has no data for current date range, but keep card visible
                    groupedData[userId] = { user: userInfo, rows: [] };
                  }
                });

                // Apply client-side search filter by agent name
                const filteredGroupedData = Object.entries(groupedData).filter(([userId, { user }]) => {
                  if (!searchQuery) return true; // No search query, show all
                  const userName = (user.user_name || '').toLowerCase();
                  const query = searchQuery.toLowerCase();
                  return userName.includes(query);
                });

                return filteredGroupedData.map(([userId, { user, rows }]) => (
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
                      if (r.total_billable_hours_day !== null && r.total_billable_hours_day !== undefined && !isNaN(Number(r.total_billable_hours_day))) {
                        worked_hours = Number(r.total_billable_hours_day).toFixed(2);
                      }
                      let daily_required_hours = '-';
                      if (r.daily_required_hours !== null && r.daily_required_hours !== undefined && !isNaN(Number(r.daily_required_hours))) {
                        daily_required_hours = Number(r.daily_required_hours).toFixed(2);
                      }
                      // Get assigned_hours from API response
                      let assigned_hours = r.assigned_hours !== null && r.assigned_hours !== undefined ? r.assigned_hours : null;
                      // Get qc_score from API response
                      let qc_score = r.qc_score !== null && r.qc_score !== undefined ? r.qc_score : null;
                      
                      return {
                        date,
                        date_time: date, // Also set date_time for compatibility
                        work_date: r.work_date, // Keep original work_date for filtering
                        assigned_hours, // Use actual value from API
                        assign_hours: assigned_hours, // Alternative field name
                        assignHours: assigned_hours, // Alternative field name
                        worked_hours,
                        workedHours: worked_hours, // Alternative field name
                        billable_hours: worked_hours, // Alternative field name
                        total_billable_hours_day: r.total_billable_hours_day, // Keep original field
                        qc_score, // Use actual value from API
                        qcScore: qc_score, // Alternative field name
                        daily_required_hours,
                        dailyRequiredHours: daily_required_hours, // Alternative field name
                        tenure_target: r.daily_required_hours, // Alternative field name
                      };
                    });
                    console.log('Mapped data for UserCard:', mappedData);
                    return mappedData;
                  })()}
                  expanded={expandedCards[userId] === true}
                  onToggleExpand={(isExpanded) => {
                    setExpandedCards(prev => ({ ...prev, [userId]: isExpanded }));
                  }}
                  selectedMonth={dailyMonth}
                  formatDateTime={formatDateTime}
                  onRefresh={handleRefreshData}
                />
                ));
              })()
            ) : (
              <div className="py-8 text-center text-gray-400">No data available</div>
            )}
          </div>
        </div>
      )}




      {/* Monthly Report view (month cards with user-wise table) */}
      {activeToggle === 'monthly' && (
        <div className="w-full max-w-7xl mx-auto mt-4">
          {/* Month/Year Filter Section */}
          <div className="bg-gradient-to-r from-blue-50 via-white to-indigo-50 rounded-xl shadow-md border border-blue-200 p-6 mb-6">
            <div className="flex flex-wrap items-end gap-4">
              {/* Month Filter */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Select Month
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowMonthlyMonthPicker(!showMonthlyMonthPicker)}
                    className="w-48 px-4 py-2.5 bg-white border-2 border-blue-300 rounded-lg text-sm font-semibold text-slate-700 hover:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all shadow-sm flex items-center justify-between"
                  >
                    <span>{monthlyMonth ? (() => {
                      const [year, month] = monthlyMonth.split('-');
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    })() : 'All Months'}</span>
                    <Calendar className="w-4 h-4" />
                  </button>
                  <CustomMonthPicker
                    value={monthlyMonth}
                    onChange={(val) => setMonthlyMonth(val)}
                    show={showMonthlyMonthPicker}
                    onClose={() => setShowMonthlyMonthPicker(false)}
                  />
                </div>
              </div>

              {/* Reset Filters Button */}
              <button
                onClick={() => {
                  setMonthlyMonth(getCurrentMonth());
                  setShowMonthlyMonthPicker(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                title="Reset all filters"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Filters
              </button>
            </div>
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
                  hideTeamColumn={isAssistantManager}
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