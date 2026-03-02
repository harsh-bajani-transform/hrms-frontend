import React, { useState, useEffect } from "react";
// Role ID to role string mapping
const ROLE_MAP = {
  1: "SUPER_ADMIN",
  2: "ADMIN",
  3: "PROJECT_MANAGER",
  4: "ASSISTANT_MANAGER",
  5: "QA_AGENT",
  6: "AGENT"
};
import { ViewState } from "../../utils/constants";
import {
  LayoutDashboard,
  PenTool,
  Database,
  LogOut,
  Settings,
  Award,
  CalendarClock,
  BookOpen,
  Menu,
  X,
  FileText,
  Users,
  Briefcase
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

import logo from "../../assets/Transform logo.png";

const Header = ({
  currentUser,
  handleLogout,
  canAccessEntry,
  canAccessManage,
  canAccessQuality,
  isAgent
}) => {
  // Debug: Log currentUser to check available properties
  useEffect(() => {
    // eslint-disable-next-line
    Briefcase
    console.log('Header currentUser:', currentUser);
  }, [currentUser]);
  // Helper to get initials from user's name
  const getInitials = () => {
    const name = currentUser?.name || currentUser?.user_name || currentUser?.username || "";
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) {
      return parts[0][0]?.toUpperCase() || "";
    }
    return `${parts[0][0]?.toUpperCase() || ""}${parts[parts.length - 1][0]?.toUpperCase() || ""}`;
  };
  // Debug: Log currentUser to check available properties
  // console.log('Header currentUser:', currentUser);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Get role label from role_id or role string
  const getRoleLabel = () => {
    if (currentUser?.role_id) {
      const roleName = ROLE_MAP[Number(currentUser.role_id)] || "";
      return roleName.replace("_", " ").replace("SUPER ADMIN", "Admin");
    }
    // fallback to role string
    return (currentUser?.role || currentUser?.role_name || currentUser?.user_role || "").toString();
  };

  // -----------------------------
  // ROUTE MAP
  // -----------------------------
     const ROUTES = {
       DASHBOARD: "/dashboard",
       ADMIN_PANEL: "/admin",
       ENTRY: "/entry",
       GUIDELINES: "/guidelines",
       SCHEDULER: "/scheduler",
       QUALITY: "/quality"
     };

  // Helper for Navigation with role-based routing
  const goTo = (view) => {
    const roleId = Number(currentUser.role_id);
    const role = (currentUser?.role || currentUser?.role_name || currentUser?.user_role || '').toString().toUpperCase();
    
    console.log('🚀 [Header goTo] view:', view, 'roleId:', roleId, 'role:', role);
    
    // Handle Analytics tab for all roles: always go to /dashboard?tab=overview
    if (view === ViewState.DASHBOARD || view === 'DASHBOARD' || view === 'Analytics') {
      console.log('🚀 [Header goTo] Navigating to Analytics tab /dashboard?tab=overview');
      navigate('/dashboard?tab=overview');
      setIsMobileMenuOpen(false);
      return;
    }
    // Handle QA-specific views
    if (view === 'TRACKER_REPORT') {
      console.log('🚀 [Header goTo] Navigating to Tracker Report');
      // For Assistant Manager and QA Agent, open the tracker_report tab
      navigate('/dashboard?tab=tracker_report');
      setIsMobileMenuOpen(false);
      return;
    }
    if (view === 'AGENT_LIST') {
      console.log('🚀 [Header goTo] Navigating to Agent File Report');
      // For Assistant Manager and QA Agent, open the agent_file_report tab
      navigate('/dashboard?tab=agent_file_report');
      setIsMobileMenuOpen(false);
      return;
    }
    
    // Handle Manage tab for Assistant Managers - route to /dashboard with tab=manage
    if (view === ViewState.ADMIN_PANEL && roleId === 4) {
      console.log('🚀 [Header goTo] Navigating Assistant Manager to /dashboard with tab=manage');
      navigate('/dashboard?tab=manage');
      setIsMobileMenuOpen(false);
      return;
    }
    
    // For agents (role_id 6 or role includes 'AGENT')
    if (roleId === 6 || role.includes('AGENT')) {
      if (view === ViewState.ENTRY || view === 'ENTRY') {
        console.log('🚀 [Header goTo] Navigating agent to /agent');
        navigate("/agent");
      } else if (view === ViewState.DASHBOARD || view === 'DASHBOARD') {
        console.log('🚀 [Header goTo] Navigating agent to /dashboard');
        navigate("/dashboard");
      } else if (view === 'billable_report') {
        // Set the billable_report tab for agent
        navigate('/dashboard?tab=billable_report');
      } else if (view === 'AGENT_PROJECTS') {
        navigate("/agent-projects");
        setIsMobileMenuOpen(false);
        return;
      } else {
        const target = ROUTES[view] || "/agent";
        console.log('🚀 [Header goTo] Navigating agent to:', target);
        navigate(target);
      }
    } else {
      // For admins and other roles
      const target = ROUTES[view] || "/dashboard";
      console.log('🚀 [Header goTo] Navigating non-agent to:', target);
      navigate(target);
    }
    setIsMobileMenuOpen(false);
  };

  // -----------------------------
  // Nav Items (Header Buttons)
  // -----------------------------

  // Role-based tab mapping
  // Debug: Log currentUser to check available properties
  useEffect(() => {
    // eslint-disable-next-line
    console.log('Header currentUser:', currentUser);
  }, [currentUser]);

  const getNavItems = () => {
    const roleId = Number(currentUser?.role_id);
    const role = (currentUser?.role || currentUser?.role_name || currentUser?.user_role || '').toString().toUpperCase();
    // Always show for admin and super admin (by role_id)
    if (roleId === 1 || roleId === 2) {
      return [
        { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
        { view: "TRACKER_REPORT", label: "Tracker Report", icon: FileText },
        { view: "AGENT_LIST", label: "Agent File Report", icon: Users },
        { view: ViewState.ADMIN_PANEL, label: "Manage", icon: Settings },
        { view: ViewState.ENTRY, label: "User Permission", icon: PenTool },
      ];
    }
    // For agents (role_id 6 or role includes 'AGENT')
    if (roleId === 6 || role.includes('AGENT')) {
      return [
        { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
        // Billable Report tab removed for agents in header
        { view: ViewState.ENTRY, label: "Tracker", icon: PenTool },
        { view: "AGENT_PROJECTS", label: "Projects", icon: Database, disabled: true },
        // Roster tab temporarily removed for agents
      ];
    }
    if (!role) {
      // Try role_id mapping if role string is missing
      if (currentUser?.role_id) {
        if (roleId === 5) {
          return [
            { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
            { view: "TRACKER_REPORT", label: "Tracker Report", icon: FileText },
            { view: "AGENT_LIST", label: "Agent File Report", icon: Users },
          ];
        }
        if (roleId === 3) {
          return [
            { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
            { view: "TRACKER_REPORT", label: "Tracker Report", icon: FileText },
            { view: "AGENT_LIST", label: "Agent File Report", icon: Users },
            { view: ViewState.ADMIN_PANEL, label: "Manage", icon: Settings },
            { view: ViewState.ENTRY, label: "User Permission", icon: PenTool },
          ];
        }
        if (roleId === 4) {
          return [
            { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
            { view: "TRACKER_REPORT", label: "Tracker Report", icon: FileText },
            { view: "AGENT_LIST", label: "Agent File Report", icon: Users },
            { view: ViewState.ADMIN_PANEL, label: "Manage", icon: Settings },
            { view: ViewState.ENTRY, label: "User Permission", icon: PenTool },
          ];
        }
        // All other role_ids (not admin/superadmin)
        return [
          { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
          { view: ViewState.ADMIN_PANEL, label: "Manage", icon: Settings },
          { view: ViewState.ENTRY, label: "User Permission", icon: PenTool },
        ];
      }
      return [];
    }
    if (role.includes('QA')) {
      return [
        { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
        { view: "TRACKER_REPORT", label: "Tracker Report", icon: FileText },
        { view: "AGENT_LIST", label: "Agent File Report", icon: Users },
      ];
    }
    if (role.includes('ASSISTANT') || role.includes('ASST')) {
      return [
        { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
        { view: "TRACKER_REPORT", label: "Tracker Report", icon: FileText },
        { view: "AGENT_LIST", label: "Agent File Report", icon: Users },
        { view: ViewState.ADMIN_PANEL, label: "Manage", icon: Settings },
        { view: ViewState.ENTRY, label: "User Permission", icon: PenTool },
      ];
    }
    // Project Manager fallback
    if (role.includes('PROJECT_MANAGER') || role.replace(/\s+/g, '').toLowerCase() === 'projectmanager' || roleId === 3) {
      return [
        { view: ViewState.DASHBOARD, label: "Analytics", icon: LayoutDashboard },
        { view: "TRACKER_REPORT", label: "Tracker Report", icon: FileText },
        { view: "AGENT_LIST", label: "Agent File Report", icon: Users },
        { view: ViewState.ADMIN_PANEL, label: "Manage", icon: Settings },
        { view: ViewState.ENTRY, label: "User Permission", icon: PenTool },
      ];
    }
    // Default: show nothing or fallback
    return [];
  };

  const navItems = getNavItems();
  // DEBUG: Log navItems and currentUser for troubleshooting tab visibility
  console.log('Header navItems:', navItems, 'currentUser:', currentUser);

  // Helper function to check if a tab is active
  const isTabActive = (view) => {
    const currentPath = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get('tab');
    const roleId = Number(currentUser?.role_id);
    const role = (currentUser?.role || currentUser?.role_name || currentUser?.user_role || '').toString().toUpperCase();

    // Check for Analytics/Dashboard
    if (view === ViewState.DASHBOARD || view === 'Analytics') {
      return currentPath === '/dashboard' && (currentTab === 'overview' || !currentTab);
    }

    // Check for Tracker Report
    if (view === 'TRACKER_REPORT') {
      return currentPath === '/dashboard' && currentTab === 'tracker_report';
    }

    // Check for Agent List/Agent File Report
    if (view === 'AGENT_LIST') {
      return currentPath === '/dashboard' && currentTab === 'agent_file_report';
    }

    // Check for Manage/Admin Panel
    if (view === ViewState.ADMIN_PANEL) {
      return (currentPath === '/admin' || (currentPath === '/dashboard' && currentTab === 'manage'));
    }

    // Check for Entry/User Permission/Tracker
    if (view === ViewState.ENTRY) {
      // For agents, check if current path is /agent
      if (roleId === 6 || role.includes('AGENT')) {
        return currentPath === '/agent';
      }
      return currentPath === '/entry';
    }

    // Check for Agent Projects
    if (view === 'AGENT_PROJECTS') {
      return currentPath === '/agent-projects';
    }

    // Check for Billable Report
    if (view === 'billable_report') {
      return currentPath === '/dashboard' && currentTab === 'billable_report';
    }

    return false;
  };

  // -----------------------------
  // NAV BUTTON UI (Desktop)
  // -----------------------------
  const renderNavButton = (item) => {
    const isActive = isTabActive(item.view);
    return (
      <button
        key={item.view}
        onClick={() => !item.disabled && goTo(item.view)}
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
          isActive 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'text-slate-600 bg-slate-50 hover:bg-slate-200'
        } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={item.disabled}
        title={item.disabled ? 'Projects tab is temporarily disabled' : item.label}
      >
        <item.icon className="w-4 h-4" />
        <span className="hidden md:inline">{item.label}</span>
      </button>
    );
  };

  // -----------------------------
  // NAV BUTTON UI (Mobile)
  // -----------------------------
  const renderMobileNavButton = (item) => {
    const isActive = isTabActive(item.view);
    return (
      <button
        key={item.view}
        onClick={() => goTo(item.view)}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors w-full ${
          isActive 
            ? 'bg-blue-600 text-white hover:bg-blue-700' 
            : 'text-slate-700 bg-slate-50 hover:bg-slate-200'
        }`}
      >
        <item.icon className="w-5 h-5" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 left-0 right-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* LEFT: LOGO */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <img 
                src={logo} 
                alt="TFS Ops Tracker Logo" 
                className="h-10 w-auto cursor-pointer hover:opacity-80 transition-opacity" 
                onClick={() => goTo('Analytics')}
                title="Go to Analytics"
              />
            </div>

            {/* RIGHT: NAVIGATION + USER INFO + LOGOUT */}
            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center space-x-3">
                {navItems.map(renderNavButton)}
              </div>
              
              <div className="flex items-center gap-2 border-l border-slate-200 pl-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-lg font-bold text-white">
                    {getInitials()}
                  </div>
                  <button
                    onClick={() => {
                      if (typeof handleLogout === 'function') {
                        handleLogout();
                      } else if (window && window.sessionStorage) {
                        window.sessionStorage.clear();
                        window.location.href = '/';
                      }
                    }}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* MOBILE DRAWER */}
      <div className={`
        fixed top-0 right-0 h-full bg-white shadow-xl z-50
        transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        w-80 max-w-[85vw] md:hidden border-l border-slate-200
      `}>
        <div className="p-6 flex flex-col h-full">

          {/* USER INFO */}
          <div className="pb-6 mb-6 border-b border-slate-200">
            <h3 className="font-bold text-xl">{currentUser.name}</h3>
            <p className="text-sm text-slate-500">
              {currentUser.designation || currentUser.role}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {getRoleLabel() ? `${getRoleLabel()} View` : ""}
            </p>
          </div>

          {/* NAV ITEMS */}
          <div className="flex-1 space-y-2">
            {navItems.map(renderMobileNavButton)}
          </div>

          {/* LOGOUT */}
          <button
            onClick={() => {
              handleLogout();
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 w-full transition-colors mt-6 border-t border-slate-200 pt-6"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>

        </div>
      </div>
    </>
  );
};


export default Header;
