/**
 * Demo AuthContext — same surface as the production provider, no Cognito.
 *
 * The WebMCP thesis is that the agent operates INSIDE the physician's already
 * authenticated session, so the public demo boots directly into a session for
 * a synthetic doctor. There is nothing to log into and no credential ever
 * exists in this repo.
 */
import React, { createContext, useContext } from 'react';

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  professionalLicense?: string;
  specialty?: string;
  clinic?: { id: string; name: string; type?: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  role: string | null;
  isAuthenticated: boolean;
  initializing: boolean;
}

// Synthetic physician (see src/mock/db.ts for the synthetic patients).
export const DEMO_DOCTOR: AuthUser = {
  id: 'doc-demo-1',
  firstName: 'Andrés',
  lastName: 'Herrera Cantú',
  email: 'dr.herrera@demo.invalid',
  role: 'doctor',
  professionalLicense: '10203040',
  specialty: 'Medicina Interna',
  clinic: null,
};

const DEMO_STATE: AuthState = {
  user: DEMO_DOCTOR,
  role: 'doctor',
  isAuthenticated: true,
  initializing: false,
};

const AuthContext = createContext<AuthState>(DEMO_STATE);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={DEMO_STATE}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** Non-throwing variant kept for parity with the production context. */
export function useAuthOptional(): AuthState {
  return useContext(AuthContext);
}
