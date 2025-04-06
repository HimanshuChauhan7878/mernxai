import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
// import { useModelStore } from '../../lib/store'; // We won't call the dummy store signup anymore
import toast from 'react-hot-toast';
import { UserPlus, Mail, Lock, Loader2 } from 'lucide-react';

const API_URL = 'http://localhost:8003'; // Assuming backend runs on 8003

export function SignupPage() {
  const navigate = useNavigate();
  // const signup = useModelStore((state) => state.signup); // Remove store signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('Passwords do not match!');
      return;
    }
    if (password.length < 8) { // Basic password length check
        toast.error('Password must be at least 8 characters long.');
        return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/signup`, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
          // Use the detail message from the backend HTTPException
          throw new Error(data.detail || `Signup failed with status: ${response.status}`);
      }

      // If signup is successful, backend returns { message: ..., email: ... }
      toast.success(`Account created for ${data.email}! Please log in.`);
      navigate('/login'); // Redirect to login page after successful signup

    } catch (error) {
      console.error("Signup error:", error);
      if (error instanceof Error) {
          toast.error(`Signup failed: ${error.message}`);
      } else {
          toast.error('An unexpected error occurred during signup.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-200px)] bg-gradient-to-br from-gray-900 via-gray-950 to-black p-4 animate-fade-in-up">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-2xl dark:shadow-primary/10 p-8 m-4 border border-transparent dark:border-gray-700/50 transition-all duration-500 hover:scale-[1.01]">
        <div className="text-center mb-10">
          <UserPlus className="mx-auto h-12 w-12 text-primary" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-50">Create Your Account</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Join BenchForge</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email Input */}
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100 sm:text-sm transition duration-300 ease-in-out"
              placeholder="Email address"
            />
          </div>

          {/* Password Input */}
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100 sm:text-sm transition duration-300 ease-in-out"
              placeholder="Password (min. 8 characters)"
            />
          </div>

           {/* Confirm Password Input */}
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500 group-focus-within:text-primary transition-colors duration-300" />
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="appearance-none block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-gray-100 sm:text-sm transition duration-300 ease-in-out"
              placeholder="Confirm Password"
            />
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 ease-in-out transform hover:scale-[1.03] disabled:scale-100"
            >
              {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                  'Create Account'
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-primary hover:text-primary-600 dark:text-primary-400 dark:hover:text-primary-300 transition duration-150 ease-in-out">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 