'use client';
import React from 'react';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import AuthModal from '../auth/AuthModal';
import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';

function AuthModalManager() {
  const { showModal, setShowModal, authMode, setAuthMode } = useAuth();
  const { isSignedIn } = useUser();

  useEffect(() => {
    if (isSignedIn && showModal) setShowModal(false);
  }, [isSignedIn, showModal, setShowModal]);

  if (!showModal) return null;

  return <AuthModal onClose={() => setShowModal(false)} authMode={authMode} setAuthMode={setAuthMode} />;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModalManager />
    </AuthProvider>
  );
}
