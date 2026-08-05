// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// jsdom has no layout engine, so scrolling is not implemented — it logs a
// noisy "Not implemented" error for every route change. The app's scroll
// calls are behaviour we don't assert on, so they're stubbed out.
if (typeof window !== 'undefined') {
  window.scrollTo = () => {};
}
