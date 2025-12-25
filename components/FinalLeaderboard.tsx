
import React, { useEffect } from 'react';
import { Player, RoundHistory, GameMode } from '../types';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Trophy, RotateCcw, Crown, Ghost } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FinalLeaderboardProps {
  players: Player[];
  onReset: () => void;
  isHost: boolean;
  finalRoast?: string | null;
  history?: RoundHistory[];
  gameMode?: GameMode;
}

export const FinalLeaderboard: React.FC<FinalLeaderboardProps> = ({ players, onReset, isHost, finalRoast, history, gameMode }) => {
  // WICHTIG: Troll Torben (Heckler) komplett aus der Rangliste entfernen
  // WICHTIG: Im Host-Modus den Host aus der Rangliste entfernen
  const participants = players.filter(p => {
    if (p.isHeckler) return false;
    if (gameMode === 'host' && p.isHost) return false;
    return true;
  });
  
  const heckler = players.find(p => p.isHeckler);

  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];

  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#f59e0b', '#581c87', '#faf5ff']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#f59e0b', '#581c87', '#faf5ff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }, []);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pt-10 pb-20 px-4">
      <div className="text-center mb-10 md:mb-16 space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <Trophy size={80} className="text-brand-accent animate-bounce-short" />
          </div>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brand-accent via-yellow-200 to-brand-accent font-serif uppercase tracking-widest leading-tight">
          Die Sieger
        </h1>
        <p className="text-purple-200 text-lg md:text-xl font-medium italic">Niemand ist perfekt - aber ihr wart nah dran!</p>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-8 md:gap-12">
        
        {/* LEADERBOARD BEREICH */}
        <div className="flex-1 w-full order-2 lg:order-1">
          {/* Podium - Responsive Layout - Added mt-6 md:mt-16 to prevent crown overlap */}
          <div className="grid grid-cols-2 md:flex md:flex-row md:items-end md:justify-center gap-4 md:gap-0 mb-16 md:h-96 mt-6 md:mt-16">
            
            {/* 2nd Place */}
            {second && (
              <div className="order-2 md:order-1 flex flex-col items-center w-full md:w-48 animate-fade-in-up mt-8 md:mt-0" style={{ animationDelay: '200ms' }}>
                <div className="mb-4 text-center">
                  <div className="flex justify-center mb-2">
                     <Avatar avatar={second.avatar} name={second.name} size="xl" className="border-4 border-gray-300 shadow-lg" />
                  </div>
                  <p className="font-bold text-lg mt-1 truncate max-w-[150px]">{second.name}</p>
                  <p className="text-sm text-purple-300 font-bold">{second.score} Pkt.</p>
                </div>
                <div className="w-full bg-gradient-to-t from-gray-700 to-gray-500 rounded-t-2xl h-24 md:h-32 flex items-center justify-center border-t-4 border-gray-400 shadow-lg">
                  <span className="text-4xl md:text-5xl font-black text-gray-800 opacity-50">2</span>
                </div>
              </div>
            )}

            {/* 1st Place */}
            {first && (
              <div className="order-1 col-span-2 md:col-span-1 md:order-2 flex flex-col items-center w-full md:w-56 z-10 animate-fade-in-up">
                <div className="mb-4 text-center">
                  <div className="relative flex justify-center">
                    <Crown size={32} className="absolute -top-6 text-yellow-400 animate-bounce-short" />
                    <Avatar avatar={first.avatar} name={first.name} size="2xl" className="border-4 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)] mb-2" />
                  </div>
                  <p className="font-black text-2xl mt-1 text-white truncate max-w-[200px] drop-shadow-md">{first.name}</p>
                  <p className="text-lg text-brand-accent font-black">{first.score} Pkt.</p>
                </div>
                <div className="w-full bg-gradient-to-t from-yellow-700 via-yellow-500 to-yellow-400 rounded-t-2xl h-32 md:h-48 flex items-center justify-center border-t-4 border-yellow-300 shadow-[0_-10px_40px_rgba(245,158,11,0.3)]">
                  <span className="text-6xl md:text-7xl font-black text-yellow-900 opacity-50">1</span>
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {third && (
              <div className="order-3 md:order-3 flex flex-col items-center w-full md:w-48 animate-fade-in-up mt-8 md:mt-0" style={{ animationDelay: '400ms' }}>
                <div className="mb-4 text-center">
                  <div className="flex justify-center mb-2">
                     <Avatar avatar={third.avatar} name={third.name} size="xl" className="border-4 border-amber-600 shadow-lg" />
                  </div>
                  <p className="font-bold text-lg mt-1 truncate max-w-[150px]">{third.name}</p>
                  <p className="text-sm text-purple-300 font-bold">{third.score} Pkt.</p>
                </div>
                <div className="w-full bg-gradient-to-t from-amber-800 to-amber-600 rounded-t-2xl h-16 md:h-24 flex items-center justify-center border-t-4 border-amber-500 shadow-lg">
                  <span className="text-4xl md:text-5xl font-black text-amber-900 opacity-50">3</span>
                </div>
              </div>
            )}
          </div>

          {/* Rest of players */}
          {sorted.length > 3 && (
            <div className="max-w-md mx-auto bg-white/5 rounded-2xl p-6 border border-white/10 mb-12">
              <h3 className="text-center text-purple-200 font-bold uppercase tracking-widest text-sm mb-4">Weitere Platzierungen</h3>
              <div className="space-y-2">
                {sorted.slice(3).map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                       <div className="w-6 text-center text-xs text-white/50 font-bold">{i + 4}.</div>
                       <Avatar avatar={p.avatar} name={p.name} size="sm" />
                       <span className="text-gray-300 font-medium">{p.name}</span>
                    </div>
                    <span className="font-bold">{p.score} <span className="text-[10px] text-gray-500">Pkt.</span></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* TROLL TORBEN SIDE PANEL */}
        {finalRoast && heckler && (
          <div className="w-full lg:w-80 order-1 lg:order-2 flex-shrink-0 animate-fade-in-right lg:sticky lg:top-8" style={{ animationDelay: '800ms' }}>
             <div className="relative bg-pink-900/40 border-2 border-pink-500 p-6 rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.3)] rotate-1 hover:rotate-0 transition-transform duration-500">
               <div className="absolute -top-10 left-1/2 -translate-x-1/2 lg:-left-6 lg:translate-x-0">
                 <div className="relative">
                   <Avatar avatar={heckler.avatar} name={heckler.name} size="2xl" className="border-4 border-pink-400 shadow-2xl" />
                   <div className="absolute -bottom-2 -right-2 bg-pink-500 text-white rounded-full p-2 border-2 border-pink-300 animate-bounce">
                      <Ghost size={20} />
                   </div>
                 </div>
               </div>
               <div className="pt-24 lg:pt-16 pb-2 text-center lg:text-left">
                  <h3 className="font-bold text-pink-400 uppercase tracking-widest text-xs mb-3 flex items-center justify-center lg:justify-start gap-2 border-b border-pink-500/30 pb-2">
                     Kommentar von der Seitenlinie
                  </h3>
                  <p className="text-xl font-serif italic text-white leading-relaxed drop-shadow-md">
                    "{finalRoast}"
                  </p>
                  <p className="text-[10px] text-pink-300/60 mt-4 text-right">- {heckler.name} (hat nicht mitgespielt)</p>
               </div>
             </div>
          </div>
        )}

      </div>

      {isHost && (
        <div className="flex justify-center mt-12">
          <Button onClick={onReset} className="px-10 h-14 flex items-center gap-3">
            <RotateCcw size={20} />
            Neues Spiel starten
          </Button>
        </div>
      )}
    </div>
  );
};
