import { render, screen } from '@testing-library/react';
import App from './App';

test('renders todo app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/taskflow/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders add button', () => {
  render(<App />);
  const addButton = screen.getByRole('button', { name: /\+ add/i });
  expect(addButton).toBeInTheDocument();
});

test('renders input placeholder', () => {
  render(<App />);
  const input = screen.getByPlaceholderText(/what needs to be done/i);
  expect(input).toBeInTheDocument();
});
