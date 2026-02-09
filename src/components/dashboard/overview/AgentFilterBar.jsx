import React, { useState } from 'react';
import { Calendar, RotateCcw, Filter } from 'lucide-react';

const AgentFilterBar = ({ dateRange, setDateRange }) => {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({ ...prev, [name]: value }));
  };

  // Handle date selection from custom calendar
  const handleDateSelect = (name, dateValue) => {
    setDateRange((prev) => ({ ...prev, [name]: dateValue }));
    if (name === 'start') setShowStartPicker(false);
    if (name === 'end') setShowEndPicker(false);
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

  // Clear filters - reset to today's date
  const handleClear = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateRange({ start: today, end: today });
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200 mb-4">
      {/* Filter Controls */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
        {/* Header with Filter Icon - Left side */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-sm">
            <Filter className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 leading-tight">Date Range Filter</h3>
            <p className="text-xs text-slate-500 font-medium">Select your preferred date range</p>
          </div>
        </div>

        {/* Start Date */}
        <div className="flex-1 relative">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase mb-1.5">
            <Calendar className="w-3 h-3 text-blue-600" />
            From
          </label>
          <div className="relative">
            <input
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm hover:bg-white cursor-pointer"
              type="text"
              readOnly
              value={formatToDisplay(dateRange.start)}
              onClick={() => {
                setShowStartPicker(!showStartPicker);
                setShowEndPicker(false);
              }}
              placeholder="DD/MM/YYYY"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <CustomDatePicker 
            name="start"
            value={dateRange.start}
            onSelect={handleDateSelect}
            show={showStartPicker}
            onClose={() => setShowStartPicker(false)}
          />
        </div>

        {/* End Date */}
        <div className="flex-1 relative">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase mb-1.5">
            <Calendar className="w-3 h-3 text-blue-600" />
            To
          </label>
          <div className="relative">
            <input
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-sm font-medium rounded-lg px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm hover:bg-white cursor-pointer"
              type="text"
              readOnly
              value={formatToDisplay(dateRange.end)}
              onClick={() => {
                setShowEndPicker(!showEndPicker);
                setShowStartPicker(false);
              }}
              placeholder="DD/MM/YYYY"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
          <CustomDatePicker 
            name="end"
            value={dateRange.end}
            onSelect={handleDateSelect}
            show={showEndPicker}
            onClose={() => setShowEndPicker(false)}
          />
        </div>

        {/* Clear Button */}
        <div className="flex-shrink-0">
          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600 uppercase mb-1.5 opacity-0">
            Action
          </label>
          <button
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-lg px-6 py-2.5 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 group"
            onClick={handleClear}
          >
            <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
            Reset to Today
          </button>
        </div>
      </div>
    </div>
  );
};

export default AgentFilterBar;
