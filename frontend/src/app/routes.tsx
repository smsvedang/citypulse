import React from 'react';
import { createBrowserRouter, Navigate, useParams } from 'react-router-dom';
import { LiveMapDashboard } from '../features/map/LiveMapDashboard';
import { ZoneDetailPage } from '../features/zone/ZoneDetailPage';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { AccountPage } from '../features/account/AccountPage';
import { RoleChooserPage } from '../features/entry/RoleChooserPage';
import { CitizenLayout } from '../features/citizen/CitizenLayout';
import { VolunteerDashboardPage, VolunteerGuard, VolunteerLoginPage } from '../features/volunteer/VolunteerPage';
import { AdminDashboardPage, AdminGuard, AdminLoginPage, AdminMessagesPage, AdminUsersPage } from '../features/admin/AdminPages';

function ZoneAliasRedirect() {
  const { id } = useParams();
  const target = id ? `/citizen/zone/${encodeURIComponent(id)}` : '/citizen';
  return <Navigate to={target} replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <RoleChooserPage /> },
  { path: '/zone/:id', element: <ZoneAliasRedirect /> },
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
  { path: '/volunteer', element: <VolunteerLoginPage /> },
  {
    path: '/volunteer',
    element: <VolunteerGuard />,
    children: [
      { path: 'dashboard', element: <VolunteerDashboardPage /> },
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
