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
// registration bundle (the form, the payment step, phone validation), and on a
// cold Jest module registry that regularly takes over the 1s default.
//
// Membership and skill training used to be two separate modules, each asking
// for the same name/gender/phone/email. They are now one form: the details are
// collected once and training is an optional section of the same submission.
test('renders the registration page as one form covering both paths', async () => {
  renderAt('/register');
  expect(
    await screen.findByRole('heading', { name: /join zentriva/i }, { timeout: 5000 })
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /your details/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /membership/i })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /skill training/i })).toBeInTheDocument();
}, 10000);

// The fee is a one-time registration charge covering membership and training
// alike. It read "/year" on the form and in the payment summary, which is a
// different promise to the member and a different number on the invoice.
test('the registration fee is presented as one-time, not annual', async () => {
  renderAt('/register');
  expect(
    await screen.findByText(/one-time registration fee/i, {}, { timeout: 5000 })
  ).toBeInTheDocument();
  expect(screen.queryByText(/₦5,000\s*\/\s*year/i)).not.toBeInTheDocument();
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
