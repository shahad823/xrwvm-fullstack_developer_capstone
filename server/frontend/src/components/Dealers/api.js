import { useEffect, useState } from 'react';
import { session } from '../../auth';

export async function getJSON(url, signal) {
  const response = await fetch(url, { credentials: 'same-origin', signal });
  const data = await response.json();
  if (!response.ok || (data.status && data.status !== 200)) {
    throw new Error(data.message || data.error || 'Could not load this information. Please try again.');
  }
  return data;
}

export function useSession() {
  const [state, setState] = useState({ loading: true, authenticated: false });
  useEffect(() => {
    let active = true;
    session().then(data => {
      if (active) setState({ loading: false, authenticated: data.authenticated });
    }).catch(() => {
      if (active) setState({ loading: false, authenticated: false, error: 'Could not check your session. Please sign in again.' });
    });
    return () => { active = false; };
  }, []);
  return state;
}
