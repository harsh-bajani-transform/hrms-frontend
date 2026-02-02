
import React, { useState } from "react";
import { useCurrentUserRole } from "../../hooks/useCurrentUserRole";
import { useAuth } from "../../context/AuthContext";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";

function formatDateTime(dt) {
  if (!dt) return '-';
  const dateObj = new Date(dt);
  if (isNaN(dateObj)) return dt;
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const year = dateObj.getFullYear();
  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
}
export default function UserCard({ user, dailyData = [], defaultCollapsed = false }) {
  const role = useCurrentUserRole();
  const { user: currentUser } = useAuth();
  // Always call hooks at the top level
  const [expanded, setExpanded] = useState(!defaultCollapsed);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  // Filter dailyData according to date range
  const filteredRows = dailyData.filter(row => {
    const date = new Date(row.date_time || row.date);
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return true;
  });

  // AGENT: Only show the table, no card, header, or controls
  if (role === "AGENT") {
    return (
      <div className="mb-6">
        <table className="min-w-full text-sm rounded-xl overflow-hidden shadow">
          <thead className="bg-blue-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-blue-700">Date-Time</th>
              <th className="px-4 py-3 text-center font-semibold text-blue-700">Assign Hours</th>
              <th className="px-4 py-3 text-center font-semibold text-blue-700">Worked Hours</th>
              <th className="px-4 py-3 text-center font-semibold text-blue-700">QC Score</th>
              <th className="px-4 py-3 text-center font-semibold text-blue-700">Daily Required Hours</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => (
              <tr key={row.date_time || row.date || idx} className="hover:bg-blue-50 transition group">
                <td className="px-4 py-3 text-black font-medium whitespace-nowrap">{row.date_time || row.date || '-'}</td>
                <td className="px-4 py-3 text-center text-black">-</td>
                <td className="px-4 py-3 text-center text-black">{row.billable_hours ? Number(row.billable_hours).toFixed(2) : '-'}</td>
                <td className="px-4 py-3 text-center text-black">{'qc_score' in row ? (row.qc_score !== null ? Number(row.qc_score).toFixed(2) : '-') : '-'}</td>
                <td className="px-4 py-3 text-center text-black">{row.tenure_target ? Number(row.tenure_target).toFixed(2) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // All other roles: show card UI as before
  return (
    <div className="relative bg-linear-to-br from-blue-50 via-white to-slate-100 border-l-8 border-blue-500 rounded-2xl shadow-xl hover:shadow-2xl transition-shadow duration-300 mb-6">
      <div
        className="flex items-center gap-4 px-8 py-5 select-none rounded-t-2xl bg-white/80 backdrop-blur border-b border-blue-100"
        style={{ minHeight: 72 }}
      >
        <div className="flex flex-col justify-center">
          <span className="text-2xl font-extrabold tracking-wide text-blue-700 leading-none" style={{fontFamily:'Inter,Segoe UI,sans-serif'}}>{user.user_name}</span>
          <span className="text-xs text-slate-500 font-medium mt-1">Team: {user.team_name || "B"}</span>
        </div>
        <div className="flex-1" />
        {/* Date range filter and export button - now inside header, before expand/collapse */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded" style={{height: 32}}>
            <label className="font-semibold">Date Range:</label>
            <input type="date" className="border rounded px-2 py-1 text-xs" style={{height: 24}} value={start} onChange={e => e.stopPropagation() || setStart(e.target.value)} />
            <span className="mx-2">to</span>
            <input type="date" className="border rounded px-2 py-1 text-xs" style={{height: 24}} value={end} onChange={e => e.stopPropagation() || setEnd(e.target.value)} />
            <button
              className="ml-2 px-2 py-1 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 text-xs font-semibold border border-gray-400 shadow-sm transition"
              onClick={() => { setStart(''); setEnd(''); }}
              type="button"
            >
              Clear
            </button>
          </div>
          <button
            onClick={e => {
              e.stopPropagation();
              try {
                let exportData = dailyData
                  .filter(row => {
                    const date = new Date(row.date_time || row.date);
                    const startDate = start ? new Date(start) : null;
                    const endDate = end ? new Date(end) : null;
                    if (startDate && date < startDate) return false;
                    if (endDate && date > endDate) return false;
                    return true;
                  })
                  .map(row => ({
                    'Date-Time': formatDateTime(row.date_time ?? row.date),
                    'Assign Hours': '-',
                    'Worked Hours': row.billable_hours !== undefined ? Number(row.billable_hours).toFixed(2) : (row.workedHours ?? row.worked_hours ?? '-'),
                    'QC Score': 'qc_score' in row ? (row.qc_score !== null && row.qc_score !== undefined ? Number(row.qc_score).toFixed(2) : '-') : (row.qcScore ?? row.qc_score ?? '-'),
                    'Daily Required Hours': row.tenure_target !== undefined ? Number(row.tenure_target).toFixed(2) : (row.dailyRequiredHours ?? row.daily_required_hours ?? '-')
                  }));
                // Add total row for countable columns
                if (exportData.length > 0) {
                  const totalWorked = exportData.reduce((sum, r) => sum + (parseFloat(r['Worked Hours']) || 0), 0);
                  const totalQC = exportData.reduce((sum, r) => sum + (parseFloat(r['QC Score']) || 0), 0);
                  const totalRequired = exportData.reduce((sum, r) => sum + (parseFloat(r['Daily Required Hours']) || 0), 0);
                  exportData.push({
                    'Date-Time': 'Total',
                    'Assign Hours': '',
                    'Worked Hours': totalWorked.toFixed(2),
                    'QC Score': totalQC.toFixed(2),
                    'Daily Required Hours': totalRequired.toFixed(2)
                  });
                }
                const worksheet = XLSX.utils.json_to_sheet(exportData);
                worksheet['!cols'] = [
                  { wch: 24 }, // Date-Time
                  { wch: 16 }, // Assign Hours
                  { wch: 16 }, // Worked Hours
                  { wch: 12 }, // QC Score
                  { wch: 20 }, // Daily Required Hours
                ];
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, user.user_name || 'User');
                const filename = `Daily_Report_${user.user_name || 'User'}_${start || 'all'}_${end || 'all'}.xlsx`;
                XLSX.writeFile(workbook, filename);
                toast.success('Daily report exported!');
              } catch {
                toast.error('Failed to export daily report');
              }
            }}
            className="px-3 py-1 rounded bg-linear-to-r from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white text-xs font-semibold border border-green-700 shadow-sm transition"
            title="Export filtered data"
            aria-label="Export"
            onMouseDown={e => e.stopPropagation()}
          >
            Export
          </button>
        </div>
        <button
          className="p-2 rounded-full hover:bg-blue-100 transition"
          title={expanded ? "Collapse" : "Expand"}
          aria-label={expanded ? "Collapse" : "Expand"}
          tabIndex={-1}
          onClick={e => { e.stopPropagation(); setExpanded(e => !e); }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-chevron-up w-5 h-5 transition-transform duration-200 ${expanded ? '' : 'rotate-180'}`} aria-hidden="true"><path d="m18 15-6-6-6 6"></path></svg>
        </button>
      </div>
      {expanded && (
        <div className="p-8 bg-white/90 rounded-b-2xl">
          <table className="min-w-full text-sm rounded-xl overflow-hidden shadow">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-blue-700">Date-Time</th>
                <th className="px-4 py-3 text-center font-semibold text-blue-700">Assign Hours</th>
                <th className="px-4 py-3 text-center font-semibold text-blue-700">Worked Hours</th>
                <th className="px-4 py-3 text-center font-semibold text-blue-700">QC Score</th>
                <th className="px-4 py-3 text-center font-semibold text-blue-700">Daily Required Hours</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, idx) => (
                <tr key={row.date_time || row.date || idx} className="hover:bg-blue-50 transition group">
                  <td className="px-4 py-3 text-black font-medium whitespace-nowrap">{row.date_time || row.date || '-'}</td>
                  <td className="px-4 py-3 text-center text-black">
                    {row.assign_hours === '-' || row.assignHours === '-' ? '-' : (row.assign_hours !== undefined && row.assign_hours !== null && !isNaN(Number(row.assign_hours)) ? Number(row.assign_hours).toFixed(2) : (row.assignHours ?? row.assigned_hour ?? "-"))}
                  </td>
                  <td className="px-4 py-3 text-center text-black">
                    {row.worked_hours === '-' || row.workedHours === '-' ? '-' : (row.billable_hours !== undefined && row.billable_hours !== null && !isNaN(Number(row.billable_hours)) ? Number(row.billable_hours).toFixed(2) : (row.worked_hours ?? row.workedHours ?? '-'))}
                  </td>
                  <td className="px-4 py-3 text-center text-black">
                    {row.qc_score === '-' || row.qcScore === '-' ? '-' : ('qc_score' in row ? (row.qc_score !== null && row.qc_score !== undefined && !isNaN(Number(row.qc_score)) ? Number(row.qc_score).toFixed(2) : '-') : (row.qcScore ?? '-'))}
                  </td>
                  <td className="px-4 py-3 text-center text-black">
                    {row.daily_required_hours === '-' || row.dailyRequiredHours === '-' ? '-' : (row.tenure_target !== undefined && row.tenure_target !== null && !isNaN(Number(row.tenure_target)) ? Number(row.tenure_target).toFixed(2) : (row.daily_required_hours ?? row.dailyRequiredHours ?? '-'))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
