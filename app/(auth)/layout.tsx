export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklab, var(--color-outline-variant) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--color-outline-variant) 55%, transparent) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      <div className="relative z-10 w-full max-w-[380px]">{children}</div>
    </div>
  );
}
