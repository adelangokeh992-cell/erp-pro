import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock providers and router to avoid full app mount
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: () => null,
}));
jest.mock('./contexts/LanguageContext', () => ({
  LanguageProvider: ({ children }) => <div>{children}</div>,
  useLanguage: () => ({ language: 'ar', t: (k) => k }),
}));
jest.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => <div>{children}</div>,
}));
jest.mock('./contexts/OfflineContext', () => ({
  OfflineProvider: ({ children }) => <div>{children}</div>,
}));

test('renders without crashing', () => {
  render(<App />);
});
