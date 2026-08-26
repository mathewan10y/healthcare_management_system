import { useState, useEffect } from 'react';
import { Outlet, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import ProfileButton from '../ProfileButton';
import NotificationBell from '../NotificationBell';
import ThemeToggle from '../ThemeToggle';
import { FiMenu, FiChevronRight } from 'react-icons/fi';

// Helper to derive page title from pathname
function getPageTitle(pathname, role) {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'Home';
  if (parts.length === 1 && (parts[0] === role || ['patient', 'doctor', 'admin', 'pharmacist'].includes(parts[0]))) {
    return 'Dashboard';
  }
  const lastPart = parts[parts.length - 1];
  return lastPart
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function MainLayout({ role: roleProp }) {
  const { user } = useAuth();
  const location = useLocation();
  const role = roleProp || user?.role || 'patient';

  // Sidebar collapse state initialized from localStorage
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  // Mobile menu drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const pageTitle = getPageTitle(location.pathname, role);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-page dark:bg-bg-page-dark text-text-primary dark:text-text-primary-dark transition-colors duration-200">
      {/* Edge-to-Edge Anchored Sidebar */}
      <Sidebar
        role={role}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Dashboard Content Column */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 md:px-8 border-b border-border-subtle bg-bg-card/70 dark:bg-bg-card/70 backdrop-blur-md flex items-center justify-between sticky top-0 z-20 flex-shrink-0 transition-colors duration-200">
          {/* Left: Mobile hamburger & Breadcrumb Context */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              type="button"
              className="md:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover transition-colors"
              aria-label="Open mobile menu"
            >
              <FiMenu className="w-5 h-5" />
            </button>

            {/* Breadcrumb navigation */}
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link 
                to={`/${role}`} 
                className="text-text-muted hover:text-text-primary transition-colors capitalize hidden sm:inline"
              >
                {role}
              </Link>
              <FiChevronRight className="w-3.5 h-3.5 text-text-muted hidden sm:inline" />
              <h1 className="text-base font-semibold text-text-primary truncate">
                {pageTitle}
              </h1>
            </div>
          </div>

          {/* Right: Header Actions (ThemeToggle, NotificationBell, ProfileButton) */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationBell />
            <div className="h-6 w-[1px] bg-border-subtle mx-1 hidden sm:block" />
            <ProfileButton />
          </div>
        </header>

        {/* Scrollable Viewport for Child Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full pb-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
