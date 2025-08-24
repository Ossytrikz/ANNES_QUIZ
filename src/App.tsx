import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import Home from './pages/Home';
import Account from './pages/Account';
import Auth from './pages/Auth';
import ProfilePage from './pages/Profile';
import QuizSetupPage from './pages/QuizSetup';
import QuizCreatePage from './pages/QuizCreate';
import QuizEditorPage from './pages/QuizEditor';
import QuizTakePage from './pages/QuizTake';
import TakeRedirect from './pages/TakeRedirect';
import QuizConsole from './pages/QuizConsole';
import CombinedTakePage from './pages/CombinedTake';
import QuizPreviewPage from './pages/QuizPreview';
import QuizResultsPage from './pages/QuizResults';
import ExplorePage from './pages/Explore';
import SettingsPage from './pages/Settings';
import { ThemeProvider } from './components/theme/ThemeContext';
import { AuthCallback } from './pages/AuthCallback';
import ConnectionTest from './components/ConnectionTest';
import TopBar from './components/nav/TopBar';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Error boundary fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="flex items-center justify-center min-h-screen p-4">
    <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">
        Something went wrong
      </h2>
      <pre className="text-sm text-gray-700 dark:text-gray-300 mb-6 overflow-auto">
        {error.message}
      </pre>
      <div className="flex justify-end">
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  </div>
);

const AppContent = () => {
  // Remove theme handling from here as it's now handled by ThemeProvider
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Header />
        <TopBar />
      <main className="flex-1">
          <ErrorBoundary 
            fallback={({ error, resetErrorBoundary }: { error: Error | null; resetErrorBoundary: () => void }) => (
              <ErrorFallback error={error || new Error('An unknown error occurred')} resetErrorBoundary={resetErrorBoundary} />
            )}
          >
            <Routes>
          <Route path="/account" element={<Account />} />
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              <Route path="/signup" element={<Auth initialMode="signup" />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/test-connection" element={<ConnectionTest />} />
              <Route path="*" element={<div>404 - Not Found</div>} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/dashboard" element={<ExplorePage />} />
              <Route path="/quizzes" element={<ExplorePage />} />
              <Route path="/quizzes/setup" element={<QuizSetupPage />} />
              <Route path="/quizzes/new" element={<QuizCreatePage />} />
              <Route path="/quizzes/:id/edit" element={<QuizEditorPage />} />
              <Route path="/quizzes/:id/preview" element={<QuizPreviewPage />} />
              <Route path="/quizzes/:id/take" element={<TakeRedirect/>} />
              <Route path="/quizzes/:id/results/:attemptId" element={<QuizResultsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            
        <Route path="/console" element={<QuizConsole/>} />
        <Route path="/quizzes/combined/take" element={<CombinedTakePage/>} />
      </Routes>
          </ErrorBoundary>
        </main>
        <Footer />
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            className: 'text-sm',
          }}
        />
      </div>
    </Router>
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary 
          fallback={({ error, resetErrorBoundary }) => (
            <ErrorFallback 
              error={error || new Error('An unknown error occurred')} 
              resetErrorBoundary={resetErrorBoundary} 
            />
          )}
        >
          <AppContent />
        </ErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;