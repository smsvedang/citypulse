import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LiveMapDashboard } from '../features/map/LiveMapDashboard';
import { ZoneDetailPage } from '../features/zone/ZoneDetailPage';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { AccountPage } from '../features/account/AccountPage';
import { RoleChooserPage } from '../features/entry/RoleChooserPage';
import { CitizenLayout } from '../features/citizen/CitizenLayout';
import { AdminDashboardPage, AdminGuard, AdminLoginPage, AdminMessagesPage, AdminUsersPage } from '../features/admin/AdminPages';

export const router = createBrowserRouter([
  { path: '/', element: <RoleChooserPage /> },
  {
    path: '/citizen',
    element: <CitizenLayout />,
    children: [
      { index: true, element: <LiveMapDashboard /> },
      { path: 'zone/:id', element: <ZoneDetailPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'account', element: <AccountPage /> },
      { path: '*', element: <Navigate to="/citizen" replace /> },
    ],
  },
  { path: '/admin', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: <AdminGuard />,
    children: [
      { path: 'dashboard', element: <AdminDashboardPage /> },
      { path: 'messages', element: <AdminMessagesPage /> },
      { path: 'users', element: <AdminUsersPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
