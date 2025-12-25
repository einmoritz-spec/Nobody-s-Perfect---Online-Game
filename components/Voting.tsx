
import React, { useState } from 'react';
import { Player, Answer, PlayerId } from '../types';
import { Button } from './ui/Button';
import { Avatar } from './ui/Avatar';
import { Card } from './ui/Card';
import { Loader2, Info, Eye } from 'lucide-react';

interface VotingProps {
  player: Player;
  question: string;
  answers: Answer[];
  onSubmitVote: (answerId: string) => void;
  hasVoted: boolean;
  isGameMaster?: boolean;
  votes?: Record<PlayerId, string>;
  players?: Player[];
}

export const Voting: React.FC<VotingProps> = ({ player, question, answers, onSubmitVote, hasVoted, isGameMaster, votes, players }) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSubmit = () => {
    if (selectedId) {
      onSubmitVote(selectedId);
      setSelectedId(null);
    }
  };

  if (isGameMaster) {
    return (
       <div className="max-w-6xl mx-auto animate-fade-in">
       <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-serif text-white">Abstimmungsphase</h2>
        <p className="text-purple-300 text-sm mt-1 flex items-center justify-center gap-1">
          <Eye size={14} /> Du bist Spielleiter. Sieh zu, wie sie verzweifeln!
        </p>
      </div>

      <div className="bg-purple-950/60 border border-purple-700/50 rounded-xl p-5 mb-8 text-center shadow-lg max-w-3xl mx-auto">
        <p className="text-sm text-purple-300 uppercase tracking-widest mb-2 font-bold italic">FRAGE</p>
        <p className="text-2xl font-serif">{question}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {answers.map((ans, idx) => {
            const voters = votes && players 
                ? Object.entries(votes)
                    .filter(([_, aid]) => aid === ans.id)
                    .map(([pid]) => players.find(p => p.id === pid))
                    .filter(p => p) 
                : [];

            return (
              <div
                key={ans.id}
                className="relative p-5 rounded-xl text-left bg-white/5 border border-white/10 text-gray-100 opacity-90 transition-all flex flex-col h-full"
              >
                <div className="flex items-start gap-4 mb-2 flex-1">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 border-white/30 text-white/50">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-lg leading-snug">{ans.text}</span>
                </div>
                
                {/* Live Votes Visualization for GM */}
                {voters.length > 0 && (
                   <div className="flex flex-wrap gap-1 pl-12 mt-auto pt-2 border-t border-white/5">
                      {voters.map((v) => (
                          <div key={v!.id} className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-full text-[10px] text-gray-300">
                             <Avatar avatar={v!.avatar} size="xs" />
                             {v!.name}
                          </div>
                      ))}
                   </div>
                )}
              </div>
            );
        })}
      </div>
      <div className="text-center animate-pulse text-purple-200">
        Warte auf Stimmen der Spieler...
      </div>
    </div>
    );
  }

  if (hasVoted) {
     return (
      <div className="max-w-md mx-auto animate-fade-in text-center pt-10">
        <h2 className="text-3xl font-bold text-white mb-4">Wahl gespeichert</h2>
        <p className="text-purple-200 flex items-center justify-center gap-2">
          <Loader2 className="animate-spin" />
          Warte auf die Auflösung...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
       <div className="text-center mb-6">
        <h2 className="text-2xl font-bold font-serif text-white">Wähle die richtige Antwort</h2>
        <p className="text-purple-300 text-sm mt-1 flex items-center justify-center gap-1">
          <Info size={14} /> Finde die Wahrheit unter den Lügen!
        </p>
      </div>

      <div className="bg-purple-950/60 border border-purple-700/50 rounded-xl p-5 mb-8 text-center shadow-lg max-w-3xl mx-auto">
        <p className="text-sm text-purple-300 uppercase tracking-widest mb-2 font-bold italic">FRAGE</p>
        <p className="text-2xl font-serif">{question}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-24">
        {answers.map((ans, idx) => (
          <button
            key={ans.id}
            onClick={() => setSelectedId(ans.id)}
            className={`
              relative p-6 rounded-xl text-left transition-all duration-200 border-2 h-full flex flex-col
              ${selectedId === ans.id 
                ? 'bg-brand-accent text-brand-dark border-brand-accent shadow-[0_0_20px_rgba(245,158,11,0.4)] scale-[1.02] z-10' 
                : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/30 text-gray-100'}
            `}
          >
            <div className="flex items-start gap-4">
              <div className={`
                flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2
                ${selectedId === ans.id ? 'border-brand-dark text-brand-dark' : 'border-white/30 text-white/50'}
              `}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="text-lg leading-snug font-medium">{ans.text}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="fixed bottom-6 left-0 right-0 px-6 max-w-xl mx-auto z-10">
        <Button 
          onClick={handleSubmit} 
          disabled={!selectedId} 
          fullWidth
          className="shadow-2xl h-16 text-xl"
        >
          Auswahl bestätigen
        </Button>
      </div>
    </div>
  );
};
