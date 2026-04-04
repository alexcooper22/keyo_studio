'use client';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';

function AuthModalManager() {
  const { showModal, setShowModal } = useAuth();
  
  if (!showModal) return null;
  
  return <AuthModal onClose={() => setShowModal(false)} />;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <AuthModalManager />
    </AuthProvider>
  );
}
