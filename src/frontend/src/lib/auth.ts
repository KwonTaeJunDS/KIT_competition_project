/**
 * PHASE 2: Simple Auth Abstraction
 * Decouples components from direct environment variable dependency.
 */

export const DEMO_USER_ID = process.env.NEXT_PUBLIC_DEMO_USER_ID || "demo-user-001";

/**
 * Returns the current authenticated user ID.
 * For Phase 2, this always returns the DEMO_USER_ID.
 */
export function getCurrentUserId(): string {
  return DEMO_USER_ID;
}

/**
 * Hook-style wrapper for future reactivity (if using Context/Provider).
 */
export function useUser() {
  return {
    userId: getCurrentUserId(),
    isLoading: false
  };
}
