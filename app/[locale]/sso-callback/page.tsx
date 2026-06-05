'use client';
import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SSOCallbackPage({ params }: { params: { locale: string } }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={`/${params.locale}`}
        signUpFallbackRedirectUrl={`/${params.locale}`}
      />
    </div>
  );
}
