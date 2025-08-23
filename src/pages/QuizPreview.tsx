import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Quiz } from '../types/database';
import type { QuestionRecord } from '../lib/grading';
import TakeQuestion from '../components/questions/TakeQuestion';

export default function QuizPreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const loadQuiz = async () => {
      if (!id) return;
      
      // Load quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('id', id)
        .single();

      if (quizError || !quizData) {
        console.error('Error loading quiz:', quizError);
        return;
      }

      setQuiz(quizData);

      // Load questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', id)
        .order('order_index', { ascending: true });

      if (questionsError) {
        console.error('Error loading questions:', questionsError);
        return;
      }

      setQuestions((questionsData || []).map(normalizeType) as QuestionRecord[]);
    };

    loadQuiz();
  }, [id]);

  const handleAnswer = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const goToNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (!quiz) {
    return <div className="flex justify-center items-center h-screen">Loading quiz preview...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{quiz.title}</h1>
        <span className="text-gray-600">
          Question {currentIndex + 1} of {totalQuestions}
        </span>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {currentQuestion && (
          <div className="space-y-4">
            <div className="text-lg font-medium">{currentQuestion.stem}</div>
            <div className="border-t pt-4">
              <TakeQuestion
                question={currentQuestion}
                value={answers[currentQuestion.id]}
                onChange={(value) => handleAnswer(currentQuestion.id, value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className="px-4 py-2 border rounded-md disabled:opacity-50"
        >
          Previous
        </button>
        
        {isLastQuestion ? (
          <button
            onClick={() => navigate(`/quizzes/${id}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Back to Editor
          </button>
        ) : (
          <button
            onClick={goToNext}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}

function normalizeType(row: any): QuestionRecord {
  const map: Record<string, QuestionRecord['type']> = {
    multiple_choice_single: 'mc_single',
    multiple_choice_multiple: 'mc_multi',
    open_question: 'open',
  } as const;
  
  const type = (map[row.type] ?? row.type) as QuestionRecord['type'];
  return { 
    id: row.id, 
    type, 
    stem: row.stem, 
    meta: row.meta ?? {}, 
    points: row.points 
  };
}
