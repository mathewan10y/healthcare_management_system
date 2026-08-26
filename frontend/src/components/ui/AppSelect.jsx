import { isValidElement, useState, useRef, useEffect, useMemo } from 'react';
import { FiChevronDown, FiSearch, FiCheck, FiLoader } from 'react-icons/fi';
import { cn } from '../../utils/cn';

/**
 * AppSelect - A modern, accessible dropdown component for healthcare SaaS
 */
const AppSelect = ({
  options = [],
  value = '',
  onChange = () => {},
  placeholder = 'Select an option',
  disabled = false,
  loading = false,
  searchable = false,
  searchPlaceholder = 'Search...',
  className = '',
  label = '',
  error = '',
  required = false,
  icon = null,
  size = 'md', // 'sm', 'md', 'lg'
  variant = 'default', // 'default', 'outline', 'ghost'
  grouped = false,
  groupKey = 'group',
  optionKey = 'value',
  optionLabel = 'label',
  maxHeight = 'max-h-64',
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [internalValue, setInternalValue] = useState(value);
  const [openUp, setOpenUp] = useState(false);
  const [dropdownMax, setDropdownMax] = useState(256); // pixels
  
  const selectRef = useRef(null);
  const searchRef = useRef(null);
  const optionRefs = useRef([]);

  // Update internal value when prop changes
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, searchable]);

  // Auto position: decide opening direction and max height
  useEffect(() => {
    if (!isOpen) return;
    const updatePlacement = () => {
      const el = selectRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewportH = window.innerHeight || document.documentElement.clientHeight;
      const gap = 8; // px between control and dropdown
      const preferred = 320; // desired dropdown height
      const spaceBelow = Math.max(0, viewportH - rect.bottom - gap);
      const spaceAbove = Math.max(0, rect.top - gap);
      const shouldOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow;
      setOpenUp(shouldOpenUp);
      const usable = shouldOpenUp ? spaceAbove : spaceBelow;
      const maxH = Math.max(160, Math.min(preferred, usable));
      setDropdownMax(maxH);
    };
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isOpen]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return options;
    
    return options.filter(option => {
      const label = typeof option === 'string' ? option : option[optionLabel];
      return label.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [options, searchTerm, searchable, optionLabel]);

  // Group options if needed
  const groupedOptions = useMemo(() => {
    if (!grouped) return filteredOptions;
    
    const groups = {};
    filteredOptions.forEach(option => {
      const group = option[groupKey] || 'Other';
      if (!groups[group]) groups[group] = [];
      groups[group].push(option);
    });
    
    return Object.entries(groups).map(([groupName, groupOptions]) => ({
      group: groupName,
      options: groupOptions
    }));
  }, [filteredOptions, grouped, groupKey]);

  // Get display value
  const getDisplayValue = () => {
    if (!internalValue && internalValue !== 0) return placeholder;
    
    const option = options.find(opt => {
      const val = typeof opt === 'string' ? opt : opt[optionKey];
      return val === internalValue;
    });
    
    if (!option) return placeholder;
    return typeof option === 'string' ? option : option[optionLabel];
  };

  // Handle option selection
  const handleSelect = (option) => {
    const val = typeof option === 'string' ? option : option[optionKey];
    setInternalValue(val);
    if (typeof onChange === 'function') {
      const syntheticEvent = {
        target: { value: val, name: props.name || '' },
        currentTarget: { value: val, name: props.name || '' },
      };
      // Allow handlers expecting (val) or (e)
      onChange(val, option, syntheticEvent);
    }
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          const option = grouped ? groupedOptions[focusedIndex]?.options[0] : filteredOptions[focusedIndex];
          if (option) handleSelect(option);
        } else {
          setIsOpen(!isOpen);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        selectRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          const maxIndex = grouped ? groupedOptions.length - 1 : filteredOptions.length - 1;
          setFocusedIndex(prev => Math.min(prev + 1, maxIndex));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => Math.max(prev - 1, 0));
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  };

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [focusedIndex]);

  // Size classes
  const sizeClasses = {
    sm: 'h-10 text-sm px-3',
    md: 'h-12 text-base px-3',
    lg: 'h-14 text-lg px-4'
  };

  // Variant classes
  const variantClasses = {
    default: 'bg-bg-input text-text-primary border border-border-subtle hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
    outline: 'bg-transparent text-text-primary border-2 border-border-subtle hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
    ghost: 'bg-bg-muted text-text-primary border border-transparent hover:bg-bg-card-hover focus:bg-bg-input focus:border-primary focus:ring-2 focus:ring-primary/20'
  };

  return (
    <div className={cn('relative', className)} ref={selectRef}>
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Select Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        className={cn(
          'w-full flex items-center justify-between rounded-xl transition-all duration-150 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          sizeClasses[size],
          variantClasses[variant],
          disabled && 'opacity-50 cursor-not-allowed bg-bg-muted text-text-muted',
          loading && 'opacity-75 cursor-wait',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          isOpen && 'ring-2 ring-primary/20 border-primary'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${label}-label` : undefined}
        {...props}
      >
        <div className="flex items-center flex-1 min-w-0">
          {isValidElement(icon) ? (
            <span className="mr-2 text-text-muted flex-shrink-0 flex items-center">{icon}</span>
          ) : icon ? (
            (() => {
              const IconComp = icon;
              return <IconComp className="w-4 h-4 mr-2 text-text-muted flex-shrink-0" />;
            })()
          ) : null}
          <span className={cn(
            'truncate',
            !internalValue && internalValue !== 0 && 'text-text-muted',
            (internalValue || internalValue === 0) && 'text-text-primary font-medium'
          )}>
            {getDisplayValue()}
          </span>
        </div>
        
        <div className="flex items-center ml-2">
          {loading ? (
            <FiLoader className="w-4 h-4 text-text-muted animate-spin" />
          ) : (
            <FiChevronDown className={cn(
              'w-4 h-4 text-text-muted transition-transform duration-150',
              isOpen && 'transform rotate-180'
            )} />
          )}
        </div>
      </button>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={cn(
            'absolute z-50 w-full bg-bg-card rounded-2xl shadow-xl border border-border-subtle py-1.5 backdrop-blur-md',
            'animate-in fade-in-0 zoom-in-95 duration-100'
          )}
          style={{
            bottom: openUp ? 'calc(100% + 8px)' : undefined,
            top: !openUp ? 'calc(100% + 8px)' : undefined,
            maxHeight: `${dropdownMax}px`,
            overflowY: 'auto'
          }}
          role="listbox"
          aria-multiselectable="false"
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-border-subtle sticky top-0 bg-bg-card">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-bg-input text-text-primary pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border-subtle focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <div className="py-1">
            {grouped ? (
              // Grouped Options
              groupedOptions.map((group, groupIndex) => (
                <div key={groupIndex}>
                  <div className="px-3 py-1 text-xs font-bold text-text-muted uppercase tracking-wider">
                    {group.group}
                  </div>
                  {group.options.map((option, optionIndex) => {
                    const val = typeof option === 'string' ? option : option[optionKey];
                    const label = typeof option === 'string' ? option : option[optionLabel];
                    const isSelected = val === internalValue;
                    const index = groupIndex * 100 + optionIndex;

                    return (
                      <div
                        key={val}
                        ref={el => optionRefs.current[index] = el}
                        onClick={() => handleSelect(option)}
                        onMouseEnter={() => setFocusedIndex(index)}
                        className={cn(
                          'flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors duration-150',
                          isSelected && 'bg-primary/10 text-primary font-bold',
                          !isSelected && focusedIndex === index && 'bg-bg-muted text-text-primary',
                          !isSelected && focusedIndex !== index && 'text-text-primary hover:bg-bg-muted'
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="truncate">{label}</span>
                        {isSelected && <FiCheck className="w-4 h-4 text-primary ml-2 flex-shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              // Regular Options
              filteredOptions.map((option, index) => {
                const val = typeof option === 'string' ? option : option[optionKey];
                const label = typeof option === 'string' ? option : option[optionLabel];
                const isSelected = val === internalValue;

                return (
                  <div
                    key={val || index}
                    ref={el => optionRefs.current[index] = el}
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2 text-sm cursor-pointer transition-colors duration-150',
                      isSelected && 'bg-primary/10 text-primary font-bold',
                      !isSelected && focusedIndex === index && 'bg-bg-muted text-text-primary',
                      !isSelected && focusedIndex !== index && 'text-text-primary hover:bg-bg-muted'
                    )}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span className="truncate">{label}</span>
                    {isSelected && <FiCheck className="w-4 h-4 text-primary ml-2 flex-shrink-0" />}
                  </div>
                );
              })
            )}

            {/* Empty State */}
            {((grouped && groupedOptions.length === 0) || (!grouped && filteredOptions.length === 0)) && (
              <div className="px-3 py-4 text-sm text-text-muted text-center">
                {searchTerm ? 'No options match your search' : 'No options available'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppSelect;
