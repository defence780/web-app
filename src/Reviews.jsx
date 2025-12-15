import React, { useState, useMemo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { fetchRemoteReviews, insertRemoteReview, mergeWithBase, sortReviewsDesc } from './utils/reviewsStorage';
import { reviews as baseReviews } from './data/reviews';
import { useI18n } from './i18n/I18nContext';

const cardStyle = {
  background: 'var(--section-background-color)',
  border: '1px solid rgba(100, 181, 246, 0.15)',
  borderRadius: '12px',
  padding: '16px',
  boxShadow: '0 4px 12px rgba(100, 181, 246, 0.2)',
  marginBottom: '12px',
};

const Reviews = () => {
  const { t } = useI18n();
  const queryParams = new URLSearchParams(window.location.search);
  const chatIdParam = queryParams.get('chat_id');
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ name: '', role: '', text: '', rating: 5 });
  const [chatId, setChatId] = useState(() => {
    try {
      const saved = localStorage.getItem('user');
      return saved ? (JSON.parse(saved)?.chat_id || '') : '';
    } catch {
      return '';
    }
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showRaffle, setShowRaffle] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const remote = await fetchRemoteReviews();
        const filtered = remote.filter((r) => !r.chat_id);
        setReviews(sortReviewsDesc(mergeWithBase(filtered)));
      } catch (e) {
        console.error('Cannot load remote reviews', e);
        setReviews(sortReviewsDesc(baseReviews));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.text.trim()) {
      setError(t('fillNameAndReview'));
      return;
    }
    try {
      const created = await insertRemoteReview({ ...form, chat_id: chatId || null });
      if (!created.chat_id) {
        setReviews((prev) => sortReviewsDesc([created, ...prev]));
      }
      setForm({ name: '', role: '', text: '', rating: 5 });
      setError('');
    } catch (remoteError) {
      console.error('Cannot add review to supabase', remoteError);
      setError(t('failedToSendReview'));
    }
  };

  const sortedReviews = useMemo(() => reviews.filter((r) => !r.chat_id), [reviews]);

  return (
    <div className="section" style={{ minHeight: '100vh' }}>
      <NavLink to="/actives" style={{ textDecoration: 'none' }}>
        <button
          style={{
            marginBottom: '16px',
            background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.3) 0%, rgba(129, 212, 250, 0.3) 100%)',
            color: 'var(--text-color)',
            fontWeight: 700,
            fontSize: '14px',
            padding: '10px 18px',
            borderRadius: '10px',
            border: '2px solid var(--active-link-color)',
            boxShadow: '0 4px 12px rgba(100, 181, 246, 0.3)',
            cursor: 'pointer',
          }}
        >
          {t('back')}
        </button>
      </NavLink>

      <h2 style={{ color: 'var(--section-heading-color)', marginTop: 0 }}>{t('allReviews')}</h2>
      <p style={{ color: 'var(--section-text-color)', marginTop: 0, marginBottom: '16px' }}>
        {t('realReviews')}
      </p>

      <div
        style={{
          marginBottom: '16px',
          padding: '14px',
          borderRadius: '12px',
          border: '2px solid var(--active-link-color)',
          background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.12) 0%, rgba(129, 212, 250, 0.12) 100%)',
          boxShadow: '0 4px 12px rgba(100, 181, 246, 0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: '0 0 6px', color: 'var(--section-heading-color)' }}>{t('raffleTitle')}</h3>
            <p style={{ margin: 0, color: 'var(--section-text-color)' }}>{t('raffleDescription')}</p>
          </div>
          <button
            onClick={() => setShowRaffle((v) => !v)}
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              border: '2px solid var(--active-link-color)',
              background: 'linear-gradient(135deg, var(--active-link-color) 0%, var(--footer-hover-color) 100%)',
              color: 'var(--background-color)',
              fontWeight: 700,
              cursor: 'pointer',
              minWidth: 140,
            }}
          >
            {showRaffle ? t('hide') : t('moreDetails')}
          </button>
        </div>
        {showRaffle && (
          <p style={{ margin: '12px 0 0', color: 'var(--text-color)' }}>
            {t('raffleFullDescription')}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '16px', display: 'grid', gap: '10px' }}>
        <div style={{ display: 'grid', gap: '8px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <input
            type="text"
            placeholder={t('name')}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: '2px solid var(--active-link-color)',
              background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(129, 212, 250, 0.1) 100%)',
              color: 'var(--text-color)',
            }}
            required
          />
          <input
            type="text"
            placeholder={t('role')}
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: '2px solid var(--active-link-color)',
              background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(129, 212, 250, 0.1) 100%)',
              color: 'var(--text-color)',
            }}
          />
          <select
            value={form.rating}
            onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              border: '2px solid var(--active-link-color)',
              background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(129, 212, 250, 0.1) 100%)',
              color: 'var(--text-color)',
            }}
          >
            {[5,4,3,2,1].map((r) => (
              <option key={r} value={r}>{r} ★</option>
            ))}
          </select>
        </div>
        <textarea
          placeholder={t('yourReview')}
          value={form.text}
          onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
          rows={4}
          style={{
            padding: '12px',
            borderRadius: '10px',
            border: '2px solid var(--active-link-color)',
            background: 'linear-gradient(135deg, rgba(100, 181, 246, 0.1) 0%, rgba(129, 212, 250, 0.1) 100%)',
            color: 'var(--text-color)',
            resize: 'vertical',
          }}
          required
        />
        {error && <span style={{ color: 'var(--loss-color)' }}>{error}</span>}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            style={{
              background: 'linear-gradient(135deg, var(--active-link-color) 0%, var(--footer-hover-color) 100%)',
              color: 'var(--background-color)',
              border: '2px solid var(--active-link-color)',
              padding: '10px 16px',
              borderRadius: '10px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('leaveReview')}
          </button>
        </div>
      </form>

      <div>
        {loading ? (
          <p style={{ color: 'var(--section-text-color)' }}>{t('loadingReviews')}</p>
        ) : sortedReviews.length === 0 ? (
          <p style={{ color: 'var(--section-text-color)' }}>{t('noReviewsYet')}</p>
        ) : (
          sortedReviews.map((item) => (
            <div key={item.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <strong style={{ color: 'var(--text-color)' }}>{item.name}</strong>
                  <p style={{ color: 'var(--section-text-color)', margin: '2px 0' }}>{item.role}</p>
                </div>
                <span style={{ color: 'var(--section-text-color)', fontSize: '0.9rem' }}>{item.date}</span>
              </div>
              <p style={{ color: 'var(--text-color)', margin: 0 }}>{item.text}</p>
              <p style={{ color: 'var(--section-heading-color)', margin: '6px 0 0' }}>
                {'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;

