import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Providers } from './Providers';
import { SignInScreen } from '@/features/auth/SignInScreen';
import { Onboarding } from '@/features/onboarding/Onboarding';
import { Home } from '@/features/home/Home';
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

export function AppRouter() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
