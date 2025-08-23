-- Update the questions table to use the correct type values
ALTER TABLE public.questions 
  DROP CONSTRAINT IF EXISTS questions_type_check;

-- Update the type constraint to use backend types
ALTER TABLE public.questions 
  ADD CONSTRAINT questions_type_check 
  CHECK (type IN (
    'mc_single',           -- Single correct answer
    'mc_multi',            -- Multiple correct answers
    'short_text',          -- Short text answer
    'true_false',          -- True/False question
    'open',                -- Open-ended question (essay)
    'ordering',            -- Put items in order
    'matching'             -- Match items from two columns
  ));

-- Update any existing records to the new type values
UPDATE public.questions SET 
  type = CASE 
    WHEN type IN ('multiple_choice', 'multiple_choice_single') THEN 'mc_single'
    WHEN type = 'multiple_choice_multiple' THEN 'mc_multi'
    WHEN type IN ('short_answer', 'fill_in_blank') THEN 'short_text'
    WHEN type IN ('essay', 'open_question', 'code') THEN 'open'
    ELSE 'mc_single'  -- Default fallback
  END;

-- Drop unused columns that are now handled by the meta field
ALTER TABLE public.questions 
  DROP COLUMN IF EXISTS options,
  DROP COLUMN IF EXISTS correct_answers,
  DROP COLUMN IF EXISTS order_items,
  DROP COLUMN IF EXISTS match_pairs;
