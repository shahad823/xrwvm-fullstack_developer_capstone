import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../Header/Header';
import { authRequest } from '../../auth';
import { getJSON, useSession } from './api';
import './Dealers.css';

export default function PostReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useSession();
  const [dealer, setDealer] = useState(null);
  const [cars, setCars] = useState([]);
  const [review, setReview] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2023');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getJSON(`/djangoapp/dealer/${id}`, controller.signal), getJSON('/djangoapp/get_cars', controller.signal)])
      .then(([details, data]) => {
        if (controller.signal.aborted) return;
        if (!details.dealer.length) throw new Error('Dealer not found.');
        setDealer(details.dealer[0]);
        setCars(data.CarModels);
      }).catch(failure => { if (!controller.signal.aborted) setLoadError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  const submit = async event => {
    event.preventDefault();
    if (busy) return;
    if (!review.trim() || !model || !date || Number(year) < 2015 || Number(year) > 2023) {
      setError('Complete all fields and choose a year between 2015 and 2023.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const [make, car] = JSON.parse(model);
      await authRequest('/djangoapp/add_review', {
        dealership: Number(id), review: review.trim(), purchase: true,
        purchase_date: date, car_make: make, car_model: car, car_year: Number(year),
      });
      navigate(`/dealer/${id}`);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return <><Header /><main className="dealer-page">
    <Link to={`/dealer/${id}`}>Back to dealer</Link>
    <h1>Post Review{dealer ? `: ${dealer.full_name}` : ''}</h1>
    {user.loading || loading ? <p role="status">Loading review form…</p> : !user.authenticated ?
      <p>{user.error || 'Please sign in to post a review.'} <Link to="/login/">Login</Link></p> : loadError ? <p role="alert">{loadError}</p> :
      <form className="review-form" onSubmit={submit}>
        <label htmlFor="review-text">Review</label>
        <textarea id="review-text" rows="6" value={review} onChange={event => setReview(event.target.value)} required />
        <label htmlFor="purchase-date">Purchase Date</label>
        <input id="purchase-date" type="date" value={date} onChange={event => setDate(event.target.value)} required />
        <label htmlFor="car-model">Car Make and Model</label>
        <select id="car-model" value={model} onChange={event => setModel(event.target.value)} required>
          <option value="" disabled>Choose Car Make and Model</option>
          {cars.map(car => <option key={JSON.stringify([car.CarMake, car.CarModel])} value={JSON.stringify([car.CarMake, car.CarModel])}>{car.CarMake} {car.CarModel}</option>)}
        </select>
        <label htmlFor="car-year">Year</label>
        <input id="car-year" type="number" min="2015" max="2023" value={year} onChange={event => setYear(event.target.value)} required />
        {error && <p role="alert">{error}</p>}
        <button className="postreview" type="submit" disabled={busy}>{busy ? 'Posting…' : 'Post Review'}</button>
      </form>}
  </main></>;
}
