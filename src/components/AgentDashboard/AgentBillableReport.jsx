import * as XLSX from 'xlsx';
import { toast } from "react-hot-toast";
import React, { useState, useEffect } from "react";
import { getFriendlyErrorMessage } from '../../utils/errorMessages';
import ErrorMessage from '../common/ErrorMessage';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);
import { fetchDailyBillableReport, fetchMonthlyBillableReport } from "../../services/billableReportService";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import { Download, Calendar, FileSpreadsheet, X, RotateCcw } from "lucide-react";



const BillableReport = () => {
  // Always call hooks at the top
  const { user } = useAuth();
  // Export the visible monthly report table (with filters applied)
  const handleExportMonthlyTable = () => {
      try {
        const exportData = monthlySummaryData.map(row => ({
          'Year & Month': row.month_year,
          'Billable Hours Delivered': row.total_billable_hours
            ? Number(row.total_billable_hours).toFixed(2)
            : (row.total_billable_hours_month
              ? Number(row.total_billable_hours_month).toFixed(2)
              : '-'),
          'Monthly Goal': row.monthly_total_target ?? row.monthly_goal,
          'Pending Target': row.pending_target ? Number(row.pending_target).toFixed(2) : '-',
          'Avg. QC Score': row.avg_qc_score ?? '-',
        }));

        // Calculate totals
        const totalBillable = exportData.reduce((sum, r) => sum + (Number(r['Billable Hours Delivered']) || 0), 0);
        const totalGoal = exportData.reduce((sum, r) => sum + (Number(r['Monthly Goal']) || 0), 0);
        const totalPending = exportData.reduce((sum, r) => sum + (Number(r['Pending Target']) || 0), 0);
        const qcScores = exportData.map(r => Number(r['Avg. QC Score'])).filter(v => !isNaN(v));
        const avgQC = qcScores.length > 0 ? (qcScores.reduce((a, b) => a + b, 0) / qcScores.length).toFixed(2) : '-';

        exportData.push({
          'Year & Month': 'TOTAL',
          'Billable Hours Delivered': totalBillable,
          'Monthly Goal': totalGoal,
          'Pending Target': totalPending,
          'Avg. QC Score': avgQC,
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        worksheet['!cols'] = [
          { wch: 16 },
          { wch: 24 },
          { wch: 16 },
          { wch: 16 },
          { wch: 16 },
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Report');
        const filename = `Monthly_Report.xlsx`;
        XLSX.writeFile(workbook, filename);
        toast.success('Monthly report exported!');
      } catch (err) {
        const msg = getFriendlyErrorMessage(err);
        toast.error(msg);
      }
    };
  // Export to Excel for a single monthly summary row
  const handleExportMonthlyExcelRow = (row) => {
    try {
      const exportData = [{
        'Year & Month': row.month,
        'Billable Hours Delivered': row.delivered,
        'Monthly Goal': row.goal,
        'Pending Target': row.pending,
        'Avg. QC Score': row.qc,
      }];
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 16 },
        { wch: 24 },
        { wch: 16 },
        { wch: 16 },
        { wch: 16 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, row.month);
      const filename = `Monthly_Summary_${row.month}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success(`Exported ${row.month} summary!`);
    } catch (err) {
      const msg = getFriendlyErrorMessage(err);
      toast.error(msg);
    }
  };

  // Export daily report for a specific month-year from /tracker/view
  const handleExportMonthDailyExcel = async (monthYear) => {
    try {
      // Build payload directly and use axios to match the daily report fetch pattern
      const payload = {
        logged_in_user_id: user?.user_id,
        month_year: monthYear
      };
      const res = await axios.post("/tracker/view_daily", payload);
      console.log('Export month daily API response:', res.data);
      
      // Access trackers the same way as daily report fetch
      let trackers = res.data?.data?.trackers;
      if (trackers && !Array.isArray(trackers)) trackers = [trackers];
      trackers = Array.isArray(trackers) ? trackers : [];
      
      if (trackers.length === 0) {
        toast.error('No data available for the selected month');
        return;
      }
      
      // Format and prepare export data
      const exportData = trackers.map(row => {
        let formattedDateTime = '';
        if (row.date_time) {
          const d = new Date(row.date_time);
          const pad = (n) => n.toString().padStart(2, '0');
          formattedDateTime = `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
        }
        return {
          'Date-Time': formattedDateTime,
          'Assign Hours': '-',
          'Worked Hours': row.billable_hours ? Number(row.billable_hours).toFixed(2) : '-',
          'QC score': 'qc_score' in row ? (row.qc_score !== null ? Number(row.qc_score).toFixed(2) : '-') : '-',
          'Daily Required Hours': row.tenure_target ? Number(row.tenure_target).toFixed(2) : '-',
        };
      });
      // Calculate totals for countable columns
      const totalWorked = exportData.reduce((sum, r) => sum + (Number(r['Worked Hours']) || 0), 0);
      const totalRequired = exportData.reduce((sum, r) => sum + (Number(r['Daily Required Hours']) || 0), 0);
      const qcScores = exportData.map(r => Number(r['QC score'])).filter(v => !isNaN(v));
      const avgQC = qcScores.length > 0 ? (qcScores.reduce((a, b) => a + b, 0) / qcScores.length).toFixed(2) : '-';
      exportData.push({
        'Date-Time': 'TOTAL',
        'Assign Hours': '-',
        'Worked Hours': totalWorked,
        'QC score': avgQC,
        'Daily Required Hours': totalRequired,
      });
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 20 },
        { wch: 14 },
        { wch: 14 },
        { wch: 10 },
        { wch: 20 },
      ];
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Month Daily Report');
      const filename = `Month_Daily_Report_${monthYear}.xlsx`;
      XLSX.writeFile(workbook, filename);
      toast.success('Month daily report exported!');
    } catch (err) {
      const msg = getFriendlyErrorMessage(err);
      toast.error(msg);
    }
  };

  // State for tab toggle (must be first hook)
  const [activeToggle, setActiveToggle] = useState('daily');

  // Persist tab selection to sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('agent_billable_active_tab', activeToggle);
    }
  }, [activeToggle]);
  
  // Helper function to get current month's first and last date
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    
    return {
      start: formatDate(firstDay),
      end: formatDate(lastDay),
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    };
  };
  
  // State for date range filter - default to current month
  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().start);
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().end);
  // State for month filter - default to current month
  const [monthFilter, setMonthFilter] = useState(() => getCurrentMonthRange().month);
  
  // State for custom calendar picker visibility
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // State for API data, loading, and error
  const [dailyData, setDailyData] = useState([]);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [errorDaily, setErrorDaily] = useState(null);

  // Update date range when month filter changes
  useEffect(() => {
    if (monthFilter) {
      const [year, month] = monthFilter.split('-');
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(parseInt(year), parseInt(month), 0);
      
      const formatDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      };
      
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(lastDay));
    }
  }, [monthFilter]);

  // Fetch daily report data from API on mount or when date range/month changes
  useEffect(() => {
    const fetchData = async () => {
      setLoadingDaily(true);
      setErrorDaily(null);
      try {
        // Build payload for API
        const payload = {
          logged_in_user_id: user?.user_id,
          ...(startDate && { date_from: startDate }),
          ...(endDate && { date_to: endDate }),
        };
        // Call the correct API endpoint
        const res = await axios.post("/tracker/view_daily", payload);
        console.log('Daily report API response:', res.data);
        // Fix: Use trackers array from response
        let data = res.data?.data?.trackers;
        if (data && !Array.isArray(data)) data = [data];
        setDailyData(Array.isArray(data) ? data : []);
      } catch (err) {
        setErrorDaily(getFriendlyErrorMessage(err));
      } finally {
        setLoadingDaily(false);
      }
    };
    fetchData();
  }, [startDate, endDate, user]);

  // State for monthly report API data, loading, and error
  const [monthlySummaryData, setMonthlySummaryData] = useState([]);
  const [loadingMonthly, setLoadingMonthly] = useState(false);
  const [errorMonthly, setErrorMonthly] = useState(null);
  const [monthlyMonth, setMonthlyMonth] = useState(() => getCurrentMonthRange().month);
  const [showMonthlyMonthPicker, setShowMonthlyMonthPicker] = useState(false);

  // Fetch monthly report data from API when monthly tab is active or month filter changes
  useEffect(() => {
    if (activeToggle !== 'monthly') return;
    const fetchData = async () => {
      setLoadingMonthly(true);
      setErrorMonthly(null);
      try {
        let payload = {};
        if (user?.user_id) {
          payload.logged_in_user_id = user.user_id;
        }
        if (monthlyMonth) {
          // monthlyMonth is in format YYYY-MM
          const [year, month] = monthlyMonth.split('-');
          const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
          const monthLabel = monthNames[Number(month) - 1];
          payload.month_year = `${monthLabel}${year}`;
        }
        // Use the fetchMonthlyBillableReport service function
        const res = await fetchMonthlyBillableReport(payload);
        setMonthlySummaryData(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setErrorMonthly(getFriendlyErrorMessage(err));
      } finally {
        setLoadingMonthly(false);
      }
    };
    fetchData();
  }, [activeToggle, monthlyMonth, user]);

  // No need to filter here, as API returns filtered data
  const filteredDailyData = dailyData;

  // Export filtered daily data to Excel with totals
  const handleExportDailyExcel = () => {
    try {
      // Format and prepare export data
      const exportData = filteredDailyData.map(row => {
        // Only show date part from work_date
        let formattedDate = '-';
        if (row.work_date) {
          const d = new Date(row.work_date);
          if (!isNaN(d)) {
            const pad = n => String(n).padStart(2, '0');
            formattedDate = `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;
          }
        }
        return {
          'Date': formattedDate,
          'Assign Hours': row.assigned_hours != null ? Number(row.assigned_hours).toFixed(2) : '-',
          'Worked Hours': row.total_billable_hours_day != null ? Number(row.total_billable_hours_day).toFixed(2) : '-',
          'QC Score': row.qc_score != null ? Number(row.qc_score).toFixed(2) : '-',
          'Daily Required Hours': row.daily_required_hours != null ? Number(row.daily_required_hours).toFixed(2) : '-',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Report');
      XLSX.writeFile(workbook, 'Daily_Report.xlsx');
      toast.success('Daily report exported!');
    } catch {
      toast.error('Failed to export daily report');
    }
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

  const CustomMonthPicker = ({ value, onSelect, show, onClose }) => {
    const [viewYear, setViewYear] = useState(() => {
      if (value) {
        const [year] = value.split('-');
        return parseInt(year);
      }
      return new Date().getFullYear();
    });
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const handlePrevYear = () => setViewYear(viewYear - 1);
    const handleNextYear = () => setViewYear(viewYear + 1);

    const handleMonthSelect = (monthIndex) => {
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      const dateStr = `${viewYear}-${monthStr}`;
      onSelect(dateStr);
    };

    if (!show) return null;

    const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : -1;
    const selectedYear = value ? parseInt(value.split('-')[0]) : -1;

    return (
      <div className="absolute z-50 mt-1 bg-white rounded-lg shadow-xl border-2 border-blue-200 p-3 w-64">
        {/* Year Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={handlePrevYear} className="p-1 hover:bg-slate-100 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="font-bold text-sm text-slate-800">{viewYear}</span>
          <button onClick={handleNextYear} className="p-1 hover:bg-slate-100 rounded">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Months Grid */}
        <div className="grid grid-cols-3 gap-2">
          {monthNames.map((month, index) => {
            const isSelected = selectedYear === viewYear && selectedMonth === index;
            return (
              <button
                key={month}
                onClick={() => handleMonthSelect(index)}
                className={`text-xs p-2 rounded hover:bg-blue-100 transition-colors font-medium ${
                  isSelected ? 'bg-blue-600 text-white font-bold' : 'text-slate-700'
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
          className="w-full mt-3 text-xs text-slate-600 hover:text-slate-800 font-semibold"
        >
          Close
        </button>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-2 sm:px-4">
      {/* Tabs Navigation - Match project theme */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-2 mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveToggle('daily')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeToggle === 'daily'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            Daily Report
          </button>
          <button
            onClick={() => setActiveToggle('monthly')}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeToggle === 'monthly'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                : 'text-blue-700 hover:bg-blue-50'
            }`}
          >
            Monthly Report
          </button>
        </div>
      </div>
      {/* Daily Report view (table, filter, export) */}
      {activeToggle === 'daily' && (
        <div className="w-full max-w-7xl mx-auto">
          {/* Filter Section - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-md border border-blue-100 p-6 mb-6">
            <div className="flex flex-col gap-4">
              {/* Filter Row */}
              <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                {/* Date Range Section */}
                <div className="flex-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase mb-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Date Range
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        readOnly
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm hover:bg-white cursor-pointer" 
                        value={formatToDisplay(startDate)} 
                        onClick={() => {
                          setShowStartPicker(!showStartPicker);
                          setShowEndPicker(false);
                        }}
                        placeholder="DD/MM/YYYY"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <CustomDatePicker 
                        name="start"
                        value={startDate}
                        onSelect={handleDateSelect}
                        show={showStartPicker}
                        onClose={() => setShowStartPicker(false)}
                      />
                    </div>
                    <span className="text-slate-500 font-semibold text-sm">to</span>
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        readOnly
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm hover:bg-white cursor-pointer" 
                        value={formatToDisplay(endDate)} 
                        onClick={() => {
                          setShowEndPicker(!showEndPicker);
                          setShowStartPicker(false);
                        }}
                        placeholder="DD/MM/YYYY"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <CustomDatePicker 
                        name="end"
                        value={endDate}
                        onSelect={handleDateSelect}
                        show={showEndPicker}
                        onClose={() => setShowEndPicker(false)}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Month Filter */}
                <div className="flex-1 lg:flex-none lg:w-48 relative">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase mb-2">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    Month
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm hover:bg-white cursor-pointer"
                      value={monthFilter ? (() => {
                        const [year, month] = monthFilter.split('-');
                        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                        return `${monthNames[parseInt(month) - 1]} ${year}`;
                      })() : ''}
                      onClick={() => setShowMonthPicker(!showMonthPicker)}
                      placeholder="Select Month"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <CustomMonthPicker
                    value={monthFilter}
                    onSelect={(dateStr) => {
                      setMonthFilter(dateStr);
                      setShowMonthPicker(false);
                    }}
                    show={showMonthPicker}
                    onClose={() => setShowMonthPicker(false)}
                  />
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-end gap-3">
                  <button
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all duration-200 group"
                    onClick={() => {
                      const currentMonth = getCurrentMonthRange();
                      setStartDate(currentMonth.start);
                      setEndDate(currentMonth.end);
                      setMonthFilter(currentMonth.month);
                    }}
                    type="button"
                  >
                    <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                    Reset Filters
                  </button>
                  
                  <button
                    onClick={handleExportDailyExcel}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                    title="Export filtered data to Excel"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Daily Report Table - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
            {loadingDaily ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mb-3"></div>
                <p className="text-blue-700 font-semibold">Loading daily report...</p>
              </div>
            ) : errorDaily ? (
              <div className="p-6">
                <ErrorMessage message={errorDaily} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Assign Hours</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Worked Hours</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">QC Score</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Daily Required Hours</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-blue-50">
                    {filteredDailyData.length > 0 ? (
                      filteredDailyData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors duration-150">
                          {/* Show only date part from work_date */}
                          <td className="px-6 py-4 text-gray-900 font-medium whitespace-nowrap">{
                            (() => {
                              if (row.work_date) {
                                const d = new Date(row.work_date);
                                if (!isNaN(d)) {
                                  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
                                  const day = d.getUTCDate();
                                  const month = monthNames[d.getUTCMonth()];
                                  const year = d.getUTCFullYear();
                                  return `${day}/${month}/${year}`;
                                }
                              }
                              return '-';
                            })()
                          }</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-medium">{
                            row.assigned_hours != null
                              ? Number(row.assigned_hours).toFixed(2)
                              : '-'
                          }</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-semibold">{
                            row.total_billable_hours_day != null
                              ? Number(row.total_billable_hours_day).toFixed(2)
                              : '-'
                          }</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-medium">{
                            row.qc_score != null
                              ? Number(row.qc_score).toFixed(2)
                              : '-'
                          }</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-medium">{
                            row.daily_required_hours != null
                              ? Number(row.daily_required_hours).toFixed(2)
                              : '-'
                          }</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="font-medium">No data available</p>
                          <p className="text-xs mt-1">Try adjusting your filters</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Monthly Report view (summary table, per-row export) */}
      {activeToggle === 'monthly' && (
        <div className="w-full max-w-7xl mx-auto">
          {/* Filter Section - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-md border border-blue-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              {/* Month Filter */}
              <div className="flex-1 sm:flex-none sm:w-64 relative">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase mb-2">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Select Month
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm hover:bg-white cursor-pointer"
                    value={monthlyMonth ? (() => {
                      const [year, month] = monthlyMonth.split('-');
                      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                    })() : ''}
                    onClick={() => setShowMonthlyMonthPicker(!showMonthlyMonthPicker)}
                    placeholder="Select Month"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                <CustomMonthPicker
                  value={monthlyMonth}
                  onSelect={(dateStr) => {
                    setMonthlyMonth(dateStr);
                    setShowMonthlyMonthPicker(false);
                  }}
                  show={showMonthlyMonthPicker}
                  onClose={() => setShowMonthlyMonthPicker(false)}
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-end gap-3">
                <button
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all duration-200 group"
                  onClick={() => setMonthlyMonth(getCurrentMonthRange().month)}
                  type="button"
                >
                  <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                  Reset Filters
                </button>
                
                <button
                  onClick={handleExportMonthlyTable}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>
          {/* Monthly Report Table - Enhanced Design */}
          <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
            {loadingMonthly ? (
              <div className="py-12 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600 mb-3"></div>
                <p className="text-blue-700 font-semibold">Loading monthly report...</p>
              </div>
            ) : errorMonthly ? (
              <div className="p-6">
                <div className="py-8 text-center text-red-600 font-semibold">{errorMonthly}</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-blue-100">
                  <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-blue-700 uppercase tracking-wider">Year & Month</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Billable Hours Delivered</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Monthly Goal</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Pending Target</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Avg. QC Score</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-blue-700 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-blue-50">
                    {monthlySummaryData.length > 0 ? (
                      monthlySummaryData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors duration-150">
                          <td className="px-6 py-4 text-gray-900 font-medium whitespace-nowrap">{row.month_year}</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-semibold">{row.total_billable_hours ? Number(row.total_billable_hours).toFixed(2) : (row.total_billable_hours_month ? Number(row.total_billable_hours_month).toFixed(2) : '-')}</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-medium">{row.monthly_total_target ?? row.monthly_goal}</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-medium">{row.pending_target ? Number(row.pending_target).toFixed(2) : '-'}</td>
                          <td className="px-6 py-4 text-center text-gray-900 font-medium">{row.avg_qc_score ?? '-'}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleExportMonthDailyExcel(row.month_year)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all duration-200"
                              title={`Export daily report for ${row.month_year}`}
                            >
                              <Download className="w-4 h-4" />
                              <span>Export</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">
                          <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="font-medium">No data available</p>
                          <p className="text-xs mt-1">Try adjusting your filters</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillableReport;