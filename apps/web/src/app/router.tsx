import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Providers } from './Providers';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { Home } from '@/features/home/Home';
import { SyllabusMap } from '@/features/syllabus/SyllabusMap';
import { TasksScreen } from '@/features/tasks/TasksScreen';
import { StudyScreen } from '@/features/timer/StudyScreen';
import { RequireAuth, RequireProfile } from './guards';

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
      { path: 'syllabus', element: <SyllabusMap medium="bangla" /> },
      { path: 'tasks', element: <TasksScreen /> },
      { path: 'study', element: <StudyScreenWithUid /> },
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
]);

import { useAuth } from '@/features/auth/AuthContext';

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
