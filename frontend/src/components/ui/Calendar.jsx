import { useState, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

// Helper function to format date consistently
const formatDateToString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Parse a YYYY-MM-DD string as a LOCAL date (midnight local time)
const parseLocalDateString = (ymd) => {
  if (!ymd || typeof ymd !== 'string') return null;
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d); // Local time
};

const Calendar = ({ 
  selectedDate, 
  onDateSelect, 
  availableDates = [], 
  minDate = null, 
  loading = false,
  className = '',
  onMonthChange = null
}) => {
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate ? new Date(selectedDate) : new Date()
  );

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Sunday of the calendar view
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - firstDay.getDay());
    
    // End at the last Saturday of the calendar view
    const endDate = new Date(lastDay);
    endDate.setDate(lastDay.getDate() + (6 - lastDay.getDay()));
    
    const days = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [currentMonth]);

  const navigateMonth = (direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(currentMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
    
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };

  const isDateAvailable = (date) => {
    const dateStr = formatDateToString(date);
    return availableDates.includes(dateStr);
  };

  const isDateDisabled = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Disable past dates
    if (date < today) return true;
    
    // Disable dates before minDate if provided
    if (minDate) {
      const min = typeof minDate === 'string' ? parseLocalDateString(minDate) : new Date(minDate);
      if (min && date < min) return true;
    }
    
    // Disable dates not in current month that aren't available
    const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
    if (!isCurrentMonth) return true;
    
    // If we have available dates, only enable those
    if (availableDates.length > 0) {
      return !isDateAvailable(date);
    }
    
    return false;
  };

  const isDateSelected = (date) => {
    if (!selectedDate) return false;
    const dateStr = formatDateToString(date);
    return dateStr === selectedDate;
  };

  const handleDateClick = (date) => {
    if (isDateDisabled(date)) return;
    
    const dateStr = formatDateToString(date);
    onDateSelect(dateStr);
  };

  return (
    <div className={`bg-bg-card text-text-primary border border-border-subtle rounded-2xl p-5 shadow-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover rounded-xl border border-border-subtle transition-colors"
          disabled={loading}
          aria-label="Previous month"
        >
          <FiChevronLeft className="w-5 h-5" />
        </button>
        
        <h3 className="text-base font-bold text-text-primary">
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </h3>
        
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-card-hover rounded-xl border border-border-subtle transition-colors"
          disabled={loading}
          aria-label="Next month"
        >
          <FiChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-semibold text-text-muted py-1.5 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarData.map((date, index) => {
          const isDisabled = isDateDisabled(date);
          const isSelected = isDateSelected(date);
          const isAvailable = isDateAvailable(date);
          const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
          
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleDateClick(date)}
              disabled={isDisabled || loading}
              className={`
                h-10 w-full text-xs font-medium rounded-xl transition-all duration-200 relative flex items-center justify-center
                ${isSelected 
                  ? 'bg-primary text-white font-bold shadow-md shadow-primary/30' 
                  : isDisabled 
                    ? 'text-text-muted/40 opacity-40 cursor-not-allowed' 
                    : isAvailable && isCurrentMonth
                      ? 'text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-green-500/20 font-bold border border-green-500/30'
                      : isCurrentMonth
                        ? 'text-text-primary hover:bg-bg-card-hover'
                        : 'text-text-muted/40 opacity-40'
                }
                ${loading ? 'opacity-50' : ''}
              `}
            >
              {date.getDate()}
              {isAvailable && isCurrentMonth && !isSelected && (
                <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-green-500 rounded-full"></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-center space-x-4 text-xs text-text-secondary">
        <div className="flex items-center space-x-1.5">
          <div className="w-2.5 h-2.5 bg-green-500/20 border border-green-500/40 rounded-full"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2.5 h-2.5 bg-bg-card-hover border border-border-subtle rounded-full"></div>
          <span>Unavailable</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>
          <span>Selected</span>
        </div>
      </div>

      {loading && (
        <div className="mt-2 text-center text-xs text-text-muted">
          Loading available dates...
        </div>
      )}
    </div>
  );
};

export default Calendar;
