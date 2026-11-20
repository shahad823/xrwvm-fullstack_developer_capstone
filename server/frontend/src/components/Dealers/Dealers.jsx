import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../Header/Header';
import { getJSON, useSession } from './api';
import './Dealers.css';

export default function Dealers() {
  const [dealers, setDealers] = useState([]);
  const [states, setStates] = useState([]);
  const [state, setState] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = useSession();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const url = state === 'All' ? '/djangoapp/get_dealers' : `/djangoapp/get_dealers/${encodeURIComponent(state)}`;
    getJSON(url, controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setDealers(data.dealers);
      if (state === 'All') setStates([...new Set(data.dealers.map(dealer => dealer.state))].sort());
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure.message);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [state]);

  return <><Header /><main className="dealer-page">
    <h1>Dealerships</h1>
    <label htmlFor="dealer-state">Filter by state</label>{' '}
    <select id="dealer-state" value={state} onChange={event => setState(event.target.value)}>
      <option value="All">All States</option>
      {states.map(value => <option key={value} value={value}>{value}</option>)}
    </select>
    {user.error && <p role="alert">{user.error}</p>}
    {loading ? <p role="status">Loading dealerships…</p> : error ? <p role="alert">{error}</p> :
      dealers.length === 0 ? <p>No dealerships found in this state.</p> :
      <div className="dealer-table"><table className="table">
        <thead><tr><th scope="col">ID</th><th scope="col">Dealer Name</th><th scope="col">City</th><th scope="col">Address</th><th scope="col">Zip</th><th scope="col">State</th>{user.authenticated && <th scope="col">Review Dealer</th>}</tr></thead>
        <tbody>{dealers.map(dealer => <tr key={dealer.id}>
          <td>{dealer.id}</td><td><Link to={`/dealer/${dealer.id}`}>{dealer.full_name}</Link></td>
          <td>{dealer.city}</td><td>{dealer.address}</td><td>{dealer.zip}</td><td>{dealer.state}</td>
          {user.authenticated && <td><Link to={`/postreview/${dealer.id}`} aria-label={`Post Review for ${dealer.full_name}`}>Post Review</Link></td>}
        </tr>)}</tbody>
      </table></div>}
  </main></>;
}
