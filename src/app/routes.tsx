import { createBrowserRouter } from 'react-router';
import { lazy, Suspense } from 'react';
import { AppLayout } from './components/AppLayout';
import {
  DashboardSkeleton,
  ProjectsSkeleton,
  BacklogSkeleton,
  GenericPageSkeleton,
} from './components/PageSkeletons';

// Eager: lightweight public pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import EmailVerified from './pages/EmailVerified';
import NotFound from './pages/NotFound';

// Lazy: heavier authenticated pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Backlog = lazy(() => import('./pages/Backlog'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Reports = lazy(() => import('./pages/Reports'));
const Alerts = lazy(() => import('./pages/Alerts'));
const GitHub = lazy(() => import('./pages/GitHub'));
const AzureRet = lazy(() => import('./pages/AzureRet'));
const PaymentSuccess = lazy(() => import('./pages/PaymentSuccess'));
const PaymentCancel = lazy(() => import('./pages/PaymentCancel'));
const Plans = lazy(() => import('./pages/Plans'));
const GoogleAuthCallback = lazy(() => import('./pages/GoogleAuthCallback'));

function withSuspense(Component: React.LazyExoticComponent<React.ComponentType>, Fallback: React.ComponentType = GenericPageSkeleton) {
  return (
    <Suspense fallback={<Fallback />}>
      <Component />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/auth/verified',
    element: <EmailVerified />,
  },
  {
    path: '/auth/google/callback',
    element: withSuspense(GoogleAuthCallback),
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { path: 'dashboard', element: withSuspense(Dashboard, DashboardSkeleton) },
      { path: 'projects', element: withSuspense(Projects, ProjectsSkeleton) },
      { path: 'projects/:id', element: withSuspense(ProjectDetail, GenericPageSkeleton) },
      { path: 'backlog', element: withSuspense(Backlog, BacklogSkeleton) },
      { path: 'profile', element: withSuspense(Profile) },
      { path: 'settings', element: withSuspense(Settings) },
      { path: 'reports', element: withSuspense(Reports) },
      { path: 'alerts', element: withSuspense(Alerts) },
      { path: 'github', element: withSuspense(GitHub) },
      { path: 'azure-ret', element: withSuspense(AzureRet) },
      { path: 'plans', element: withSuspense(Plans) },
      { path: 'payment/success', element: withSuspense(PaymentSuccess) },
      { path: 'payment/cancel', element: withSuspense(PaymentCancel) },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
