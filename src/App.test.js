import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// App uses useLocation, so it needs a router; MemoryRouter keeps the test
// independent of the browser URL.
const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

test('renders the homepage hero', async () => {
  renderAt('/');
  expect(
    await screen.findByRole('heading', { name: /skilled\. empowered\. rooted in purpose\./i })
  ).toBeInTheDocument();
});

test('renders the registration form', async () => {
  renderAt('/register');
  expect(
    await screen.findByRole('heading', { name: /business & professional directory/i })
  ).toBeInTheDocument();
});

// Unknown URLs used to render the homepage, which made every bad link a
// 200-OK duplicate of "/" in Google's index (a soft 404).
test('unknown routes render the not-found page, not a copy of the homepage', async () => {
  renderAt('/no-such-page');
  expect(
    await screen.findByRole('heading', { name: /we couldn't find that page/i })
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('heading', { name: /skilled\. empowered\. rooted in purpose\./i })
  ).not.toBeInTheDocument();
});

test('page metadata follows the route', async () => {
  renderAt('/');
  await screen.findByRole('heading', { name: /skilled\. empowered\. rooted in purpose\./i });
  expect(document.title).toMatch(/Zentriva Multipurpose Cooperative Society/);
  expect(document.querySelector('link[rel="canonical"]').getAttribute('href'))
    .toBe('https://zentrivacoop.com/');
  expect(document.querySelector('meta[name="robots"]').getAttribute('content'))
    .toBe('index, follow');
});

// The 404 page must carry a noindex, since a static host can't return a real
// 404 status for a client-side route.
test('the not-found page is marked noindex', async () => {
  renderAt('/no-such-page');
  await screen.findByRole('heading', { name: /we couldn't find that page/i });
  expect(document.querySelector('meta[name="robots"]').getAttribute('content'))
    .toBe('noindex, nofollow');
});
