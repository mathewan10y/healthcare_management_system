import { useTheme } from '../contexts/ThemeContext';
import { FiSun, FiMoon } from 'react-icons/fi';

export default function ThemeToggle({ className = '' }) {
  const { toggleTheme, isDark } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`
        relative p-2 rounded-xl transition-all duration-200 ease-in-out
        bg-bg-card border border-border-subtle
        text-text-secondary hover:text-text-primary hover:bg-bg-sidebar-hover
        shadow-sm hover:shadow
        focus:outline-none focus:ring-2 focus:ring-primary/40
        ${className}
      `}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Sun Icon */}
        <FiSun 
          className={`
            absolute inset-0 w-5 h-5 text-amber-500 transition-all duration-300
            ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
          `}
        />
        
        {/* Moon Icon */}
        <FiMoon 
          className={`
            absolute inset-0 w-5 h-5 text-blue-400 transition-all duration-300
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
          `}
        />
      </div>
    </button>
  );
}
