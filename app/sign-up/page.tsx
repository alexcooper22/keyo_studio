import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <SignUp 
        routing="path"
        path="/sign-up"
        fallbackRedirectUrl="/"
        signInUrl="/sign-in"
        appearance={{
          variables: {
            colorPrimary: '#532fcf',
            colorBackground: '#0f0f0f',
            colorText: '#f0f0f0',
            colorInputBackground: '#111111',
            colorInputText: '#f0f0f0',
            borderRadius: '0.75rem',
          },
          elements: {
            rootBox: 'shadow-2xl',
            card: 'bg-[#0f0f0f] border border-white/[0.08] shadow-2xl',
            formButtonPrimary: 'bg-accent hover:brightness-110 font-dm font-semibold',
            footerActionLink: 'text-accent',
          },
        }}
      />
    </div>
  );
}
