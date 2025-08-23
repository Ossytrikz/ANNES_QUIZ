import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import supabase from '../lib/supabase';

export default function ConnectionTest() {
  const { user, loading } = useAuth();
  const [connectionStatus, setConnectionStatus] = useState('Testing connection...');
  const [tables, setTables] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test auth connection
        const { error: authError } = await supabase.auth.getSession();
        
        if (authError) throw authError;
        
        // Test database connection by fetching tables (limited to public schema)
        const { data: tablesData, error: tablesError } = await supabase
          .from('pg_tables')
          .select('tablename')
          .eq('schemaname', 'public');
          
        if (tablesError) throw tablesError;
        
        setConnectionStatus('✅ Connected to Supabase');
        setTables(tablesData.map(t => t.tablename));
      } catch (err) {
        console.error('Connection test failed:', err);
        setConnectionStatus('❌ Connection failed');
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Supabase Connection Test</h2>
      
      <div className="mb-4">
        <p className="font-semibold">Connection Status:</p>
        <p className={connectionStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}>
          {connectionStatus}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 rounded text-red-800 dark:text-red-200">
          <p className="font-semibold">Error:</p>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      <div className="mb-4">
        <p className="font-semibold">Authenticated User:</p>
        <pre className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-700 p-2 rounded">
          {loading ? 'Loading...' : (user ? JSON.stringify(user, null, 2) : 'Not logged in')}
        </pre>
      </div>

      {tables.length > 0 && (
        <div>
          <p className="font-semibold">Available Tables:</p>
          <ul className="list-disc pl-5 mt-2">
            {tables.map(table => (
              <li key={table} className="font-mono">{table}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
