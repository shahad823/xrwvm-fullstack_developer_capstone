import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../Header/Header';
import { getJSON, useSession } from './api';
import positive from '../assets/positive.png';
import neutral from '../assets/neutral.png';
import negative from '../assets/negative.png';
import './Dealers.css';

export default function Dealer() {
  const { id } = useParams();
  const user = useSession();
  const [dealer, setDealer] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      getJSON(`/djangoapp/dealer/${id}`, controller.signal),
      getJSON(`/djangoapp/reviews/dealer/${id}`, controller.signal),
    ]).then(([details, result]) => {
      if (controller.signal.aborted) return;
      if (!details.dealer.length) throw new Error('Dealer not found.');
      setDealer(details.dealer[0]);
      setReviews(result.reviews);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  const icons = { positive, neutral, negative };
  return <><Header /><main className="dealer-page">
    <Link to="/dealers">All dealerships</Link>
    {loading ? <p role="status">Loading dealer and reviews…</p> : error ? <p role="alert">{error}</p> : dealer && <>
      <h1>{dealer.full_name}</h1>
      <p>{dealer.address}, {dealer.city}, {dealer.state} {dealer.zip}</p>
      {user.authenticated && <Link className="review-action" to={`/postreview/${id}`}>Post Review</Link>}
      {user.error && <p role="alert">{user.error}</p>}
      <h2>Customer reviews</h2>
      {reviews.length === 0 ? <p>No reviews yet!</p> : <div className="reviews_panel">
        {reviews.map(review => <article className="review_panel" key={review.id}>
          <p><img src={icons[review.sentiment] || neutral} className="emotion_icon" alt="" /> <span>{review.sentiment || 'neutral'}</span></p>
          <p className="review">{review.review}</p>
          <p className="reviewer">{review.name} · {review.car_make} {review.car_model} {review.car_year}</p>
          {review.purchase && <p>Purchased {review.purchase_date}</p>}
        </article>)}
      </div>}
    </>}
  </main></>;
}
