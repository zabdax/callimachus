import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Providers } from './Providers';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { Home } from '@/features/home/Home';
import { Overview } from '@/features/home/Overview';
import { SyllabusMap } from '@/features/syllabus/SyllabusMap';
import { TasksScreen } from '@/features/tasks/TasksScreen';
import { StudyScreen } from '@/features/timer/StudyScreen';
import { TestTimerScreen } from '@/features/timer/TestTimerScreen';
import { SubscribeScreen } from '@/features/subscription/SubscribeScreen';
import { ApprovalQueue } from '@/features/admin/ApprovalQueue';
import { RequireAdmin } from '@/features/admin/RequireAdmin';
import { SettingsScreen } from '@/features/settings/SettingsScreen';
import { RequireAuth, RequireProfile } from './guards';
import { useAuth } from '@/features/auth/AuthContext';

const router = createBrowserRouter([
  { path: '/sign-in', element: <SignInScreen /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <RequireProfile>
          <Home />
        </RequireProfile>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Overview /> },
      { path: 'syllabus', element: <SyllabusMap medium="bangla" /> },
      { path: 'tasks', element: <TasksScreen /> },
      { path: 'study', element: <StudyScreenWithUid /> },
      { path: 'subscribe', element: <SubscribeScreen /> },
      { path: 'settings', element: <SettingsScreen /> },
    ],
  },
  {
    path: '/onboarding',
    element: (
      <RequireAuth>
        <Onboarding />
      </RequireAuth>
    ),
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <RequireAdmin>
          <ApprovalQueue />
        </RequireAdmin>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <ApprovalQueue /> },
    ],
  },
  // Dev-only route. Only mounted when VITE_ENABLE_TEST_ROUTES is set.
  // Production builds (no env) never include it.
  ...(import.meta.env.VITE_ENABLE_TEST_ROUTES === 'true'
    ? [{ path: '/__test/timer', element: <TestTimerScreen /> }]
    : []),
]);

function StudyScreenWithUid() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  if (!uid) return null;
  return <StudyScreen uid={uid} />;
}

export function AppRouter() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
