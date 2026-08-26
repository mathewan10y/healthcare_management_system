import React from 'react';
import { NavLink as RouterNavLink, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { 
  FiHome, 
  FiActivity, 
  FiCalendar, 
  FiFileText, 
  FiClock, 
  FiCreditCard, 
  FiPlusCircle,
  FiUsers, 
  FiCheckCircle, 
  FiShield, 
  FiSettings, 
  FiFolder, 
  FiPackage, 
  FiChevronLeft, 
  FiChevronRight,
  FiLogOut,
  FiUser,
  FiInfo,
  FiMail,
  FiX,
  FiAlertTriangle
} from 'react-icons/fi';
import { Avatar } from '../ui';

// Navigation configuration per role
const roleNavItems = {
  patient: [
    { to: '/patient', label: 'Dashboard', icon: FiHome, end: true },
    { to: '/patient/symptom-checker', label: 'Symptom Checker', icon: FiActivity },
    { to: '/patient/appointments', label: 'Appointments', icon: FiCalendar },
    { to: '/patient/book-appointment', label: 'Book Appointment', icon: FiPlusCircle },
    { to: '/patient/prescriptions', label: 'Prescriptions', icon: FiFileText },
    { to: '/patient/medical-history', label: 'Medical History', icon: FiFolder },
    { to: '/patient/bills', label: 'Bills & Payments', icon: FiCreditCard },
  ],
  doctor: [
    { to: '/doctor', label: 'Dashboard', icon: FiHome, end: true },
    { to: '/doctor/appointments', label: 'Appointments', icon: FiCalendar },
    { to: '/doctor/availability', label: 'Availability', icon: FiClock },
    { to: '/doctor/patient-file', label: 'Patient Files', icon: FiUsers },
    { to: '/doctor/settings', label: 'Settings', icon: FiSettings },
    { to: '/doctor/kyc', label: 'KYC Verification', icon: FiShield },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: FiHome, end: true },
    { to: '/admin/disputes', label: 'Disputes Ledger', icon: FiAlertTriangle },
    { to: '/admin/specializations', label: 'Specializations', icon: FiFolder },
    { to: '/admin/kyc-requests', label: 'KYC Requests', icon: FiCheckCircle, badgeKey: 'unreadKycCount' },
    { to: '/admin/doctors', label: 'Manage Doctors', icon: FiUsers },
    { to: '/admin/hospitals', label: 'Manage Hospitals', icon: FiActivity },
    { to: '/admin/inventory', label: 'Manage Inventory', icon: FiPackage },
  ],
  pharmacist: [
    { to: '/pharmacist', label: 'Dashboard', icon: FiHome, end: true },
  ],
};

const secondaryNavItems = [
  { to: '/profile', label: 'My Profile', icon: FiUser },
  { to: '/about', label: 'About Us', icon: FiInfo },
  { to: '/contact', label: 'Contact Us', icon: FiMail },
];

export default function Sidebar({
  role,
  isCollapsed,
  setIsCollapsed,
  mobileOpen,
  setMobileOpen,
}) {
  const { user, logout } = useAuth();
  const { unreadKycCount } = useNotifications();
  const location = useLocation();

  const navItems = roleNavItems[role] || roleNavItems.patient;

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', JSON.stringify(next));
      return next;
    });
  };

  const closeMobile = () => {
    if (setMobileOpen) setMobileOpen(false);
  };

  const renderNavLink = (item) => {
    const Icon = item.icon;
    const isKycBadge = item.badgeKey === 'unreadKycCount' && unreadKycCount > 0;
    
    const isActive = item.end 
      ? location.pathname === item.to 
      : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);

    return (
      <RouterNavLink
        key={item.to}
        to={item.to}
        end={item.end}
        onClick={closeMobile}
        className={`
          group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
          ${isCollapsed ? 'justify-center px-2 py-3' : ''}
          ${
            isActive
              ? 'bg-blue-50/80 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover'
          }
        `}
      >
        {/* Subtle active vertical accent bar on left */}
        {isActive && (
          <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-primary rounded-r-md transition-all duration-200" />
        )}

        {/* Icon */}
        <span className={`flex-shrink-0 relative transition-transform duration-150 group-hover:scale-105 ${isActive ? 'text-primary' : ''}`}>
          <Icon className="w-5 h-5" />
          {isKycBadge && (
            <span className="absolute -top-1 -right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-bg-sidebar animate-pulse" />
          )}
        </span>

        {/* Label (Visible when expanded) */}
        {!isCollapsed && (
          <span className="truncate flex-1 text-left tracking-tight">
            {item.label}
          </span>
        )}

        {/* Badge when expanded */}
        {!isCollapsed && isKycBadge && (
          <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
            {unreadKycCount}
          </span>
        )}

        {/* Floating Tooltip (Visible on hover when collapsed) */}
        {isCollapsed && (
          <div className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 shadow-xl border border-white/10 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 whitespace-nowrap">
            {item.label}
            {isKycBadge && ` (${unreadKycCount} new)`}
          </div>
        )}
      </RouterNavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-bg-sidebar text-text-primary border-r border-border-sidebar select-none transition-colors duration-200">
      {/* Sidebar Header */}
      <div className="flex items-center h-16 px-3.5 border-b border-border-subtle justify-between">
        {isCollapsed ? (
          /* Collapsed View: Centered icon that toggles expansion on click */
          <div className="w-full flex items-center justify-center">
            <button
              onClick={toggleCollapse}
              type="button"
              className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white shadow-md hover:scale-105 transition-all duration-200 relative group"
              title="Click to expand sidebar"
              aria-label="Expand sidebar"
            >
              <span className="font-extrabold text-base tracking-wider group-hover:hidden">H</span>
              <FiChevronRight className="w-5 h-5 hidden group-hover:block" />
            </button>
          </div>
        ) : (
          /* Expanded View: Full brand logo + title + collapse toggle */
          <>
            <Link 
              to="/" 
              onClick={closeMobile}
              className="flex items-center gap-3 overflow-hidden group min-w-0"
              title="HealthSync Dashboard"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
                <span className="font-extrabold text-lg tracking-wider">H</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-base tracking-tight text-text-primary">
                  HealthSync
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {role || 'Healthcare'} Portal
                </span>
              </div>
            </Link>

            <button
              onClick={toggleCollapse}
              type="button"
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover border border-border-subtle transition-colors duration-150 flex-shrink-0"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Mobile Close Button */}
        <button
          onClick={closeMobile}
          type="button"
          className="md:hidden flex items-center justify-center p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover"
          aria-label="Close menu"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      {/* Main Navigation Links (Scrollable) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4 space-y-6">
        {/* Role Section */}
        <div>
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Menu
            </div>
          )}
          <nav className="space-y-1">
            {navItems.map(renderNavLink)}
          </nav>
        </div>

        {/* Secondary Section */}
        <div>
          {!isCollapsed && (
            <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Account & Info
            </div>
          )}
          <nav className="space-y-1">
            {secondaryNavItems.map(renderNavLink)}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer: User Profile & Quick Actions */}
      {user && (
        <div className="p-2.5 border-t border-border-subtle bg-bg-sidebar/80 backdrop-blur-sm">
          {isCollapsed ? (
            /* Collapsed Profile Avatar */
            <div className="flex justify-center">
              <Link 
                to="/profile" 
                onClick={closeMobile}
                className="group relative flex items-center justify-center p-1 rounded-xl hover:bg-bg-sidebar-hover transition-colors"
                title="View Profile"
              >
                <Avatar 
                  src={user.photoUrl ? `http://localhost:5000${user.photoUrl}` : null}
                  name={user.name}
                  size="sm"
                />
                <div className="pointer-events-none absolute left-full ml-3 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 shadow-xl border border-white/10 opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50 whitespace-nowrap">
                  {user.name} ({user.role})
                </div>
              </Link>
            </div>
          ) : (
            /* Expanded Profile Card */
            <div className="flex items-center gap-3 p-2 rounded-xl bg-bg-card-hover border border-border-subtle">
              <Link 
                to="/profile" 
                onClick={closeMobile}
                className="flex items-center gap-3 min-w-0 flex-1 group"
                title="View Profile"
              >
                <Avatar 
                  src={user.photoUrl ? `http://localhost:5000${user.photoUrl}` : null}
                  name={user.name}
                  size="md"
                  className="flex-shrink-0"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-text-muted truncate capitalize">
                    {user.role}
                  </span>
                </div>
              </Link>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex-shrink-0"
                title="Log out"
                aria-label="Log out"
              >
                <FiLogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Anchored Sidebar */}
      <aside
        className={`
          hidden md:block h-screen sticky top-0 flex-shrink-0 z-30 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`
          md:hidden fixed inset-y-0 left-0 w-72 max-w-[80vw] z-50 transform transition-transform duration-300 ease-in-out shadow-2xl
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
