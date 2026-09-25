import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/routes';
import { Member4ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './app/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <Member4ErrorBoundary>
        <RouterProvider router={router} />
      </Member4ErrorBoundary>
    </ThemeProvider>
  );
}
