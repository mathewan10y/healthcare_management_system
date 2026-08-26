import { useState, useEffect } from 'react';

const Avatar = ({ 
  src, 
  name = '', 
  size = 'md', 
  className = '',
  showFallback = true,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [triedBackend, setTriedBackend] = useState(false);
  const [imgSrc, setImgSrc] = useState('');

  useEffect(() => {
    setImageError(false);
    setTriedBackend(false);
    if (!src) {
      setImgSrc('');
      return;
    }
    if (src.startsWith('http')) {
      setImgSrc(src);
      return;
    }
    // Direct relative path works with Vite public/ directory
    setImgSrc(src.startsWith('/') ? src : `/${src}`);
  }, [src]);

  // Size configurations
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
    '2xl': 'w-20 h-20 text-2xl',
    '3xl': 'w-24 h-24 text-3xl'
  };

  // Generate initials from name
  const getInitials = (fullName) => {
    if (!fullName) return '?';
    const cleanName = fullName.replace(/^dr\.?\s+/i, '').trim();
    const names = cleanName.split(' ');
    if (names.length > 1) {
      return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`;
    }
    return cleanName.charAt(0) || '?';
  };

  // Generate consistent color based on name
  const getAvatarColor = (fullName) => {
    if (!fullName) return 'bg-gray-500';
    
    const colors = [
      'bg-red-500',
      'bg-orange-500', 
      'bg-amber-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-purple-500',
      'bg-fuchsia-500',
      'bg-pink-500',
      'bg-rose-500'
    ];
    
    let hash = 0;
    for (let i = 0; i < fullName.length; i++) {
      hash = fullName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  const baseClasses = `
    inline-flex items-center justify-center 
    rounded-full overflow-hidden 
    font-semibold text-white 
    ${sizeClasses[size]} 
    ${className}
  `;

  const handleError = () => {
    if (!triedBackend && src && !src.startsWith('http')) {
      setTriedBackend(true);
      const rawApi = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const baseUrl = rawApi.replace(/\/api\/?$/, '');
      setImgSrc(`${baseUrl}${src.startsWith('/') ? '' : '/'}${src}`);
    } else {
      setImageError(true);
    }
  };

  // Show image if src is provided and no error occurred
  if (imgSrc && !imageError) {
    return (
      <div className={baseClasses} {...props}>
        <img
          src={imgSrc}
          alt={name || 'Avatar'}
          className="w-full h-full object-cover"
          onError={handleError}
        />
      </div>
    );
  }

  // Show initials fallback
  if (showFallback) {
    return (
      <div 
        className={`${baseClasses} ${getAvatarColor(name)}`} 
        {...props}
      >
        <span className="uppercase font-bold">
          {getInitials(name)}
        </span>
      </div>
    );
  }

  // Show default avatar icon
  return (
    <div className={`${baseClasses} bg-gray-400`} {...props}>
      <svg 
        className="w-1/2 h-1/2" 
        fill="currentColor" 
        viewBox="0 0 20 20"
      >
        <path 
          fillRule="evenodd" 
          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" 
          clipRule="evenodd" 
        />
      </svg>
    </div>
  );
};

export default Avatar;
