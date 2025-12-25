
import React, { useState, useRef, useEffect } from 'react';
import { Player, Answer, PlayerId, GameMode } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { Trophy, ArrowRight, Check, Skull, Medal, Flag, Crown, MousePointer2, Lock, Sparkles, Wand2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ResolutionProps {
  localPlayerId: string | null;
  question: string;
  correctAnswerText: string;
  answers: Answer[];
  players: Player[];
  votes: Record<PlayerId, string>;
  onNextRound: () => void;
  onRevealAnswer: (answerId: string) => void;
  onAwardPoint: (playerId: string) => void;
  onEndGame: () => void;
  onRemovePlayer?: (playerId: string) => void;
  isHost: boolean;
  revealedAnswerIds: string[];
  gameMasterId: string | null;
  awardedBonusIds: string[];
  isAiGameMasterMode?: boolean;
  gameMode?: GameMode;
  isHarryPotterMode?: boolean;
  roastData?: {
    targetName: string;
    botName: string;
    text: string;
    answerId: string;
  } | null;
}

export const Resolution: React.FC<ResolutionProps> = ({ 
  localPlayerId,
  question, 
  correctAnswerText, 
  answers, 
  players, 
  votes, 
  onNextRound,
  onRevealAnswer,
  onAwardPoint,
  onEndGame,
  onRemovePlayer,
  isHost,
  revealedAnswerIds = [],
  gameMasterId,
  awardedBonusIds = [],
  isAiGameMasterMode = false,
  gameMode = 'classic',
  isHarryPotterMode = false,
  roastData
}) => {
  const answerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const roastRef = useRef<HTMLDivElement | null>(null);

  // Helper für Darstellung
  const botRoaster = roastData ? players.find(p => p.name === roastData.botName) : null;
  const showRoast = !!(roastData && botRoaster && revealedAnswerIds.includes(roastData.answerId));
  
  // Refs zum Tracking des Scroll-Status
  const scrolledAnswerIdsRef = useRef<Set<string>>(new Set());
  const hasScrolledToRoastRef = useRef(false);

  const getRoundSummary = () => {
    const votesForAnswer: Record<string, Player[]> = {};
    answers.forEach(a => votesForAnswer[a.id] = []);

    Object.entries(votes).forEach(([voterId, answerId]) => {
      const voter = players.find(p => p.id === voterId);
      const aid = answerId as string;
      if (voter && votesForAnswer[aid]) {
        votesForAnswer[aid].push(voter);
      }
    });

    return { votesForAnswer };
  };

  const { votesForAnswer } = getRoundSummary();
  
  const visiblePlayers = players.filter(p => {
    if (p.isHeckler) return false;
    if (gameMode === 'host' && p.isHost) return false;
    return true;
  });
  
  const sortedPlayers = [...visiblePlayers].sort((a, b) => b.score - a.score);
  const allRevealed = revealedAnswerIds.length >= answers.length;
  
  const gmPlayer = players.find(p => p.id === gameMasterId);
  const isBotGM = gmPlayer?.isBot;
  const isCurrentGM = localPlayerId === gameMasterId;
  const isAiGM = gameMasterId === 'AI_GM_HOST';

  // Host darf steuern (weiter, aufdecken), wenn er GM ist ODER wenn eine KI/Bot GM ist.
  const canControlFlow = isCurrentGM || (isHost && (isAiGM || isBotGM));
  
  // Host darf "versteckte" Dinge sehen (Buttons für Bonus/Aufdecken), wenn er GM ist ODER wenn eine KI/Bot GM ist.
  const canSeeHidden = isCurrentGM || (isHost && (isAiGM || isBotGM));

  const handleReveal = (ans: Answer) => {
    onRevealAnswer(ans.id);
    
    if (ans.isCorrect) {
      if (isHarryPotterMode) {
          // MAGISCHER EFFEKT: Goldene Sterne und Funken
          const count = 200;
          const defaults = {
            origin: { y: 0.7 }
          };

          const fire = (particleRatio: number, opts: any) => {
            confetti({
              ...defaults,
              ...opts,
              particleCount: Math.floor(count * particleRatio)
            });
          }

          fire(0.25, { spread: 26, startVelocity: 55, shapes: ['star'], colors: ['#FFD700', '#FFFFFF'] });
          fire(0.2, { spread: 60, shapes: ['star'], colors: ['#FFD700', '#C0C0C0'] });
          fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8, shapes: ['star'], colors: ['#FFD700', '#FFA500'] });
          fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2, shapes: ['circle'], colors: ['#FFD700'] });
          fire(0.1, { spread: 120, startVelocity: 45, shapes: ['star'], colors: ['#B8860B'] });
      } else {
          // STANDARD EFFEKT: Buntes Konfetti
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#fbbf24', '#ffffff']
          });
      }
    }
  };

  const handleRevealNext = () => {
    const nextUnrevealed = answers.find(a => !revealedAnswerIds.includes(a.id));
    if (nextUnrevealed) {
        handleReveal(nextUnrevealed);
    }
  };

  const showBigRevealButton = !allRevealed && canControlFlow;

  // --- AUTO SCROLL EFFECTS ---
  
  useEffect(() => {
    const latestId = revealedAnswerIds[revealedAnswerIds.length - 1];
    
    if (latestId && !scrolledAnswerIdsRef.current.has(latestId)) {
        scrolledAnswerIdsRef.current.add(latestId);
        if (answerRefs.current[latestId]) {
           setTimeout(() => {
              answerRefs.current[latestId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
           }, 300);
        }
    }

    revealedAnswerIds.forEach(id => scrolledAnswerIdsRef.current.add(id));
  }, [revealedAnswerIds]);

  useEffect(() => {
      if (showRoast && !hasScrolledToRoastRef.current) {
          hasScrolledToRoastRef.current = true;
          if (roastRef.current) {
              setTimeout(() => {
                 roastRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 300);
          }
      }
  }, [showRoast]);


  return (
    <div className="max-w-3xl mx-auto animate-fade-in space-y-6 pb-48 px-2">
      <div className="text-center space-y-2 pt-4">
        <h2 className={`text-3xl md:text-4xl font-serif drop-shadow-lg uppercase tracking-wider ${isHarryPotterMode ? 'text-amber-400' : 'text-brand-accent'}`}>
            {isHarryPotterMode && <Wand2 className="inline-block mr-2 mb-1" />}
            Auflösung
            {isHarryPotterMode && <Wand2 className="inline-block ml-2 mb-1 transform scale-x-[-1]" />}
        </h2>
        {isCurrentGM ? (
          <div className="bg-yellow-500/20 border border-yellow-500/50 inline-flex items-center gap-2 px-4 py-1 rounded-full text-yellow-200 text-xs font-bold">
            <Crown size={14} /> Du bist der Spielleiter
          </div>
        ) : (isAiGM || isBotGM) ? (
          <div className="bg-cyan-500/20 border border-cyan-500/50 inline-flex items-center gap-2 px-4 py-1 rounded-full text-cyan-200 text-xs font-bold">
             <Sparkles size={14} /> {isAiGM ? "KI-Monster" : gmPlayer?.name} deckt auf...
          </div>
        ) : (
          <p className="text-sm text-purple-200">
            Spielleiter <span className="text-brand-accent font-bold">{gmPlayer?.name}</span> deckt gerade auf...
          </p>
        )}
      </div>

      <div className={`rounded-2xl p-5 border shadow-xl ${isHarryPotterMode ? 'bg-indigo-950/60 backdrop-blur-md border-amber-500/40 bg-[url("https://www.transparenttextures.com/patterns/dark-matter.png")]' : 'bg-gradient-to-br from-brand-primary to-purple-950 border-brand-accent/20'}`}>
        <p className={`text-[10px] uppercase tracking-widest mb-1 text-center font-bold opacity-70 ${isHarryPotterMode ? 'text-amber-300' : 'text-brand-accent'}`}>Die Frage</p>
        <p className={`text-xl md:text-2xl font-serif text-center leading-tight ${isHarryPotterMode ? 'text-amber-50' : ''}`}>{question}</p>
      </div>

      {showRoast && botRoaster && (
          <div ref={roastRef} className="my-4 flex gap-4 items-start animate-fade-in-up z-30 relative scroll-mt-20">
            <div className="flex-shrink-0">
                <Avatar avatar={botRoaster.avatar} name={botRoaster.name} size="lg" className="border-4 border-pink-500 shadow-xl" />
            </div>
            <div className="relative bg-white text-brand-dark p-4 rounded-2xl rounded-tl-none shadow-2xl flex-1 border-2 border-pink-500">
                <div className="absolute -top-3 -right-3 bg-pink-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-widest transform rotate-6 animate-pulse">
                  Troll-Alarm!
                </div>
                <p className="font-bold text-sm mb-1 text-pink-600 uppercase tracking-wide">
                  {botRoaster.name} roastet {roastData!.targetName}:
                </p>
                <p className="text-lg font-serif italic leading-tight">
                  "{roastData!.text}"
                </p>
            </div>
          </div>
      )}

      <div className="grid gap-4">
        {answers.map((ans) => {
          const voters = votesForAnswer[ans.id] || [];
          const author = players.find(p => p.id === ans.authorId);
          const isRevealedToPublic = revealedAnswerIds.includes(ans.id);
          const alreadyAwarded = author ? awardedBonusIds.includes(author.id) : false;
          
          // Styling Logik für Harry Potter Modus vs Normal
          let bgClass = 'bg-white/5 border-white/5'; // Default hidden
          if (isRevealedToPublic) {
              if (ans.isCorrect) {
                  bgClass = isHarryPotterMode 
                    ? 'bg-amber-900/60 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.5)]' // HP Correct
                    : 'bg-green-900/40 border-green-500/60'; // Classic Correct
              } else {
                  bgClass = 'bg-white/10 border-white/20 shadow-lg'; // Reveal Bluff
              }
          }

          return (
            <div 
              key={ans.id} 
              ref={el => { answerRefs.current[ans.id] = el }}
              className={`
                relative overflow-hidden rounded-xl border-2 transition-all duration-300 scroll-mt-24
                ${bgClass}
              `}
            >
              {!isRevealedToPublic && !canSeeHidden && (
                <div className="absolute inset-0 z-20 backdrop-blur-md bg-brand-dark/40 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-white/30">
                    <Lock size={24} />
                    <span className="text-xs font-bold uppercase tracking-widest">Geheimnis...</span>
                  </div>
                </div>
              )}

              <div className={`p-4 transition-opacity duration-500 ${(isRevealedToPublic || canSeeHidden) ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {ans.isCorrect ? (
                    isHarryPotterMode ? (
                        <span className="bg-amber-500 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded shadow-sm flex items-center gap-1 border border-amber-300">
                            <Sparkles size={10} /> MAGISCHE WAHRHEIT
                        </span>
                    ) : (
                        <span className="bg-green-500 text-green-950 text-[10px] font-black px-2 py-0.5 rounded shadow-sm">DIE WAHRHEIT</span>
                    )
                  ) : (
                    <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                      <Skull size={10} /> EIN BLUFF
                    </span>
                  )}
                  
                  {author && (
                    <span className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-md ${isRevealedToPublic ? (isHarryPotterMode && ans.isCorrect ? 'text-amber-200' : 'text-brand-accent') : 'text-white/40'}`}>
                      <Avatar avatar={author.avatar} name={author.name} size="xs" />
                      von {author.name}
                    </span>
                  )}
                </div>

                <p className={`text-lg md:text-xl font-medium leading-relaxed font-serif ${isRevealedToPublic ? 'text-white' : 'text-white/60'} ${isHarryPotterMode && ans.isCorrect && isRevealedToPublic ? 'text-amber-50 drop-shadow-sm' : ''}`}>
                  {ans.text}
                </p>

                {!isRevealedToPublic && canSeeHidden && (
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <button 
                      onClick={() => handleReveal(ans)}
                      className={`w-full py-3 text-brand-dark rounded-xl font-black shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide ${isHarryPotterMode ? 'bg-amber-500' : 'bg-brand-accent'}`}
                    >
                      {isHarryPotterMode ? <Wand2 size={18} /> : <MousePointer2 size={18} />}
                      Für alle aufdecken
                    </button>
                  </div>
                )}
                 
                <div className="flex flex-col gap-4 pt-4 mt-2 border-t border-white/5">
                  {voters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] text-white/30 font-bold uppercase mr-1">Tipps:</span>
                      {voters.map(v => (
                        <div key={v.id} className={`px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 border shadow-sm ${v.id === ans.authorId ? 'bg-red-500/20 border-red-500/40 text-red-200' : 'bg-white text-brand-dark border-white'}`}>
                          <Avatar avatar={v.avatar} name={v.name} size="xs" />
                          {v.name}
                        </div>
                      ))}
                    </div>
                  )}

                  {canSeeHidden && isRevealedToPublic && !ans.isCorrect && author && (
                    <div className="flex justify-end w-full">
                      {alreadyAwarded ? (
                        <div className="w-full sm:w-auto flex justify-center items-center gap-1.5 text-[10px] bg-green-500 text-green-950 px-3 py-2 rounded-lg font-black shadow-inner">
                          <Check size={14} /> BONUS GEGEBEN
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onAwardPoint(author.id); }}
                          className="w-full sm:w-auto flex justify-center items-center gap-2 text-xs bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-black px-4 py-3 rounded-xl font-black transition-all shadow-lg border-b-2 border-yellow-700"
                        >
                          <Medal size={16} /> BONUS GEBEN (+1)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {allRevealed && (
        <Card title="Zwischenstand" className={`mt-8 animate-fade-in-up border-brand-accent/20 shadow-2xl ${isHarryPotterMode ? 'bg-slate-900/80' : ''}`}>
          <div className="space-y-2">
            {sortedPlayers.map((p, idx) => (
              <div key={p.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${idx === 0 ? 'bg-brand-accent/10 border-brand-accent' : 'bg-white/5 border-white/5'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-4 text-center text-[10px] font-black text-white/30">{idx + 1}.</div>
                  <Avatar avatar={p.avatar} name={p.name} size="md" />
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-bold text-sm ${idx === 0 ? 'text-yellow-400' : 'text-white'}`}>{p.name}</span>
                      {idx === 0 && <Trophy size={12} className="text-yellow-400" />}
                      {p.id === gameMasterId && <span title="Aktueller Spielleiter"><Crown size={12} className="text-brand-accent" /></span>}
                    </div>
                    <span className="text-sm font-bold text-white/60">{p.score} Punkte</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {canControlFlow && (
        <div className={`fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 backdrop-blur-xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.5)] ${isHarryPotterMode ? 'bg-slate-950/95 border-amber-900/30' : 'bg-brand-dark/95 border-white/10'}`}>
          <div className="max-w-3xl mx-auto flex flex-col gap-3">
            {showBigRevealButton && (
              <div className="animate-fade-in-up">
                <button onClick={handleRevealNext} className="w-full rounded-xl font-bold transition-all duration-200 shadow-2xl h-14 text-lg border-b-4 bg-cyan-600 hover:bg-cyan-500 border-cyan-800 text-white flex items-center justify-center gap-2">
                  <Sparkles size={20} /> Nächste Antwort aufdecken
                </button>
              </div>
            )}

            {allRevealed && (
              <div className="flex gap-2 animate-fade-in-up">
                <button onClick={onNextRound} className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-2xl h-14 text-lg border-b-4 text-brand-dark hover:brightness-110 flex items-center justify-center gap-2 ${isHarryPotterMode ? 'bg-amber-500 border-amber-700' : 'bg-brand-accent border-yellow-700 hover:bg-yellow-400'}`}>
                  Nächste Runde <ArrowRight size={20} />
                </button>
                <button onClick={onEndGame} className="px-6 py-3 rounded-xl font-bold transition-all duration-200 bg-brand-primary text-white border-2 border-brand-primary hover:border-brand-accent h-14 border-red-500/30">
                  <Flag className="text-red-400" size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
