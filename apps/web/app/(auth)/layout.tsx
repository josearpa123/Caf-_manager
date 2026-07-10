import { Coffee } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            'radial-gradient(60% 50% at 50% 0%, hsl(var(--primary) / 0.12), transparent)',
        }}
      />
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Coffee className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Coffee Manager</span>
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
