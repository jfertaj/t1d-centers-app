// utils/auth.ts
export function isAuthenticated(): boolean {
  return !!localStorage.getItem('cognito_token');
}

export function logout() {
  localStorage.removeItem('cognito_token');
}