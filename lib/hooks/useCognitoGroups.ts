// lib/hooks/useCognitoGroups.ts
import { useAuth } from 'react-oidc-context';

export function useCognitoGroups() {
  const auth = useAuth();

  const rawGroups = auth.user?.profile?.['cognito:groups'];
  let groups: string[] = [];

  if (Array.isArray(rawGroups)) {
    groups = rawGroups;
  } else if (typeof rawGroups === 'string') {
    groups = rawGroups.split(',').map((g) => g.trim());
  }

  return groups;
}