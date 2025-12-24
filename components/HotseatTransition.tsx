import React from 'react';
import { Button } from './ui/Button';
import { Smartphone, EyeOff } from 'lucide-react';

interface HotseatTransitionProps {
  nextPlayerName: string;
  onReady: () => void;
  isGameMaster?: boolean;
}

export const HotseatTransition: React.FC<HotseatTransitionProps> = ({ nextPlayerName, onReady, isGameMaster }) => {
  return (
    <div className="fixed inset-0 bg-brand-dark z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="max-w-md w-full text-center space-y-10">
        
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-brand-accent blur-2xl opacity-20 rounded-full"></div>
          <Smartphone size={80} className="relative text-white mx-auto animate-bounce-short" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white">
            Gib das Gerät an
          </h2>
          <div className="py-4">
            <span className="block text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-yellow-200 font-serif mb-2">
              {nextPlayerName}
            </span>
            {isGameMaster && (
              <span className="inline-block px-3 py-1 bg-brand-primary border border-brand-accent rounded-full text-xs text-brand-accent font-bold tracking-wider uppercase">
                Spielleiter
              </span>
            )}
          </div>
          
          <div className="bg-red-900/30 border border-red-500/30 p-4 rounded-lg flex items-center justify-center gap-3 text-red-200">
            <EyeOff size={20} />
            <p className="text-sm font-medium">Bitte nicht auf den Bildschirm schauen!</p>
          </div>
        </div>

        <Button 
          onClick={onReady} 
          className="w-full text-lg h-16 shadow-[0_0_30px_rgba(88,28,135,0.6)]"
        >
          Ich bin {nextPlayerName}
        </Button>
      </div>
    </div>
  );
};