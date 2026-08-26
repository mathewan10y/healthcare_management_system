import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiBell, FiX, FiCheck, FiTrash2, FiClock } from 'react-icons/fi';
import { useNotifications } from '../contexts/NotificationContext';
import { cn } from '../utils/cn';

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { 
    notifications, 
    unreadCount, 
    loading, 
    markAllAsRead, 
    markAsRead, 
    deleteNotification 
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all as read when dropdown opens (with delay)
  useEffect(() => {
    if (isOpen && unreadCount > 0) {
      const timer = setTimeout(() => {
        markAllAsRead();
      }, 2000); // Give user 2 seconds to see unread notifications

      return () => clearTimeout(timer);
    }
  }, [isOpen, unreadCount, markAllAsRead]);

  const handleNotificationClick = (notification) => {
    // Mark as read when clicked
    if (!notification.read) {
      markAsRead(notification._id);
    }
    setIsOpen(false);
  };

  const handleDeleteNotification = (e, notificationId) => {
    e.preventDefault();
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now - notificationDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return notificationDate.toLocaleDateString();
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'appointment':
        return <FiClock className="w-4 h-4 text-blue-500" />;
      case 'prescription':
        return <FiCheck className="w-4 h-4 text-green-500" />;
      case 'kyc':
        return <FiCheck className="w-4 h-4 text-yellow-500" />;
      default:
        return <FiBell className="w-4 h-4 text-gray-400 dark:text-gray-300" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover border border-border-subtle transition-colors duration-150"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <FiBell className="w-5 h-5" />
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4.5 min-w-[18px] px-1 flex items-center justify-center font-bold shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-bg-card text-text-primary rounded-2xl shadow-xl border border-border-subtle z-[9999] max-h-96 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between bg-bg-muted">
            <h3 className="text-sm font-semibold text-text-primary">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors p-1 rounded-lg hover:bg-bg-sidebar-hover"
              aria-label="Close notifications"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle">
            {loading ? (
              <div className="px-4 py-8 text-center text-text-muted">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-text-muted">
                <FiBell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <Link
                    key={notification._id}
                    to={notification.link || '#'}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'block px-4 py-3 hover:bg-bg-sidebar-hover transition-colors duration-150',
                      !notification.read && 'bg-blue-50/70 dark:bg-blue-950/30 border-l-4 border-l-primary'
                    )}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm text-text-primary',
                          !notification.read ? 'font-semibold' : 'font-normal'
                        )}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex-shrink-0 flex items-center space-x-1">
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                        <button
                          onClick={(e) => handleDeleteNotification(e, notification._id)}
                          className="text-text-muted hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                          aria-label="Delete notification"
                        >
                          <FiTrash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 border-t border-border-subtle bg-bg-muted">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{notifications.length} notification{notifications.length !== 1 ? 's' : ''}</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-primary hover:text-primary-hover font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
