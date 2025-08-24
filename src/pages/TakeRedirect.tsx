import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/** Redirects classic /quizzes/:id/take into the Console with preselection */
export default function TakeRedirect() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useEffect(() => {
    if (id) {
      navigate(`/console?prefill=${encodeURIComponent(id)}`, { replace: true });
    } else {
      navigate('/console', { replace: true });
    }
  }, [id, navigate]);
  return <div className="container py-4">Redirecting to Quiz Console…</div>;
}