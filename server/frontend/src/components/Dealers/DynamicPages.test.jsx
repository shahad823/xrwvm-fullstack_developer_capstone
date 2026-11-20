import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import App from '../../App';

jest.mock('../Header/Header', () => () => <header>Best Cars</header>);
const dealers = [
  { id: 3, full_name: 'Kansas Cars', city: 'Wichita', address: '3 Main St', zip: 67202, state: 'Kansas' },
  { id: 7, full_name: 'New York Cars', city: 'New York', address: '7 Main St', zip: 10001, state: 'New York' },
];
let authenticated, reviews, failPost;
const reply = (data, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => data });
function open(path) {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}
beforeEach(() => {
  authenticated = false;
  reviews = [];
  failPost = false;
  sessionStorage.clear();
  document.cookie = 'csrftoken=test-csrf-token';
  global.fetch = jest.fn((url, options = {}) => {
    if (url === '/djangoapp/session') return reply({ authenticated, userName: authenticated ? 'reviewer' : '' });
    if (url === '/djangoapp/get_dealers') return reply({ status: 200, dealers });
    if (url.startsWith('/djangoapp/get_dealers/')) return reply({ status: 200, dealers: dealers.filter(d => d.state === decodeURIComponent(url.split('/').pop())) });
    if (url === '/djangoapp/dealer/3') return reply({ status: 200, dealer: [dealers[0]] });
    if (url === '/djangoapp/reviews/dealer/3') return reply({ status: 200, reviews: [...reviews] });
    if (url === '/djangoapp/get_cars') return reply({ CarModels: [{ CarMake: 'Mercedes Benz', CarModel: 'C Class' }] });
    if (url === '/djangoapp/add_review') {
      if (failPost) return reply({ status: 502, message: 'Backend service is unavailable.' }, 502);
      const review = { ...JSON.parse(options.body), id: 51, name: 'reviewer', sentiment: 'positive' };
      reviews.push(review);
      return reply({ status: 200, review });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
});
afterEach(() => jest.restoreAllMocks());

test('anonymous dealerships render without Post Review, ignoring stale sessionStorage', async () => {
  sessionStorage.setItem('username', 'stale-user');
  open('/dealers');
  expect(await screen.findByRole('link', { name: 'Kansas Cars' })).toHaveAttribute('href', '/dealer/3');
  expect(screen.getByRole('link', { name: 'New York Cars' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Post Review/ })).not.toBeInTheDocument();
});

test('authenticated dealerships show review actions and repeated state filters work', async () => {
  authenticated = true;
  open('/dealers');
  expect(await screen.findByRole('link', { name: 'Post Review for Kansas Cars' })).toHaveAttribute('href', '/postreview/3');
  const filter = screen.getByLabelText('Filter by state');
  fireEvent.change(filter, { target: { value: 'Kansas' } });
  await waitFor(() => expect(screen.queryByRole('link', { name: 'New York Cars' })).not.toBeInTheDocument());
  fireEvent.change(filter, { target: { value: 'New York' } });
  expect(await screen.findByRole('link', { name: 'New York Cars' })).toBeInTheDocument();
  fireEvent.change(filter, { target: { value: 'All' } });
  expect(await screen.findByRole('link', { name: 'Kansas Cars' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/djangoapp/get_dealers/New%20York', expect.any(Object));
});

test('dealer details display reviews with sentiment and an authenticated Post Review link', async () => {
  authenticated = true;
  reviews = [{ id: 1, name: 'Sam', review: 'Friendly staff', sentiment: 'positive', car_make: 'Toyota', car_model: 'Camry', car_year: 2023 }];
  open('/dealer/3');
  expect(await screen.findByRole('heading', { name: 'Kansas Cars' })).toBeInTheDocument();
  expect(screen.getByText('Friendly staff')).toBeInTheDocument();
  expect(screen.getByText('positive')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Post Review' })).toHaveAttribute('href', '/postreview/3');
});

test('anonymous dealer displays empty state without a Post Review link', async () => {
  open('/dealer/3');
  expect(await screen.findByText('No reviews yet!')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Post Review' })).not.toBeInTheDocument();
});

test('anonymous review page asks for sign in and has no submit form', async () => {
  open('/postreview/3');
  expect(await screen.findByText(/Please sign in to post a review/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Post Review' })).not.toBeInTheDocument();
});

async function completeForm() {
  fireEvent.change(await screen.findByLabelText('Review'), { target: { value: 'Excellent service from the team' } });
  fireEvent.change(screen.getByLabelText('Purchase Date'), { target: { value: '2023-10-01' } });
  fireEvent.change(screen.getByLabelText('Car Make and Model'), { target: { value: JSON.stringify(['Mercedes Benz', 'C Class']) } });
  fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2022' } });
  fireEvent.click(screen.getByRole('button', { name: 'Post Review' }));
}

test('review submission sends CSRF and numeric fields, then reloads dealer reviews', async () => {
  authenticated = true;
  open('/postreview/3');
  await completeForm();
  expect(await screen.findByRole('heading', { name: 'Customer reviews' })).toBeInTheDocument();
  expect(screen.getByText('Excellent service from the team')).toBeInTheDocument();
  const [, options] = global.fetch.mock.calls.find(([url]) => url === '/djangoapp/add_review');
  expect(options.headers['X-CSRFToken']).toBe('test-csrf-token');
  expect(JSON.parse(options.body)).toMatchObject({ dealership: 3, car_year: 2022, car_make: 'Mercedes Benz', car_model: 'C Class' });
  expect(options.credentials).toBe('same-origin');
});

test('failed review post shows server message and retains the form', async () => {
  authenticated = true;
  failPost = true;
  open('/postreview/3');
  await completeForm();
  expect(await screen.findByRole('alert')).toHaveTextContent('Backend service is unavailable.');
  expect(screen.getByLabelText('Review')).toHaveValue('Excellent service from the team');
  expect(screen.getByRole('button', { name: 'Post Review' })).toBeEnabled();
});
