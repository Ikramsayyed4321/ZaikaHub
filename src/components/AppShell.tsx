export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto h-screen bg-background relative shadow-2xl md:border-x md:border-primary/10 overflow-hidden overscroll-none flex flex-col font-body animate-fade-in">
      {children}
    </div>
  );
}
