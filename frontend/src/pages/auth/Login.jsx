import { useState } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { role, setRole } = useOutletContext(); // Get context from ModernAuthLayout
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const onChange = (e) => {
    setError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(form.email, form.password, role);
      // The role from the server response is the source of truth
      navigate(`/${user.role}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };
  
  const btnBase = "w-full px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200";
  const btnActive = "bg-primary text-white shadow-md";
  const btnInactive = "bg-bg-muted text-text-secondary hover:text-text-primary hover:bg-bg-card-hover border border-border-subtle";

  return (
    <div className="flex flex-col">
      {/* Role Switcher */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-bg-muted border border-border-subtle rounded-2xl mb-6">
        <button type="button" onClick={() => setRole('patient')} className={`${btnBase} ${role === 'patient' ? btnActive : btnInactive}`}>
          I'm a Patient
        </button>
        <button type="button" onClick={() => setRole('doctor')} className={`${btnBase} ${role === 'doctor' ? btnActive : btnInactive}`}>
          I'm a Doctor
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 bg-white dark:bg-bg-card-dark p-6 rounded-2xl shadow-card dark:shadow-card-dark border border-slate-200/60 dark:border-dark-border transition-colors duration-300">
        {error && <div className="bg-error/10 border border-error/20 text-error text-sm rounded-lg p-3 text-center">{error}</div>}

        <div className="relative">
          <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={onChange}
            className="w-full bg-bg-page dark:bg-dark-input border border-slate-300/70 dark:border-dark-border rounded-lg py-2 h-12 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-primary-dark transition-colors duration-300"
            placeholder="your@email.com"
            required
          />
        </div>
        <div className="relative">
          <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={form.password}
            onChange={onChange}
            className="w-full bg-bg-page dark:bg-dark-input border border-slate-300/70 dark:border-dark-border rounded-lg py-2 h-12 pl-10 pr-10 focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-primary-dark transition-colors duration-300"
            placeholder="Password"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword(v => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary hover:text-text-primary"
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>
        <button
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold px-4 py-2 rounded-xl h-12 shadow-lg transition-all duration-200 hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500/30 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing In…' : 'Sign In'}
        </button>
        <div className="text-sm text-center text-text-secondary dark:text-text-secondary-dark">
          No account? <Link to="/auth/register" className="font-medium text-primary dark:text-primary-light hover:underline">Register here</Link>
        </div>
      </form>
    </div>
  );
}