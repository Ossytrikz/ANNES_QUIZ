import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';

type QuizType = 'general' | 'assessment' | 'survey' | 'flashcards' | 'custom';

export default function QuizSetupPage() {
  const navigate = useNavigate();
  const [quizType, setQuizType] = useState<QuizType>('general');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Removed unused loading state

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    // Navigate to quiz creation with the setup data
    navigate('/quizzes/new', { 
      state: { 
        quizType,
        title: title.trim(),
        description: description.trim()
      }
    });
  };

  const quizTypes = [
    { value: 'general', label: 'General Quiz', description: 'Standard quiz with various question types' },
    { value: 'assessment', label: 'Assessment', description: 'Formal assessment with scoring' },
    { value: 'survey', label: 'Survey', description: 'Collect feedback or opinions' },
    { value: 'flashcards', label: 'Flashcards', description: 'Create study flashcards' },
    { value: 'custom', label: 'Custom', description: 'Start from scratch' },
  ];

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Create New Quiz</h1>
          <p className="text-muted-foreground">Set up your quiz with a few details to get started</p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Quiz Setup</CardTitle>
            <CardDescription>Configure the basic settings for your new quiz</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="quiz-type">Quiz Type</Label>
                <select
                  id="quiz-type"
                  value={quizType}
                  onChange={(e) => setQuizType(e.target.value as QuizType)}
                  className="w-full p-2 border rounded-md"
                >
                  {quizTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Enter quiz title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your quiz"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button 
                  type="button" 
                  onClick={() => navigate(-1)}
                  className="px-4 py-2 border rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={!title.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Continue to Quiz Editor
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
