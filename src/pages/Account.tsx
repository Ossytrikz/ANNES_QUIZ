import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

export default function Account() {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    full_name: '',
    avatar_url: '',
  });

  useEffect(() => {
    const meta = user?.user_metadata || {};
    setForm({
      first_name: meta.first_name || '',
      last_name: meta.last_name || '',
      full_name: meta.full_name || meta.name || '',
      avatar_url: meta.avatar_url || '',
    });
  }, [user?.id]);

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: form.first_name || null,
          last_name: form.last_name || null,
          full_name: form.full_name || null,
          avatar_url: form.avatar_url || null,
        },
      });
      if (error) throw error;
      toast.success('Profile updated');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-pink-200 mb-4">Profile & Settings</h1>
      <div className="rounded-xl border border-gray-200 dark:border-pink-400/30 bg-white dark:bg-gray-800 p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">First name</label>
            <input name="first_name" value={form.first_name} onChange={onChange} className="w-full" placeholder="Ada" />
          </div>
          <div>
            <label className="block text-sm mb-1">Last name</label>
            <input name="last_name" value={form.last_name} onChange={onChange} className="w-full" placeholder="Lovelace" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Display name</label>
            <input name="full_name" value={form.full_name} onChange={onChange} className="w-full" placeholder="Ada Lovelace" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Avatar URL</label>
            <input name="avatar_url" value={form.avatar_url} onChange={onChange} className="w-full" placeholder="https://..." />
            <p className="text-xs text-gray-500 mt-1">If provided, we’ll show this image as your avatar.</p>
          </div>
        </div>
        <div className="pt-2">
          <button
            onClick={onSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
