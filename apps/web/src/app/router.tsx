import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Providers } from './Providers';
import { t } from '@/lib/i18n';

function Home() {
  return <h1>{t('app.title')}</h1>;
}

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
]);

export function AppRouter() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}
