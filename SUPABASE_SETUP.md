# Supabase Setup for Quiz Collaboration Feature

This guide will help you set up the collaboration feature in your Supabase project.

## Prerequisites

1. Supabase project created
2. Supabase CLI installed (optional, but recommended)

## Database Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query
4. Copy the contents of `supabase/migrations/20250820060000_setup_collaboration.sql`
5. Run the SQL query
6. Click "Run" to execute the migration

### Option 2: Using Supabase CLI (Advanced)

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Log in to your Supabase account:
   ```bash
   supabase login
   ```

3. Link your local project to your Supabase project:
   ```bash
   supabase link --project-ref your-project-ref
   ```
   (Replace `your-project-ref` with your actual project reference from Supabase dashboard URL)

4. Push the migration to Supabase:
   ```bash
   supabase db push
   ```

## Environment Variables

Make sure your `.env.local` file includes these variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing the Setup

1. Create a new quiz or use an existing one
2. Enable the "Collaboration" toggle in the quiz settings
3. Add a collaborator using their email address
4. The collaborator should receive access to the quiz based on their role

## Troubleshooting

1. **Permission Denied Errors**:
   - Ensure RLS (Row Level Security) is properly configured
   - Verify the authenticated user has the correct permissions

2. **Collaborator Not Found**:
   - The user must have an account with the email address you're trying to add
   - Check for typos in the email address

3. **Schema Cache Issues**:
   - Go to Settings > API in your Supabase dashboard
   - Click "Recreate Schema" to refresh the API schema

## Security Notes

1. Never expose your Supabase service role key in client-side code
2. Review and test all RLS policies before deploying to production
3. Regularly audit collaborator access to your quizzes
