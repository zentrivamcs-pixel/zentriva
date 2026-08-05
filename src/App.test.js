import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// Both registration pages import the Vercel Blob upload helper for their
// photo fields. Its SDK reaches for browser APIs (streams, TextEncoder) that
// the jsdom build bundled with CRA's Jest doesn't provide, which used to
// crash these tests before a single element rendered. Nothing here exercises
// uploading, so the helper is replaced wholesale — that also stops the real
// module (and its SDK import) from ever loading.
jest.mock('./shared/uploadFile', () => ({ uploadImage: jest.fn() }));

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

// The longer timeout is for the lazy chunk: this route pulls in the whole
// registration bundle (both modules, the payment step, phone validation), and
// on a cold Jest module registry that regularly takes over the 1s default.
test('renders the registration page with both modules', async () => {
  renderAt('/register');
  expect(
    await screen.findByRole('heading', { name: /become a member/i }, { timeout: 5000 })
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /learn a skill/i })).toBeInTheDocument();
}, 10000);

// The long directory questionnaire was the registration page before the short
// form replaced it; it is kept intact behind /register/full rather than deleted.
test('the full business directory form is still reachable', async () => {
  renderAt('/register/full');
  expect(
    await screen.findByRole('heading', { name: /business & professional directory/i }, { timeout: 5000 })
  ).toBeInTheDocument();
}, 10000);

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
