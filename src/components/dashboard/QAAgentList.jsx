/**
 * File: QAAgentList.jsx
 * Author: Naitik Maisuriya
 * Description: QA Agent List - Shows assigned agents with their tracker data (files only)
 */
import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Download, FileText, Users as UsersIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { log, logError } from "../../config/environment";

const QAAgentList = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedAgents, setExpandedAgents] = useState({});
  const [agentTrackers, setAgentTrackers] = useState({});
  // Removed loadingTrackers state (no longer needed)


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

        // 2. Fetch tracker data after mapping is ready
        const trackerRes = await api.post("/tracker/view", {
          logged_in_user_id: user?.user_id
        });
        const trackerData = trackerRes.data?.data || {};
        const allTrackers = trackerData.trackers || [];
        let myTrackers = allTrackers;
        if (myTrackers.some(t => t.qa_agent_id !== undefined)) {
          myTrackers = myTrackers.filter(t => String(t.qa_agent_id) === String(user?.user_id));
        }
        // Build agents list directly from filtered tracker data
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
        // Build trackers by agent (enrich with project/task names)
        let trackersByAgent = {};
        allAgents.forEach(agent => {
          trackersByAgent[agent.user_id] = myTrackers
            .filter(t => String(t.user_id) === String(agent.user_id) && t.tracker_file)
            .map(tracker => ({
              ...tracker,
              user_name: tracker.user_name || agent.user_name || '-',
              project_name: tracker.project_name || pMap[String(tracker.project_id)] || '-',
              task_name: tracker.task_name || tMap[String(tracker.task_id)] || '-',
            }));
        });
        setAgents(allAgents);
        setAgentTrackers(trackersByAgent);
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

  // Toggle agent card expansion (no async tracker fetch needed)
  const toggleAgent = (agentId) => {
    const isExpanding = !expandedAgents[agentId];
    setExpandedAgents(prev => ({
      ...prev,
      [agentId]: isExpanding
    }));
  };

  // Handle QC Form action
  const handleQCForm = (tracker) => {
    log('[QAAgentList] Opening QC Form for tracker:', tracker.tracker_id);
    // TODO: Implement QC Form modal or navigation
    toast.success("QC Form functionality coming soon!");
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-8">
      <div className="mb-8 flex items-center gap-3">
        <UsersIcon className="w-8 h-8 text-blue-600" />
        <h2 className="text-3xl font-extrabold text-blue-800 tracking-tight drop-shadow-sm">Agent File Report</h2>
      </div>
      <div>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="loader mb-4"></span>
            <span className="text-blue-600 font-semibold text-lg animate-pulse">Loading...</span>
          </div>
        ) : agents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <span className="text-4xl text-slate-300 mb-2"><UsersIcon className="w-10 h-10" /></span>
            <span className="text-slate-400 text-lg">No agent data found.</span>
          </div>
        ) : (
          <div className="space-y-8">
            {agents.map((agent) => {
              const trackers = agentTrackers[agent.user_id] || [];
              return (
                <div
                  key={agent.user_id}
                  className="mb-4 rounded-2xl shadow-lg bg-gradient-to-br from-blue-50 via-white to-slate-50 border border-slate-200 hover:shadow-2xl transition-shadow duration-300"
                >
                  <div
                    className="flex items-center justify-between px-8 py-5 cursor-pointer select-none border-b border-slate-100 bg-gradient-to-r from-blue-100/60 to-white/80 rounded-t-2xl"
                    onClick={() => toggleAgent(agent.user_id)}
                  >
                    <div className="flex items-center gap-3">
                      <UsersIcon className="w-6 h-6 text-blue-700" />
                      <span className="font-bold text-blue-800 text-xl tracking-tight drop-shadow-sm">
                        {agent.user_name}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="inline-block rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-semibold mr-3 shadow-sm">
                        {trackers.length} file{trackers.length !== 1 ? 's' : ''}
                      </span>
                      {expandedAgents[agent.user_id] ? (
                        <ChevronUp className="w-6 h-6 text-blue-600" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-blue-600" />
                      )}
                    </div>
                  </div>
                  {expandedAgents[agent.user_id] && (
                    <div className="p-8 bg-white rounded-b-2xl">
                      {trackers.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm rounded-xl overflow-hidden shadow border border-slate-200">
                            <thead className="bg-gradient-to-r from-blue-100 to-blue-50 border-b border-slate-200">
                              <tr>
                                <th className="px-5 py-3 text-left font-bold text-blue-800 uppercase tracking-wider">Date/Time</th>
                                <th className="px-5 py-3 text-left font-bold text-blue-800 uppercase tracking-wider">Project Name</th>
                                <th className="px-5 py-3 text-left font-bold text-blue-800 uppercase tracking-wider">Task Name</th>
                                <th className="px-5 py-3 text-center font-bold text-blue-800 uppercase tracking-wider">File</th>
                                <th className="px-5 py-3 text-center font-bold text-blue-800 uppercase tracking-wider">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {trackers.map((tracker, index) => (
                                <tr
                                  key={tracker.tracker_id || index}
                                  className="border-b border-slate-100 hover:bg-blue-50/60 transition-colors group"
                                >
                                  <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                                    {tracker.date_time
                                      ? (() => {
                                          const d = new Date(tracker.date_time);
                                          // Format as UTC, not local time
                                          const pad = (n) => n.toString().padStart(2, '0');
                                          return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
                                        })()
                                      : "-"}
                                  </td>
                                  <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                                    {tracker.project_name || "-"}
                                  </td>
                                  <td className="px-5 py-3 text-slate-700 whitespace-nowrap">
                                    {tracker.task_name || "-"}
                                  </td>
                                  <td className="px-5 py-3 text-center">
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
                                  <td className="px-5 py-3 text-center">
                                    <button
                                      onClick={() => handleQCForm(tracker)}
                                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-blue-300"
                                    >
                                      <FileText className="w-4 h-4" />
                                      QC Form
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 text-base py-8">No tracker data for this agent.</div>
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
  );
}

export default QAAgentList;
