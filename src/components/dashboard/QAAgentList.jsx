/**
 * File: QAAgentList.jsx
 * Author: Naitik Maisuriya
 * Description: QA Agent List - Shows assigned agents with their tracker data (files only)
 */
import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Download, FileText, FileCheck, Users as UsersIcon, Search, X, RefreshCw, Calendar, RotateCcw } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { log, logError } from "../../config/environment";

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const QAAgentList = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState({});
  const [agentTrackers, setAgentTrackers] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // Per-agent date filter states
  const [agentDateFilters, setAgentDateFilters] = useState({});
  
  // Custom calendar picker states per agent
  const [showStartPicker, setShowStartPicker] = useState({});
  const [showEndPicker, setShowEndPicker] = useState({});

  // Project/task name mapping state
  const [projectNameMap, setProjectNameMap] = useState({});
  const [taskNameMap, setTaskNameMap] = useState({});


  // Fetch project/task mapping, then tracker data
  useEffect(() => {
    const fetchAllData = async () => {
      if (!user?.user_id) return;
      setLoading(true);
      try {
        // 1. Fetch mapping
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

        // 2. Fetch ALL tracker data (no date filter) to get all agents assigned to this QA
        const allTrackersRes = await api.post("/tracker/view", {
          logged_in_user_id: user?.user_id
        });
        const allTrackerData = allTrackersRes.data?.data || {};
        const allTrackers = allTrackerData.trackers || [];
        let myTrackers = allTrackers;
        if (myTrackers.some(t => t.qa_agent_id !== undefined)) {
          myTrackers = myTrackers.filter(t => String(t.qa_agent_id) === String(user?.user_id));
        }
        
        // Build agents list from ALL tracker data (to get all agents ever assigned)
        const agentsMap = {};
        myTrackers.forEach(tracker => {
          if (!agentsMap[String(tracker.user_id)]) {
            agentsMap[String(tracker.user_id)] = {
              user_id: tracker.user_id,
              user_name: tracker.user_name || '-',
            };
          }
        });
        const allAgents = Object.values(agentsMap);
        
        // 3. Fetch today's tracker data to get initial file counts
        const today = getTodayDate();
        const todayTrackersRes = await api.post("/tracker/view", {
          logged_in_user_id: user?.user_id,
          date_from: today,
          date_to: today
        });
        const todayTrackerData = todayTrackersRes.data?.data || {};
        const todayTrackers = todayTrackerData.trackers || [];
        let myTodayTrackers = todayTrackers;
        if (myTodayTrackers.some(t => t.qa_agent_id !== undefined)) {
          myTodayTrackers = myTodayTrackers.filter(t => String(t.qa_agent_id) === String(user?.user_id));
        }
        
        // Build initial trackers by agent for today (for file counts)
        const initialTrackersByAgent = {};
        allAgents.forEach(agent => {
          initialTrackersByAgent[agent.user_id] = myTodayTrackers
            .filter(t => String(t.user_id) === String(agent.user_id) && t.tracker_file)
            .map(tracker => ({
              ...tracker,
              user_name: tracker.user_name || agent.user_name || '-',
              project_name: tracker.project_name || pMap[String(tracker.project_id)] || '-',
              task_name: tracker.task_name || tMap[String(tracker.task_id)] || '-',
            }));
        });
        
        setAgents(allAgents);
        setAgentTrackers(initialTrackersByAgent);
        
        // Initialize date filters for all agents to today's date
        const initialDateFilters = {};
        allAgents.forEach(agent => {
          initialDateFilters[agent.user_id] = { startDate: today, endDate: today };
        });
        setAgentDateFilters(initialDateFilters);
        
        log('[QAAgentList] Agents loaded:', allAgents.length);
      } catch (err) {
        logError('[QAAgentList] Error fetching agent list data:', err);
        toast.error("Failed to load agent data");
        setAgents([]);
        setAgentTrackers({});
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [user?.user_id]);

  // Fetch tracker data for specific agent with date range
  const fetchAgentTrackers = async (agentId, startDate = null, endDate = null) => {
    try {
      // Use provided dates or fall back to state/today's date
      const filters = startDate && endDate 
        ? { startDate, endDate }
        : (agentDateFilters[agentId] || { startDate: getTodayDate(), endDate: getTodayDate() });
      
      log('[QAAgentList] Fetching trackers for agent:', agentId, 'with dates:', filters);
      
      const trackerRes = await api.post("/tracker/view", {
        logged_in_user_id: user?.user_id,
        date_from: filters.startDate,
        date_to: filters.endDate
      });

      const trackerData = trackerRes.data?.data || {};
      const allTrackers = trackerData.trackers || [];
      
      // Filter for trackers assigned to logged-in QA
      let myTrackers = allTrackers;
      if (myTrackers.some(t => t.qa_agent_id !== undefined)) {
        myTrackers = myTrackers.filter(t => String(t.qa_agent_id) === String(user?.user_id));
      }
      
      // Filter for this specific agent and only trackers with files
      const agentSpecificTrackers = myTrackers
        .filter((tracker) => String(tracker.user_id) === String(agentId) && tracker.tracker_file)
        .map(tracker => ({
          ...tracker,
          project_name: tracker.project_name || projectNameMap[String(tracker.project_id)] || '-',
          task_name: tracker.task_name || taskNameMap[String(tracker.task_id)] || '-',
        }));
      
      log('[QAAgentList] Found trackers for agent:', agentSpecificTrackers.length);
      
      setAgentTrackers(prev => ({
        ...prev,
        [agentId]: agentSpecificTrackers
      }));
    } catch (error) {
      logError("[QAAgentList] Error fetching agent trackers:", error);
      toast.error("Failed to fetch tracker data");
    }
  };

  // Toggle agent card expansion
  const toggleAgent = (agentId) => {
    const isCurrentlyExpanded = expandedAgents[agentId];
    
    setExpandedAgents(prev => ({
      ...prev,
      [agentId]: !prev[agentId]
    }));
    
    // If expanding (not currently expanded), fetch fresh data
    if (!isCurrentlyExpanded) {
      fetchAgentTrackers(agentId);
    }
  };

  // Filter and sort agents based on search query
  const filteredAndSortedAgents = useMemo(() => {
    if (!searchQuery.trim()) {
      return agents;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = agents.filter(agent => 
      agent.user_name.toLowerCase().includes(query)
    );
    
    // Sort: exact matches first, then partial matches
    return filtered.sort((a, b) => {
      const aName = a.user_name.toLowerCase();
      const bName = b.user_name.toLowerCase();
      const aStartsWith = aName.startsWith(query);
      const bStartsWith = bName.startsWith(query);
      
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      return aName.localeCompare(bName);
    });
  }, [agents, searchQuery]);

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
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

  // Handle date selection from custom calendar for specific agent
  const handleDateSelect = (agentId, name, dateValue) => {
    const currentFilters = agentDateFilters[agentId] || { startDate: getTodayDate(), endDate: getTodayDate() };
    const newFilters = {
      ...currentFilters,
      [name === 'start' ? 'startDate' : 'endDate']: dateValue
    };
    
    setAgentDateFilters(prev => ({
      ...prev,
      [agentId]: newFilters
    }));
    
    if (name === 'start') {
      setShowStartPicker(prev => ({ ...prev, [agentId]: false }));
    } else if (name === 'end') {
      setShowEndPicker(prev => ({ ...prev, [agentId]: false }));
    }
    
    // Fetch updated data with new dates immediately
    fetchAgentTrackers(agentId, newFilters.startDate, newFilters.endDate);
  };

  // Reset filters for specific agent
  const handleResetAgentFilters = (agentId) => {
    const today = getTodayDate();
    setAgentDateFilters(prev => ({
      ...prev,
      [agentId]: { startDate: today, endDate: today }
    }));
    // Fetch updated data with today's date immediately
    fetchAgentTrackers(agentId, today, today);
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

  // Custom Date Picker Component
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

  // Handle QC Form action
  const handleQCForm = (tracker) => {
    log('[QAAgentList] Opening QC Form for tracker:', tracker.tracker_id);
    // TODO: Implement QC Form modal or navigation
    toast.success("QC Form functionality coming soon!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight cursor-default">Agent File Report</h2>
              <p className="text-slate-600 text-sm font-medium mt-1 cursor-default">View and manage agent files with QC forms</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by agent name..."
                className="w-full pl-10 pr-10 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery && (
              <div className="text-sm text-slate-600 font-medium whitespace-nowrap">
                {filteredAndSortedAgents.length} result{filteredAndSortedAgents.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {/* Agent List */}
        <div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
              <span className="text-slate-600 font-medium text-base">Loading agent data...</span>
            </div>
          ) : filteredAndSortedAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-lg border border-slate-200">
              <UsersIcon className="w-16 h-16 text-slate-300 mb-4" />
              <span className="text-slate-600 font-medium text-base">
                {searchQuery ? `No agents found matching "${searchQuery}"` : 'No agent data found'}
              </span>
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-semibold text-sm"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAndSortedAgents.map((agent) => {
                const trackers = agentTrackers[agent.user_id] || [];
                const isExpanded = expandedAgents[agent.user_id];
                return (
                  <div
                    key={agent.user_id}
                    className="bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-300"
                  >
                    {/* Agent Header */}
                    <div
                      className="flex items-center justify-between px-6 py-4 cursor-pointer select-none border-b border-slate-100 hover:bg-slate-50 transition-colors rounded-t-2xl"
                      onClick={() => toggleAgent(agent.user_id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UsersIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-800 text-lg">
                            {agent.user_name}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
                              <FileText className="w-3 h-3" />
                              {trackers.length} file{trackers.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isExpanded ? 'bg-blue-100' : 'bg-slate-100'
                        }`}>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-blue-600" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Agent Details (Expanded) */}
                    {isExpanded && (
                      <div className="p-6 bg-slate-50/30">
                        {/* Date Range Filter for this agent */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-3 mb-4 border border-blue-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Start Date */}
                            <div className="relative">
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                Start Date
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatToDisplay(agentDateFilters[agent.user_id]?.startDate || getTodayDate())}
                                  readOnly
                                  className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all cursor-pointer"
                                  placeholder="dd/mm/yyyy"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowStartPicker(prev => ({ ...prev, [agent.user_id]: !prev[agent.user_id] }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-100 rounded transition-colors"
                                >
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                </button>
                                <CustomDatePicker 
                                  name="start"
                                  value={agentDateFilters[agent.user_id]?.startDate || getTodayDate()}
                                  onSelect={(name, dateValue) => handleDateSelect(agent.user_id, name, dateValue)}
                                  show={showStartPicker[agent.user_id]}
                                  onClose={() => setShowStartPicker(prev => ({ ...prev, [agent.user_id]: false }))}
                                />
                              </div>
                            </div>

                            {/* End Date */}
                            <div className="relative">
                              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                End Date
                              </label>
                              <div className="relative">
                                <input
                                  type="text"
                                  value={formatToDisplay(agentDateFilters[agent.user_id]?.endDate || getTodayDate())}
                                  readOnly
                                  className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-all cursor-pointer"
                                  placeholder="dd/mm/yyyy"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowEndPicker(prev => ({ ...prev, [agent.user_id]: !prev[agent.user_id] }))}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-blue-100 rounded transition-colors"
                                >
                                  <Calendar className="w-4 h-4 text-blue-600" />
                                </button>
                                <CustomDatePicker 
                                  name="end"
                                  value={agentDateFilters[agent.user_id]?.endDate || getTodayDate()}
                                  onSelect={(name, dateValue) => handleDateSelect(agent.user_id, name, dateValue)}
                                  show={showEndPicker[agent.user_id]}
                                  onClose={() => setShowEndPicker(prev => ({ ...prev, [agent.user_id]: false }))}
                                />
                              </div>
                            </div>

                            {/* Reset Button */}
                            <div className="flex items-end">
                              <button
                                onClick={() => handleResetAgentFilters(agent.user_id)}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all duration-200 group"
                                type="button"
                              >
                                <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                                Reset to Today
                              </button>
                            </div>
                          </div>
                        </div>

                        {trackers.length > 0 ? (
                          <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm text-slate-700">
                                <thead className="bg-gradient-to-r from-blue-600 to-blue-700 sticky top-0">
                                  <tr>
                                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Date/Time</th>
                                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Project</th>
                                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-left">Task</th>
                                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-center">File</th>
                                    <th className="px-5 py-4 font-bold text-white text-xs uppercase tracking-wider text-center">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                  {trackers.map((tracker, index) => (
                                    <tr
                                      key={tracker.tracker_id || index}
                                      className={`hover:bg-slate-50 transition-colors group ${
                                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                                      }`}
                                    >
                                      <td className="px-5 py-3 align-middle whitespace-nowrap">
                                        <div className="text-slate-800 font-medium">
                                          {tracker.date_time ? (() => {
                                            const date = new Date(tracker.date_time);
                                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                            const day = date.getDate();
                                            const month = monthNames[date.getMonth()];
                                            const year = date.getFullYear();
                                            let hours = date.getHours();
                                            const minutes = String(date.getMinutes()).padStart(2, '0');
                                            const ampm = hours >= 12 ? 'PM' : 'AM';
                                            hours = hours % 12 || 12;
                                            return (
                                              <>
                                                <div className="font-semibold">{day}/{month}/{year}</div>
                                                <div className="text-xs text-slate-600">{hours}:{minutes} {ampm}</div>
                                              </>
                                            );
                                          })() : "-"}
                                        </div>
                                      </td>
                                      <td className="px-5 py-3 align-middle font-semibold text-blue-700 whitespace-nowrap">
                                        {tracker.project_name || "-"}
                                      </td>
                                      <td className="px-5 py-3 align-middle whitespace-nowrap">
                                        {tracker.task_name || "-"}
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
                                        <button
                                          onClick={() => handleQCForm(tracker)}
                                          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 mx-auto group/btn"
                                        >
                                          <FileCheck className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                          QC Form
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 text-base py-12 bg-white rounded-xl border border-slate-200">
                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p>No tracker files found for this agent</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
    </div>
  );
}

export default QAAgentList;
