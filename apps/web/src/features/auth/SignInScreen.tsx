import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { signInWithGoogle } from './useGoogleSignIn';

export function SignInScreen() {
  const { t } = useTranslation();
  return (
    <main className="grid min-h-screen place-items-center bg-bg">
      <Button variant="primary" onClick={() => void signInWithGoogle()}>
        {t('auth.signInWithGoogle')}
      </Button>
    </main>
  );
}
