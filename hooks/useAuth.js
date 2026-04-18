'use client';

// Re-exports from AuthContext for backwards compatibility.
// Components that import from hooks/useAuth.js keep working without changes.
export { useAuth } from '@/app/contexts/AuthContext';
