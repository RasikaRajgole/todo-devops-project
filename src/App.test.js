import { render, screen } from '@testing-library/react';
import App from './App';

test('renders todo app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/taskflow/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders add button', () => {
  render(<App />);
  const addButton = screen.getByText(/add/i);
  expect(addButton).toBeInTheDocument();
});
