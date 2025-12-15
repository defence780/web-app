import { supabase } from '../supabase';
import { reviews as baseReviews } from '../data/reviews';

export const fetchRemoteReviews = async () => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map((item) => ({
    id: item.id,
    name: item.name,
    role: item.role,
    text: item.text,
    rating: item.rating ?? 5,
    chat_id: item.chat_id,
    date: item.created_at ? new Date(item.created_at).toLocaleDateString('uk-UA') : '',
    created_at: item.created_at,
  }));
};

export const insertRemoteReview = async ({ name, role, text, rating, chat_id }) => {
  const payload = {
    name,
    role,
    text,
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
  };

  if (chat_id) {
    payload.chat_id = chat_id;
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    role: data.role,
    text: data.text,
    rating: data.rating ?? 5,
    date: data.created_at ? new Date(data.created_at).toLocaleDateString('uk-UA') : '',
    created_at: data.created_at,
  };
};

// Simple helper to include static base reviews after remote ones
export const mergeWithBase = (remote) => [...remote, ...baseReviews];

// Sort by date/created_at descending (newest first)
export const sortReviewsDesc = (list) =>
  [...list].sort((a, b) => {
    const da = a.created_at ? new Date(a.created_at) : (a.date ? new Date(a.date.split('.').reverse().join('-')) : 0);
    const db = b.created_at ? new Date(b.created_at) : (b.date ? new Date(b.date.split('.').reverse().join('-')) : 0);
    return db - da;
  });

