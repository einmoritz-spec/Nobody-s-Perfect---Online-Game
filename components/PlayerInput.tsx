
import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PenTool, Loader2, Check, Timer } from 'lucide-react';

interface PlayerInputProps {
  player: Player;
  question: string;
  onSubmit: (answer: string) => void;
  hasSubmitted: boolean;
  timerEndTime: number | null;
  timerTotal: number | null;
}

export const PlayerInput: React.FC<PlayerInputProps> = ({ player, question, onSubmit, hasSubmitted, timerEndTime, timerTotal }) => {
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Timer Effect
  useEffect(() => {
    if (!timerEndTime || hasSubmitted) {
      setTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((timerEndTime - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        // Auto-Submit if time runs out. If text exists, use it, else "Keine Abgabe"
        const finalAnswer = answer.trim() || "Keine Abgabe";
        onSubmit(finalAnswer);
      }
    }, 100); // 100ms for smoother bar

    return () => clearInterval(interval);
  }, [timerEndTime, hasSubmitted, answer, onSubmit]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer.trim());
    }
  };

  const getProgressColor = (percent: number) => {
    if (percent > 60) return 'bg-green-500';
    if (percent > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (hasSubmitted) {
    return (
      <div className="max-w-md mx-auto animate-fade-in text-center pt-10">
        <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ring-4 ring-green-500/30">
           <Check size={40} className="text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Antwort eingereicht!</h2>
        <p className="text-purple-200 flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" />
          Warte auf die anderen Spieler...
        </p>
      </div>
    );
  }

  // Calculate progress percentage
  let progressPercentage = 100;
  if (timerTotal && timeLeft !== null) {
      // Calculate more precise time left for smooth bar
      const now = Date.now();
      const end = timerEndTime!;
      const totalMs = timerTotal * 1000;
      const leftMs = Math.max(0, end - now);
      progressPercentage = (leftMs / totalMs) * 100;
  }

  return (
    <div className="max-w-lg mx-auto animate-fade-in pb-24">
      <div className="text-center mb-8">
        <span className="inline-block px-3 py-1 bg-purple-800 rounded-full text-xs font-semibold tracking-wider uppercase mb-2">
          Kreativ werden
        </span>
        <h2 className="text-3xl font-bold font-serif text-brand-accent">{player.name}</h2>
        <p className="text-gray-300">Erfinde eine Antwort!</p>
      </div>

      <Card>
        <div className="mb-8 p-4 bg-purple-950/60 rounded-xl border border-purple-700/50">
          <p className="text-sm text-purple-300 mb-1 uppercase tracking-wide">Die Frage:</p>
          <p className="text-xl font-medium leading-relaxed">{question}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-medium text-white">
                <label className="flex items-center gap-2">
                  <PenTool size={16} />
                  Deine Antwort
                </label>
                {timeLeft !== null && (
                  <span className={`flex items-center gap-1 font-mono font-bold ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-brand-accent'}`}>
                     <Timer size={14} /> {timeLeft}s
                  </span>
                )}
            </div>

            {/* Progress Bar */}
            {timerTotal && timeLeft !== null && (
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                    <div 
                        className={`h-full transition-all duration-200 ease-linear ${getProgressColor(progressPercentage)}`} 
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
            )}

            <textarea
              required
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Klingt absolut glaubwürdig..."
              className="w-full px-4 py-3 rounded-xl bg-purple-950/50 border border-purple-500 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-brand-accent min-h-[120px]"
            />
            <p className="text-xs text-gray-400">
              Versuche so zu klingen wie das Lexikon!
            </p>
          </div>

          <Button type="submit" fullWidth>
            Absenden
          </Button>
        </form>
      </Card>
    </div>
  );
};
