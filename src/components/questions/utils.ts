import { QuestionType, QuestionMeta } from '../../types/question';

export const getDefaultMeta = (type: QuestionType): QuestionMeta => {
  switch (type) {
    case 'multiple_choice_single':
    case 'multiple_choice_multiple':
      return {
        options: [
          { id: crypto.randomUUID(), text: '', correct: false },
          { id: crypto.randomUUID(), text: '', correct: false }
        ]
      };
    case 'short_answer':
      return {
        acceptedAnswers: [''],
        caseSensitive: false
      };
    case 'true_false':
      return { correct: true };
    case 'ordering':
    case 'matching':
      return {
        items: [
          { id: crypto.randomUUID(), text: '' },
          { id: crypto.randomUUID(), text: '' }
        ]
      };
    default:
      return {};
  }
};

export const mapToBackendType = (type: string) => {
  switch (type) {
    case 'multiple_choice_single': return 'mc_single';
    case 'multiple_choice_multiple': return 'mc_multi';
    case 'short_answer': return 'short_text';
    case 'true_false': return 'true_false';
    case 'ordering': return 'ordering';
    case 'matching': return 'matching';
    default: return 'short_text';
  }
};

export const mapToFrontendType = (type: string) => {
  const typeMap: Record<string, QuestionType> = {
    'mc_single': 'multiple_choice_single',
    'mc_multi': 'multiple_choice_multiple',
    'short_text': 'short_answer',
    'true_false': 'true_false',
    'ordering': 'ordering',
    'matching': 'matching'
  };
  return typeMap[type] || 'short_answer';
};
