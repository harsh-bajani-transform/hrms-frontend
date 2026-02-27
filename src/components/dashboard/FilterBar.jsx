// import React from 'react';
// import { Filter, Clock, Activity } from 'lucide-react';

// const FilterBar = ({
//   isAgent,
//   selectedTask,
//   setSelectedTask,
//   comparisonMode,
//   setComparisonMode,
//   dateRange,
//   handleDateRangeChange,
//   allTasks
// }) => {
//   return (
//     <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
//       {/* Title Section */}
//       <div className="flex items-center gap-2 text-slate-700 font-semibold">
//         <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
//         <span className="text-sm sm:text-base">{isAgent ? 'My Analytics' : 'Organization Analytics'}</span>
//       </div>

//       {/* Filters Container */}
//       <div className="flex flex-col xl:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
//         {/* Task Selector */}
//         <div className="relative flex items-center bg-slate-50 rounded-lg border border-slate-200 w-full sm:w-auto">
//           <Clock className="absolute left-3 w-3 h-3 sm:w-4 sm:h-4 text-slate-500 pointer-events-none" />
//           <select
//             value={selectedTask}
//             onChange={(e) => setSelectedTask(e.target.value)}
//             className="bg-slate-50 text-slate-700 text-sm font-medium outline-none cursor-pointer py-2 pl-9 pr-4 rounded-lg w-full sm:w-40 appearance-none"
//             aria-label="Select task"
//           >
//             <option value="All">All Tasks</option>
//             {allTasks.map(task => (
//               <option key={task} value={task}>{task}</option>
//             ))}
//           </select>
//         </div>

//         {/* Comparison Mode Selector */}
//         <div className="relative flex items-center bg-slate-50 rounded-lg border border-slate-200 w-full sm:w-auto">
//           <Activity className="absolute left-3 w-3 h-3 sm:w-4 sm:h-4 text-slate-500 pointer-events-none" />
//           <select
//             value={comparisonMode}
//             onChange={(e) => setComparisonMode(e.target.value)}
//             className="bg-slate-50 text-slate-700 text-sm font-medium outline-none cursor-pointer py-2 pl-9 pr-4 rounded-lg w-full sm:w-40 appearance-none"
//             aria-label="Select comparison mode"
//           >
//             <option value="previous_period">Prev Period</option>
//             <option value="prev_week">Last Week</option>
//             <option value="prev_month">Last Month</option>
//           </select>
//         </div>

//         {/* Date Range Picker */}
//         <div className="flex flex-col sm:flex-row items-stretch gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 w-full sm:w-auto">
//           {/* Start Date */}
//           <div className="flex items-center gap-2 flex-1">
//             <label className="text-xs text-slate-500 uppercase font-bold whitespace-nowrap">
//               From
//             </label>
//             <div className="relative flex-1">
//               <input
//                 type="date"
//                 value={dateRange.start}
//                 onChange={(e) => handleDateRangeChange('start', e.target.value)}
//                 className="bg-white border border-slate-300 text-slate-700 text-sm rounded px-2 py-1.5 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
//                 aria-label="Start date"
//               />
//             </div>
//           </div>

//           {/* Divider */}
//           <div className="hidden sm:flex items-center">
//             <div className="w-px h-6 bg-slate-300"></div>
//           </div>

//           {/* End Date */}
//           <div className="flex items-center gap-2 flex-1">
//             <label className="text-xs text-slate-500 uppercase font-bold whitespace-nowrap">
//               To
//             </label>
//             <div className="relative flex-1">
//               <input
//                 type="date"
//                 value={dateRange.end}
//                 onChange={(e) => handleDateRangeChange('end', e.target.value)}
//                 className="bg-white border border-slate-300 text-slate-700 text-sm rounded px-2 py-1.5 w-full outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
//                 aria-label="End date"
//               />
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default FilterBar;
import React from 'react';
import { Filter, Clock, Activity } from 'lucide-react';
import SearchableSelect from '../common/SearchableSelect';

const FilterBar = ({
  isAgent,
  isQA,
  selectedTask,
  setSelectedTask,
  comparisonMode,
  setComparisonMode,
  dateRange,
  handleDateRangeChange,
  allTasks
}) => {
  return (
    <div
      className="
        bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-slate-100
        flex flex-col gap-4
        lg:flex-row lg:items-center lg:justify-between
      "
    >
      {/* TITLE */}
      <div className="flex items-center gap-2 text-slate-700 font-semibold">
        <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
        <span className="text-sm sm:text-base">
          {isAgent ? "My Analytics" : "Organization Analytics"}
        </span>
      </div>

      {/* FILTER AREA */}
      <div
        className="
          w-full
          grid grid-cols-2 gap-3
          sm:grid-cols-2 sm:gap-4     /* tablet → 2 columns clean */
          md:grid-cols-2              /* keep 2 columns on medium screens */
          lg:flex lg:flex-row lg:gap-4 lg:w-auto   /* laptop → original 1 row */
        "
      >

        {/* TASK - Hidden for agents and QA */}
        {!isAgent && !isQA && (
          <SearchableSelect
            value={selectedTask}
            onChange={setSelectedTask}
            options={[
              { value: 'All', label: 'All Tasks' },
              ...allTasks.map(task => ({ value: task, label: task }))
            ]}
            icon={Clock}
            placeholder="Select Task"
          />
        )}

        {/* PREV PERIOD - Hidden for agents and QA */}
        {!isAgent && !isQA && (
          <SearchableSelect
            value={comparisonMode}
            onChange={setComparisonMode}
            options={[
              { value: 'previous_period', label: 'Prev Period' },
              { value: 'prev_week', label: 'Last Week' },
              { value: 'prev_month', label: 'Last Month' }
            ]}
            icon={Activity}
            placeholder="Select Period"
          />
        )}

        {/* FROM DATE */}
        <div
          className="
            col-span-2 sm:col-span-1
            bg-slate-50 p-3 rounded-lg border border-slate-200
            flex flex-row items-center gap-3
          "
        >
          <label className="text-xs text-slate-500 uppercase font-bold">FROM</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
            className="flex-1 bg-white border border-slate-300 text-slate-700 text-sm rounded px-2 py-1.5 outline-none"
          />
        </div>

        {/* TO DATE + Clear Button */}
        <div
          className="
            col-span-2 sm:col-span-1
            bg-slate-50 p-3 rounded-lg border border-slate-200
            flex flex-row items-center gap-3
          "  
        >
          <label className="text-xs text-slate-500 uppercase font-bold">TO</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            className="flex-1 bg-white border border-slate-300 text-slate-700 text-sm rounded px-2 py-1.5 outline-none"
          />
          {/* Clear Filter Button (shows only if either date is set) */}
          {(dateRange.start || dateRange.end) && (
            <button
              type="button"
              className="ml-2 px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold border border-gray-300 shadow-sm transition"
              onClick={() => {
                handleDateRangeChange('start', '');
                handleDateRangeChange('end', '');
              }}
              title="Clear date filter"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
