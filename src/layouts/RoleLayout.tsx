export function RoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto h-screen overflow-hidden bg-background flex flex-col items-center justify-center px-6 relative shadow-2xl animate-fade-in">
      {children}
    </div>
  );
}
