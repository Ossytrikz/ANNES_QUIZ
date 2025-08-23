import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { UserProfile } from '../types/database';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, profile, updateProfile, loading, fetchProfile } = useAuth();
  const [form, setForm] = useState<Partial<UserProfile>>({
    display_name: '',
    bio: '',
    avatar_url: '',
    subjects: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        display_name: profile.display_name ?? '',
        bio: profile.bio ?? '',
        avatar_url: profile.avatar_url ?? '',
        subjects: profile.subjects ?? [],
      });
    }
  }, [profile]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const onSubjectsChange = (value: string) => {
    const tags = value.split(',').map(s => s.trim()).filter(Boolean);
    setForm(prev => ({ ...prev, subjects: tags }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await updateProfile({
      display_name: form.display_name ?? null,
      bio: form.bio ?? null,
      avatar_url: form.avatar_url ?? null,
      subjects: (form.subjects as string[]) ?? [],
    });
    setSaving(false);
    if (error) {
      console.error(error);
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile updated');
      await fetchProfile(user.id);
    }
  };

  const onUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const path = `${user.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('quiz-media').upload(path, file, { upsert: false });
    if (error) {
      toast.error('Upload failed');
      return;
    }
    const { data } = supabase.storage.from('quiz-media').getPublicUrl(path);
    setForm(prev => ({ ...prev, avatar_url: data.publicUrl }));
    toast.success('Avatar uploaded');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-4">Profile</h1>
      {loading ? (
        <div>Loading...</div>
      ) : !user ? (
        <div className="space-y-3">
          <div className="text-sm text-gray-700">You must be signed in to view and edit your profile.</div>
          <a href="/auth" className="inline-block bg-blue-600 text-white px-4 py-2 rounded">Sign In</a>
        </div>
      ) : (
        <form onSubmit={onSave} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Display Name</label>
            <input name="display_name" value={form.display_name ?? ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm mb-1">Avatar URL</label>
            <input name="avatar_url" value={form.avatar_url ?? ''} onChange={onChange} className="w-full border rounded px-3 py-2" />
            <div className="mt-2">
              <input type="file" accept="image/*" onChange={onUploadAvatar} />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">Bio</label>
            <textarea name="bio" value={form.bio ?? ''} onChange={onChange} className="w-full border rounded px-3 py-2" rows={4} />
          </div>
          <div>
            <label className="block text-sm mb-1">Subjects/Tags (comma separated)</label>
            <input value={(form.subjects as string[]).join(', ')} onChange={(e) => onSubjectsChange(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
          <button disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      )}
    </div>
  );
}
