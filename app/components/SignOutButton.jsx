'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function SignOutButton() {
  const { logout } = useAuth();

  return (
    <Button onClick={logout} variant="destructive" size="sm">
      Sign Out
    </Button>
  );
}
