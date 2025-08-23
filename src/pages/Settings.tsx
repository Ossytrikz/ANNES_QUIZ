import React from 'react';
import { useAuth } from '../hooks/useAuth';

export default function SettingsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <div className="space-y-3">
          <div className="text-sm text-gray-700">You must be signed in to view settings.</div>
          <a href="/auth" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">Sign In</a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="border rounded p-4 bg-white dark:bg-gray-800">
        <h2 className="font-medium mb-2">Account</h2>
        <div className="text-sm text-gray-600">Email: {user.email}</div>
      </section>

      <section className="border rounded p-4 bg-white dark:bg-gray-800">
        <h2 className="font-medium mb-2">Privacy</h2>
        <div className="text-sm text-gray-600">More controls coming soon.</div>
      </section>

      <section className="border rounded p-4 bg-white dark:bg-gray-800">
        <h2 className="font-medium mb-2">Notifications</h2>
        <div className="text-sm text-gray-600">More controls coming soon.</div>
      </section>
    </div>
  );
}
