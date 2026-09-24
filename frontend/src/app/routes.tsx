import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from './Layout';
import { LiveMapPage } from '../features/map/LiveMapPage';
import { ZoneDetailPage } from '../features/zone/ZoneDetailPage';
import { AnalyticsPage } from '../features/analytics/AnalyticsPage';
import { AlertsPage } from '../features/alerts/AlertsPage';
import { BriefPage } from '../features/brief/BriefPage';
import { DemoPage } from '../features/demo/DemoPage';
import { FeedStatusPage } from '../features/feed/FeedStatusPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <LiveMapPage /> },
      { path: 'zone/:id', element: <ZoneDetailPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'brief', element: <BriefPage /> },
      { path: 'demo', element: <DemoPage /> },
      { path: 'feed-status', element: <FeedStatusPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
