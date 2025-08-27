import { supabase } from './supabaseClient'

export type QuizUpdateFields = {
  archived?: boolean | null
  folder?: string | null
}

export async function archiveQuiz(id: string) {
  const client = supabase()
  const { error } = await client
    .from('quizzes')
    .update({ archived: true })
    .eq('id', id)
  if (error) throw error
}

export async function unarchiveQuiz(id: string) {
  const client = supabase()
  const { error } = await client
    .from('quizzes')
    .update({ archived: false })
    .eq('id', id)
  if (error) throw error
}

export async function moveQuizToFolder(id: string, folder: string | null) {
  const client = supabase()
  const { error } = await client
    .from('quizzes')
    .update({ folder: folder ?? null })
    .eq('id', id)
  if (error) throw error
}

export async function deleteQuiz(id: string) {
  const client = supabase()
  const { error } = await client
    .from('quizzes')
    .delete()
    .eq('id', id)
  if (error) throw error
}
