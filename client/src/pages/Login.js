import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Login = () => {
  const { login, isAuthenticated, loading, user, clearError } = useAuth();
  const location = useLocation();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getRedirectPath = (userRole) => {
    switch (userRole) {
      case 'superadmin':
        return '/super-admin-dashboard';
      case 'admin':
        return '/admin-dashboard';
      case 'agent1':
        return '/agent1-dashboard';
      case 'agent2':
        return '/agent2-dashboard';
      default:
        return '/dashboard';
    }
  };

  useEffect(() => {
    clearError();
  }, [clearError]);

  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (isAuthenticated && user) {
    const redirectPath = getRedirectPath(user.role);
    const from = location.state?.from?.pathname || redirectPath;
    return <Navigate to={from} replace />;
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await login(formData);
      if (!result.success) {
        console.error('Login failed:', result.error);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-700 via-purple-600 to-pink-400 animate-gradient-x px-4 py-8">
      <style>
        {`
          .animate-gradient-x {
            background-size: 200% 200%;
            animation: gradientMove 8s ease-in-out infinite;
          }
          @keyframes gradientMove {
            0%, 100% { background-position: left top; }
            50% { background-position: right bottom; }
          }
        `}
      </style>
      <div className="w-full max-w-md">
        <div className="relative bg-white/80 backdrop-blur-2xl rounded-3xl shadow-2xl px-8 py-10 space-y-8 border border-white/40 transition-all duration-300 hover:shadow-blue-300">
          <div className="flex flex-col items-center mb-4">
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-purple-600 to-pink-500 tracking-wide drop-shadow-lg">
              IMMERGIX
            </h1>
            <span className="text-xs text-gray-500 font-medium">A Reddington Global Consultancy Pvt. Ltd. Company</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg mb-2 animate-bounce">
              <User className="h-9 w-9 text-white" />
            </div>
            <h2 className="mt-2 text-center text-4xl font-extrabold text-gray-900 drop-shadow-lg">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-500 mt-1 font-medium">Sign in to your LMS account</p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full px-4 py-3 pl-12 rounded-xl bg-white/90 border border-gray-300 placeholder-gray-400 text-gray-900 shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  <Mail className="h-5 w-5 text-blue-400 absolute left-4 top-3.5" />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full px-4 py-3 pl-12 pr-12 rounded-xl bg-white/90 border border-gray-300 placeholder-gray-400 text-gray-900 shadow focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <Lock className="h-5 w-5 text-purple-400 absolute left-4 top-3.5" />
                  <button
                    type="button"
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-blue-600 transition"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:scale-105 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </div>
            <div className="text-center mt-4">
              <div className="text-sm text-gray-600 font-semibold">
                Demo Account:
              </div>
              {/* <div className="mt-2 space-y-1 text-xs text-gray-500">
                <div className="font-mono">SuperAdmin: <span className="text-blue-700">vishal@lms.com</span> / <span className="text-purple-700">@dm!n123</span></div>
                <div className="text-red-500 font-semibold">Note: SuperAdmin can create organizations and users</div>
              </div> */}
            </div>
          </form>
          <div className="mt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} IMMERGIX LMS. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
