export type QuestionType = 'multiple_choice_single' | 'multiple_choice_multiple' | 'true_false' | 'short_answer' | 'ordering' | 'matching';

export interface ListItem {
  id: string;
  text: string;
}

export interface QuestionMeta {
  options?: ListItem[];
  correctAnswers?: string[];
  shuffleOptions?: boolean;
  acceptedAnswers?: string[];
  caseSensitive?: boolean;
  items?: ListItem[];
  left?: ListItem[];
  right?: ListItem[];
  correctMap?: { [key: string]: string };
}

export interface BuilderQuestion {
  id: string;
  quiz_id: string;
  type: QuestionType;
  stem: string;
  meta: QuestionMeta;
  explanation: string | null;
  points: number | null;
  order_index: number;
}

export interface ListEditorProps {
  items?: ListItem[];
  onChange: (items: ListItem[]) => void;
  placeholder?: string;
}

export interface MCEditorProps {
  q: BuilderQuestion;
  setQ: (q: BuilderQuestion) => void;
  multi: boolean;
}

// Generate a random ID for new elements
export const nextId = (): string => Math.random().toString(36).substr(2, 9);

// Get default metadata for question types
export function getDefaultMeta(type: QuestionType): QuestionMeta {
  switch (type) {
    case 'multiple_choice_single':
      return {
        options: [
          { id: nextId(), text: 'Option 1' },
          { id: nextId(), text: 'Option 2' },
          { id: nextId(), text: 'Option 3' },
        ],
        correctAnswers: [],
        shuffleOptions: true,
      };
    case 'multiple_choice_multiple':
      return {
        options: [
          { id: nextId(), text: 'Option 1' },
          { id: nextId(), text: 'Option 2' },
          { id: nextId(), text: 'Option 3' },
        ],
        correctAnswers: [],
        shuffleOptions: true,
      };
    case 'true_false':
      return { correctAnswers: ['true'] };
    case 'short_answer':
      return {
        acceptedAnswers: [],
        caseSensitive: false,
      };
    case 'ordering':
      return {
        items: [
          { id: nextId(), text: 'First item' },
          { id: nextId(), text: 'Second item' },
          { id: nextId(), text: 'Third item' },
        ]
      };
    case 'matching':
      const left1 = nextId();
      const right1 = nextId();
      const left2 = nextId();
      const right2 = nextId();
      return {
        left: [
          { id: left1, text: 'Item 1' },
          { id: left2, text: 'Item 2' },
        ],
        right: [
          { id: right1, text: 'Match 1' },
          { id: right2, text: 'Match 2' },
        ],
        correctMap: {
          [left1]: right1,
          [left2]: right2,
        },
      };
    default:
      return {};
  }
}
