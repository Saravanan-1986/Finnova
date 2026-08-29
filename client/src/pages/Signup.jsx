import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, GraduationCap, Briefcase } from 'lucide-react';
import FinnovaLogo from '../components/FinnovaLogo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { SECTORS } from '../constants/categories.js';

const Signup = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    occupationType: 'student',
    college: '',
    monthlyAllowance: '',
    sector: '',
    monthlyIncome: '',
    region: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!form.name || !form.email || !form.password || !form.age || !form.region) {
      setError('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.occupationType === 'student' && !form.college) {
      setError('Please provide your college name');
      return;
    }
    if (form.occupationType === 'professional' && !form.sector) {
      setError('Please select your sector');
      return;
    }

    setLoading(true);
    try {
      await signup(form);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base bg-gradient-radial-glow flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <FinnovaLogo size={52} className="logo-glow shrink-0" />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-accent bg-clip-text text-transparent">
              FINNOVA
            </h1>
            <p className="text-xs text-gray-500 tracking-widest uppercase">Finance Planner</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold text-white mb-1">Create your account</h2>
          <p className="text-sm text-gray-400 mb-6">Start planning your finances today</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="label-text">Full Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="input-field"
              />
            </div>

            {/* Email */}
            <div>
              <label className="label-text">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>

            {/* Password + Confirm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-text">Password</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Min 6 characters"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="input-field"
                />
              </div>
            </div>

            {/* Age + Gender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label-text">Age</label>
                <input
                  type="number"
                  name="age"
                  value={form.age}
                  onChange={handleChange}
                  placeholder="e.g. 22"
                  min="10"
                  max="100"
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text">Gender (optional)</label>
                <select name="gender" value={form.gender} onChange={handleChange} className="input-field">
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Occupation Type Toggle */}
            <div>
              <label className="label-text">Occupation Type</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, occupationType: 'student' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    form.occupationType === 'student'
                      ? 'bg-gradient-accent text-white shadow-glow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <GraduationCap size={16} />
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, occupationType: 'professional' })}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    form.occupationType === 'professional'
                      ? 'bg-gradient-accent text-white shadow-glow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Briefcase size={16} />
                  Professional
                </button>
              </div>
            </div>

            {/* Conditional fields */}
            {form.occupationType === 'student' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">College Name</label>
                  <input
                    type="text"
                    name="college"
                    value={form.college}
                    onChange={handleChange}
                    placeholder="e.g. IIT Delhi"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label-text">Monthly Allowance (₹)</label>
                  <input
                    type="number"
                    name="monthlyAllowance"
                    value={form.monthlyAllowance}
                    onChange={handleChange}
                    placeholder="e.g. 15000"
                    min="0"
                    className="input-field"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label-text">Sector / Industry</label>
                  <select name="sector" value={form.sector} onChange={handleChange} className="input-field">
                    <option value="">Select sector</option>
                    {SECTORS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label-text">Monthly Income (₹)</label>
                  <input
                    type="number"
                    name="monthlyIncome"
                    value={form.monthlyIncome}
                    onChange={handleChange}
                    placeholder="e.g. 60000"
                    min="0"
                    className="input-field"
                  />
                </div>
              </div>
            )}

            {/* Region */}
            <div>
              <label className="label-text">Region / City</label>
              <input
                type="text"
                name="region"
                value={form.region}
                onChange={handleChange}
                placeholder="e.g. Mumbai"
                className="input-field"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-start hover:text-accent-end font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;