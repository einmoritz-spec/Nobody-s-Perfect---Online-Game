import React, { useState } from 'react';
import { Player } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { PenTool, Loader2, Check } from 'lucide-react';

interface PlayerInputProps {
  player: Player;
  question: string;
  onSubmit: (answer: string) => void;
  hasSubmitted: boolean;
}

export const PlayerInput: React.FC<PlayerInputProps> = ({ player, question, onSubmit, hasSubmitted }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer.trim());
    }
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

  return (
    <div className="max-w-lg mx-auto animate-fade-in">
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
            <label className="flex items-center gap-2 text-sm font-medium text-white">
              <PenTool size={16} />
              Deine Antwort
            </label>
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