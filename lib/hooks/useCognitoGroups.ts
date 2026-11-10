// lib/hooks/useCognitoGroups.ts
import { useAuth } from 'react-oidc-context';
import { groupsOf } from '@lib/groups';

export function useCognitoGroups() {
  return groupsOf(useAuth().user?.profile);
}
