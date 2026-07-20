import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock API module - path must match how it's imported across the app
jest.mock('./api/index', () => ({
  getHouseholds:     () => Promise.resolve([]),
  getFoodCategories: () => Promise.resolve([]),
  getFoodItems:      () => Promise.resolve([]),
  getHousehold:      () => Promise.resolve({ household: { id: '1', name: 'Test' }, members: [] }),
  saveRecommendation: () => Promise.resolve({ session: { id: 's1' }, recommendation: {} }),
  getMealSessions:   () => Promise.resolve([]),
  createHousehold:   () => Promise.resolve({}),
  updateHousehold:   () => Promise.resolve({}),
  deleteHousehold:   () => Promise.resolve(),
  createMember:      () => Promise.resolve({}),
  updateMember:      () => Promise.resolve({}),
  deleteMember:      () => Promise.resolve(),
  saveFeedback:      () => Promise.resolve({}),
}));

test('renders PortionIQ header', () => {
  render(<App />);
  const heading = screen.getByText(/PortionIQ/i);
  expect(heading).toBeInTheDocument();
});

test('renders bottom navigation tabs', () => {
  render(<App />);
  // Navigation uses getAll to handle potential duplicate text
  expect(screen.getAllByText(/Calculate/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/Households/i).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/History/i).length).toBeGreaterThan(0);
});

test("shows 'Who is eating' step on initial load", () => {
  render(<App />);
  expect(screen.getAllByText(/Who.s eating/i).length).toBeGreaterThan(0);
});

