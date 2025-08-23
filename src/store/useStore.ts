import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';

// Types
interface Quiz {
  id: string;
  title: string;
  // Add other quiz properties as needed
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
}

interface QuizState {
  currentQuiz: Quiz | null;
  recentQuizzes: Quiz[];
  setCurrentQuiz: (quiz: Quiz | null) => void;
  addRecentQuiz: (quiz: Quiz) => void;
  clearRecentQuizzes: () => void;
}

type Store = {
  auth: AuthState;
  ui: UIState;
  quiz: QuizState;
};

// Create the store with proper typing
const useStore = create<Store>()(
  persist(
    (set) => ({
      // Auth state
      auth: {
        user: null,
        isAuthenticated: false,
        isLoading: true,
        setUser: (user) => set((state) => ({
          auth: {
            ...state.auth,
            user,
            isAuthenticated: !!user,
          },
        })),
        setIsLoading: (isLoading) => set((state) => ({
          auth: {
            ...state.auth,
            isLoading,
          },
        })),
      },
      
      // UI state
      ui: {
        theme: 'light',
        sidebarOpen: false,
        toggleTheme: () => set((state) => ({
          ui: {
            ...state.ui,
            theme: state.ui.theme === 'light' ? 'dark' : 'light',
          },
        })),
        setSidebarOpen: (open) => set((state) => ({
          ui: {
            ...state.ui,
            sidebarOpen: open,
          },
        })),
      },
      
      // Quiz state
      quiz: {
        currentQuiz: null,
        recentQuizzes: [],
        setCurrentQuiz: (quiz) => set((state) => ({
          quiz: {
            ...state.quiz,
            currentQuiz: quiz,
          },
        })),
        
        addRecentQuiz: (quiz: Quiz) => set((state) => {
          // Check if quiz already exists in recent quizzes
          const exists = state.quiz.recentQuizzes.some((q) => q.id === quiz.id);
          if (!exists) {
            // Add new quiz to the beginning of the array
            const updatedQuizzes = [quiz, ...state.quiz.recentQuizzes];
            // Keep only the 5 most recent quizzes
            const recentQuizzes = updatedQuizzes.slice(0, 5);
            return {
              quiz: {
                ...state.quiz,
                recentQuizzes,
              },
            };
          }
          return state;
        }),
        
        clearRecentQuizzes: () => set((state) => ({
          quiz: {
            ...state.quiz,
            recentQuizzes: [],
          },
        })),
      },
    }),
    {
      name: 'quiz-app-storage',
      partialize: (state: Store) => ({
        ui: {
          theme: state.ui.theme,
        },
        quiz: {
          recentQuizzes: state.quiz.recentQuizzes,
        },
      }),
    }
  )
);

export default useStore;
