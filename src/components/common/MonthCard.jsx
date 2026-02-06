import React, { useState, useMemo } from "react";
import { Download, ChevronUp, Search, X } from "lucide-react";
import { useUser } from "../../context/UserContext";

export default function MonthCard({ month, users, onExport, onExportMonth, teamOptions = [], hideTeamColumn = false }) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isAgent } = useUser();

  // Client-side search filter by user name
  const filteredUsers = users.filter((u) => {
    if (!searchQuery) return true;
    const userName = (u.user_name || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return userName.includes(query);
  });

  return (
    <div className="relative bg-gradient-to-br from-blue-50 via-white to-indigo-50 border-l-4 border-blue-500 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 mb-6">
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer select-none rounded-t-xl bg-white/90 backdrop-blur"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Month Badge */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-lg px-4 py-2 shadow-md">
            <div className="text-lg font-bold leading-none">{month.label}</div>
            <div className="text-xs opacity-90 mt-0.5">{month.year}</div>
          </div>
          <div className="text-sm text-slate-600 font-medium">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'User' : 'Users'}
          </div>
        </div>
        
        <div className="flex-1" />
        
        {/* Export Month Button */}
        <button
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
          onClick={e => { e.stopPropagation(); if (onExportMonth) onExportMonth(month, filteredUsers); }}
          title="Export month summary"
        >
          <Download className="w-4 h-4" />
          Export Month
        </button>
        
        {/* Expand/Collapse Button */}
        <button
          className="p-2 rounded-lg hover:bg-blue-100 transition-colors duration-200"
          title={expanded ? "Collapse" : "Expand"}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          <ChevronUp className={`w-5 h-5 text-blue-700 transition-transform duration-300 ${expanded ? '' : 'rotate-180'}`} />
        </button>
      </div>
      {expanded && (
        <div className="bg-white/80 backdrop-blur rounded-b-xl border-t border-blue-100">
          {/* Search Filter */}
          <div className="px-6 py-4 border-b border-blue-100">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by user name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border-2 border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto p-6">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No users found matching "{searchQuery}"
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-blue-200">
                    <th className="px-4 py-3 text-left font-bold text-blue-700">User Name</th>
                    {!hideTeamColumn && <th className="px-4 py-3 text-left font-bold text-blue-700">Team</th>}
                    <th className="px-4 py-3 text-center font-bold text-blue-700">Billable Hours</th>
                    <th className="px-4 py-3 text-center font-bold text-blue-700">Monthly Goal</th>
                    <th className="px-4 py-3 text-center font-bold text-blue-700">Pending</th>
                    <th className="px-4 py-3 text-center font-bold text-blue-700">Avg. QC</th>
                    <th className="px-4 py-3 text-center font-bold text-blue-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-100">
                  {filteredUsers.map((user, idx) => {
                    const formatNumber = (val) => {
                      if (val === null || val === undefined || val === '') return '-';
                      const num = Number(val);
                      return isNaN(num) ? '-' : num.toFixed(2);
                    };
                    
                    return (
                      <tr key={user.user_id || idx} className="hover:bg-blue-50/50 transition-colors duration-150">
                        <td className="px-4 py-3 text-slate-800 font-medium">{user.user_name || '-'}</td>
                        {!hideTeamColumn && <td className="px-4 py-3 text-slate-600">{user.team_name || '-'}</td>}
                        <td className="px-4 py-3 text-center text-slate-800 font-semibold">{formatNumber(user.total_billable_hours)}</td>
                        <td className="px-4 py-3 text-center text-slate-800">{user.monthly_total_target ?? '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-800">{formatNumber(user.pending_target)}</td>
                        <td className="px-4 py-3 text-center text-slate-800">{formatNumber(user.avg_qc_score)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => onExport(user)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all duration-200"
                            title="Export user's daily data"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Export
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
