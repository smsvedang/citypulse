import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/routes';
import { Member4ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <Member4ErrorBoundary>
      <RouterProvider router={router} />
    </Member4ErrorBoundary>
  );
}
