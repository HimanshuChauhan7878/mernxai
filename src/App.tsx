import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Brain, BookOpen, LogIn, LogOut, UserPlus, User as UserIcon } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import { useModelStore, User } from './lib/store';
import { ModelUpload } from './components/ModelUpload';
import { ModelList } from './components/ModelList';
import BeginnersGuide from './components/BeginnersGuide';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';

function App() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useModelStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    user: state.user,
    logout: state.logout,
  }));

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 dark:from-gray-900 dark:to-black">
      <Toaster position="top-right" toastOptions={{
           className: '!bg-gray-800 !text-gray-100 !border-gray-700 !shadow-lg',
           style: {
             border: '1px solid #404040',
             padding: '16px',
             color: '#FAFAFA', 
             background: '#262626', 
           },
           success: { iconTheme: { primary: '#14B8A6', secondary: '#171717' } },
           error: { iconTheme: { primary: '#f43f5e', secondary: '#171717' } }
        }}/>
      <header className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm shadow-md dark:shadow-lg dark:shadow-black/30 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center space-x-3 group">
              <Brain className="w-8 h-8 text-primary dark:text-primary-400 group-hover:rotate-[15deg] transition-all duration-300" />
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-white transition-colors duration-300">
                BenchForge
              </h1>
            </Link>
            <nav className="flex items-center space-x-2 md:space-x-4">
              <Link
                to="/"
                className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:text-primary dark:focus:text-primary-300 flex items-center space-x-1 px-3 py-2 rounded-md transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Brain size={18} />
                <span className="hidden sm:inline">Benchmark</span>
              </Link>
              <Link
                to="/beginners-guide"
                className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:text-primary dark:focus:text-primary-300 flex items-center space-x-1 px-3 py-2 rounded-md transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <BookOpen size={18} />
                <span className="hidden sm:inline">Guide</span>
              </Link>

              {isAuthenticated ? (
                <div className="flex items-center space-x-3 pl-3 border-l border-gray-200 dark:border-gray-700/50">
                   <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center">
                       <UserIcon size={16} className="mr-1.5 text-gray-500 dark:text-gray-400"/>
                       {user?.email || 'User'}
                   </span>
                   <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-100 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-gray-700 px-3 py-1.5 rounded-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                   >
                    <LogOut size={16} />
                    <span className="hidden sm:inline">Logout</span>
                   </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 pl-3 border-l border-gray-200 dark:border-gray-700/50">
                  <Link
                    to="/login"
                    className="text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary-300 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:text-primary dark:focus:text-primary-300 flex items-center space-x-1 px-3 py-2 rounded-md transition-all duration-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <LogIn size={18} />
                    <span>Login</span>
                  </Link>
                  <Link
                    to="/signup"
                    className="text-sm font-medium text-white bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 dark:from-primary-600 dark:to-primary-700 dark:hover:from-primary-700 dark:hover:to-primary-800 px-4 py-2 rounded-md shadow-md hover:shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-800"
                  >
                    <UserPlus size={16} />
                    <span className="hidden sm:inline">Sign Up</span>
                  </Link>
                </div>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={ 
             <div className="space-y-10">
               <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl dark:shadow-black/40 animate-fade-in-up border border-transparent dark:border-gray-700/50 transition-all duration-300 hover:shadow-primary/10 dark:hover:shadow-primary/20 hover:border-primary/30 dark:hover:border-primary/30">
                 <h2 className="text-xl font-semibold mb-5 text-gray-800 dark:text-gray-100">Upload Model</h2>
                 <ModelUpload />
               </section>
               <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl dark:shadow-black/40 animate-fade-in-up [animation-delay:0.2s] border border-transparent dark:border-gray-700/50 transition-all duration-300 hover:shadow-primary/10 dark:hover:shadow-primary/20 hover:border-primary/30 dark:hover:border-primary/30">
                 <h2 className="text-xl font-semibold mb-5 text-gray-800 dark:text-gray-100">Your Models</h2>
                 <ModelList />
               </section>
             </div>
           } />
          <Route path="/beginners-guide" element={<BeginnersGuide />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;