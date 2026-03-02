import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  Briefcase,
  Users,
  FileWarning,
  DollarSign
} from 'lucide-react';


const AgentTabsNavigation = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'billable_report', label: 'Billable Report', icon: Briefcase },
    { id: 'adherence', label: 'Reporting Adherence', icon: FileWarning, disabled: true },
    { id: 'incentives', label: 'Agent Incentives', icon: DollarSign, disabled: true }
  ];

  return (
    <div className="relative w-full bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-4">
      <div
        className="flex overflow-x-auto scroll-smooth scrollbar-hide snap-x snap-mandatory w-full gap-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={
                `flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 whitespace-nowrap snap-start ` +
                (isActive
                  ? 'bg-blue-600 text-white shadow-md transform scale-105'
                  : tab.disabled
                  ? 'bg-slate-50 text-slate-400 cursor-not-allowed opacity-60'
                  : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-blue-600 border border-slate-200 hover:border-blue-300')
              }
              title={tab.label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AgentTabsNavigation;
