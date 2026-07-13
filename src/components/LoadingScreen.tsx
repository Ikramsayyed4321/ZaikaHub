import { UtensilsCrossed } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto h-screen bg-primary flex flex-col items-center justify-center text-accent relative overflow-hidden shadow-2xl">
      <div className="absolute inset-0 shimmer opacity-20 pointer-events-none" />
      <UtensilsCrossed size={80} className="mb-6 animate-fade-in drop-shadow-lg" />
      <h1 className="font-display font-bold text-4xl text-background tracking-wider animate-fade-in drop-shadow-md text-center">
        Zaika
        <br />
        Hub
      </h1>
      <p className="text-background/70 mt-2 font-semibold text-sm tracking-widest uppercase animate-fade-in delay-100">
        Restaurant Management
      </p>
    </div>
  );
}
