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

test('renders the registration form with the default tier selected', async () => {
  renderAt('/register');
  expect(
    await screen.findByRole('heading', { name: /business & professional directory/i })
  ).toBeInTheDocument();
  // Standard is the default tier when no ?tier= param is given.
  expect(await screen.findByRole('radio', { name: /standard/i })).toBeChecked();
});

test('unknown routes fall back to the homepage', async () => {
  renderAt('/no-such-page');
  expect(
    await screen.findByRole('heading', { name: /skilled\. empowered\. rooted in purpose\./i })
  ).toBeInTheDocument();
});
