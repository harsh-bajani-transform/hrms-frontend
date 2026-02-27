import React, { useRef } from 'react';
import UserMonthlyReport from './UserMonthlyReport';
import ProjectMonthlyReport from './ProjectMonthlyReport';
import {
  LayoutGrid,
  Briefcase,
  Users,
  FolderKanban,
  DollarSign,
  Gem
} from 'lucide-react';

const TabsNavigation = ({
  activeTab,
  setActiveTab,
  isAgent,
  isQA,
  isAdmin,
  isAssistantManager,
  isProjectManager,
  isSuperAdmin,
  canViewIncentivesTab,
  canViewAdherence
}) => {
  const tabsRef = useRef(null);
    
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid, alwaysVisible: true },
    // Billable Report tab: for agents and for QA, Assistant Manager, Project Manager, Admin, Super Admin
    ...(isAgent
      ? [{ id: 'billable_report', label: 'Billable Report', icon: Briefcase, visible: true }]
      : [{ id: 'bookings', label: 'Billable Report', icon: Briefcase, visible: (isQA || isAssistantManager || isProjectManager || isAdmin || isSuperAdmin) }]),
    // Show all required tabs for project manager
    ...(isProjectManager || isAssistantManager || isAdmin || isSuperAdmin ? [
      { id: 'user_monthly_report', label: 'User Monthly Report', icon: Users, visible: true, disabled: false },
      { id: 'project_monthly_report', label: 'Project Monthly Report', icon: FolderKanban, visible: true, disabled: false },
      { id: 'incentives', label: 'Agent Incentives', icon: DollarSign, visible: true, disabled: false },
      { id: 'mgmt_incentives', label: 'Management Incentives', icon: Gem, visible: true, disabled: false },
    ] : [
      { id: 'incentives', label: 'Agent Incentives', icon: DollarSign, visible: canViewIncentivesTab && !isQA, disabled: true },
      { id: 'mgmt_incentives', label: 'Management Incentives', icon: Gem, visible: !isAgent && !isQA, disabled: true },
    ]),
  ];

  // Ensure 'overview' tab is always visible, regardless of any other logic
  const visibleTabs = tabs.filter(tab => tab.id === 'overview' || tab.alwaysVisible || tab.visible);

  return (
    <div className="relative w-full">
      {/* Horizontal draggable/scrollable + equal spacing on large screens */}
      <div
        ref={tabsRef}
        className="
          flex overflow-x-auto pb-2 px-1 scroll-smooth scrollbar-hide snap-x snap-mandatory
          w-full gap-2
          lg:justify-between     /* Even spacing on desktop/laptop */
        "
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`
                flex-grow lg:flex-grow-0  /* stretch only on wide screens */
                px-4 sm:px-4 py-3 sm:py-3 rounded-lg text-sm font-semibold 
                flex items-center justify-center gap-1.5 sm:gap-2 
                transition-all whitespace-nowrap snap-start
                bg-white shadow border border-slate-200
                ${isActive 
                  ? 'text-blue-600 border-blue-600 shadow-md' 
                  : 'text-slate-600 hover:text-blue-600 hover:border-slate-300'
                }
              `}
              title={tab.label}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">{tab.label}</span>
              <span className="xs:hidden">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render UserMonthlyReport below the tab bar when active */}
      {activeTab === 'user_monthly_report' && (
        <div className="mt-4">
          <UserMonthlyReport />
        </div>
	  )}

      {/* Render ProjectMonthlyReport below the tab bar when active */}
      {activeTab === 'project_monthly_report' && (
        <div className="mt-4">
          <ProjectMonthlyReport />
        </div>
	  )}

      {/* Mobile Dropdown */}
      <div className="sm:hidden mt-2">
        <select
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm font-medium"
        >
          {visibleTabs.map(tab => (
            <option key={tab.id} value={tab.id}>
              {tab.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default TabsNavigation;
