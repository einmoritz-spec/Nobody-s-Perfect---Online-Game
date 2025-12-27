
import React, { useState, useRef, useEffect } from 'react';
import { Player, Answer, PlayerId, GameMode } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { Trophy, ArrowRight, Check, Skull, Medal, Flag, Crown, MousePointer2, Lock, Sparkles, BookOpen, Scroll, X, Save, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { HP_QUESTIONS_EASY, HP_QUESTIONS_HARD } from '../questions';
import html2canvas from 'html2canvas';

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
  roastData?: {
    targetName: string;
    botName: string;
    text: string;
    answerId: string;
  } | null;
  isHarryPotterMode?: boolean;
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
  roastData,
  isHarryPotterMode
}) => {
  const answerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const roastRef = useRef<HTMLDivElement | null>(null);
  const roastContentRef = useRef<HTMLDivElement | null>(null); // Ref speziell für den Inhalt der Sprechblase
  
  // State für das Wegklicken des Popups
  const [isFactDismissed, setIsFactDismissed] = useState(false);
  const [isSavingRoast, setIsSavingRoast] = useState(false);

  // Helper für Darstellung
  const botRoaster = roastData ? players.find(p => p.name === roastData.botName) : null;
  const showRoast = !!(roastData && botRoaster && revealedAnswerIds.includes(roastData.answerId));
  
  // Refs zum Tracking des Scroll-Status
  const scrolledAnswerIdsRef = useRef<Set<string>>(new Set());
  const hasScrolledToRoastRef = useRef(false);

  // HP Facts Logic: Suche in beiden Pools
  const hpFact = isHarryPotterMode 
      ? [...HP_QUESTIONS_HARD, ...HP_QUESTIONS_EASY].find(i => i.q === question) 
      : null;

  const correctAnswerId = answers.find(a => a.isCorrect)?.id;
  const showHpFact = !!(hpFact && correctAnswerId && revealedAnswerIds.includes(correctAnswerId) && hpFact.info);

  // Reset dismissed state wenn sich die Frage ändert
  useEffect(() => {
      setIsFactDismissed(false);
  }, [question]);

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
          // MAGISCHER EFFEKT (STERNE)
          confetti({
            particleCount: 80,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#C0C0C0', '#ffffff'], // Gold, Silver, White
            shapes: ['star'],
            gravity: 0.5,
            scalar: 1.2,
            drift: 0,
            ticks: 200,
            startVelocity: 30
          });
      } else {
          // STANDARD EFFEKT
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

  const handleSaveRoast = async () => {
    if (!roastRef.current || isSavingRoast) return;
    setIsSavingRoast(true);
    try {
        const canvas = await html2canvas(roastRef.current, {
            backgroundColor: null, // Transparent background to keep bubble shape
            scale: 2, // Better resolution
            useCORS: true,
            // WICHTIG: Klonen, um den Save-Button im Bild zu entfernen und Schatten zu bereinigen
            onclone: (clonedDoc) => {
                // Button entfernen
                const btn = clonedDoc.getElementById('roast-save-btn');
                if (btn) btn.style.display = 'none';
                
                // Schatten entfernen (verursacht den "grauen Kasten" bei Transparenz)
                const bubble = clonedDoc.getElementById('roast-content-bubble');
                if (bubble) {
                    bubble.classList.remove('shadow-2xl');
                    bubble.style.boxShadow = 'none';
                }
                
                // Avatar Schatten entfernen
                const avatarContainer = clonedDoc.querySelector('.roast-avatar-container');
                if (avatarContainer) {
                    // Falls die Avatar Komponente Schatten hat, versuchen wir sie hier zu resetten
                    const imgDiv = avatarContainer.querySelector('div');
                    if (imgDiv) {
                        imgDiv.classList.remove('shadow-xl');
                        imgDiv.style.boxShadow = 'none';
                    }
                }

                // FIX: Rosa Hintergrund-Boxen entfernen, um Artefakte und Verschiebungen zu vermeiden
                
                // 1. Text-Highlight unten ("der peinlichste Squib...")
                const highlights = clonedDoc.querySelectorAll('strong');
                highlights.forEach((el: any) => {
                    el.style.backgroundColor = 'transparent'; // Mache Background transparent
                    el.style.padding = '0';
                    // Textfarbe bleibt erhalten
                });

                // 2. Namens-Tag oben ("TROLL TORBEN")
                const nameTags = clonedDoc.querySelectorAll('.roast-name-tag');
                nameTags.forEach((el: any) => {
                    el.style.backgroundColor = 'transparent'; // Mache Background transparent
                    el.style.paddingLeft = '0';
                    el.style.paddingRight = '0';
                    // Textfarbe bleibt erhalten
                });
            }
        });
        
        const link = document.createElement('a');
        const targetName = roastData?.targetName || 'Jemand';
        // Dateiname angepasst: "Spielername wird geroastet.png"
        link.download = `${targetName} wird geroastet.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (e) {
        console.error("Screenshot failed", e);
        alert("Speichern fehlgeschlagen.");
    } finally {
        setIsSavingRoast(false);
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

  // Helper zum Rendern von Fettgedrucktem Text
  const renderRoastText = (text: string) => {
      // Split bei **...**
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Klasse angepasst für saubereren Look
          return <strong key={i} className="font-black text-pink-700 bg-pink-100/50 px-1 rounded">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
  };


  return (
    <div className="max-w-6xl mx-auto animate-fade-in space-y-6 pb-48 px-2 relative">
      <div className="text-center space-y-2 pt-4">
        <h2 className="text-3xl md:text-4xl font-serif text-brand-accent drop-shadow-lg uppercase tracking-wider">Auflösung</h2>
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

      <div className="bg-gradient-to-br from-brand-primary to-purple-950 rounded-2xl p-5 border border-brand-accent/20 shadow-xl max-w-4xl mx-auto">
        <p className="text-[10px] text-brand-accent uppercase tracking-widest mb-1 text-center font-bold opacity-70">Die Frage</p>
        <p className="text-xl md:text-2xl font-serif text-center leading-tight">{question}</p>
      </div>

      {showRoast && botRoaster && (
          <div ref={roastRef} className="my-6 flex gap-4 items-start animate-fade-in-up z-30 relative scroll-mt-20 max-w-2xl mx-auto p-2">
            <div className="flex-shrink-0 pt-2 roast-avatar-container">
                <Avatar avatar={botRoaster.avatar} name={botRoaster.name} size="lg" className="border-4 border-pink-500 shadow-xl" />
            </div>
            
            {/* Sprechblase */}
            <div 
                id="roast-content-bubble"
                ref={roastContentRef}
                className="relative bg-white text-brand-dark p-5 rounded-2xl shadow-2xl flex-1 border-2 border-pink-500 
                before:content-[''] before:absolute before:top-6 before:-left-[12px] before:w-0 before:h-0 
                before:border-t-[10px] before:border-t-transparent before:border-r-[12px] before:border-r-pink-500 before:border-b-[10px] before:border-b-transparent"
            >
                {/* Weißes Dreieck zum Überdecken der Linie für nahtlosen Look, angepasst für vertikale Zentrierung und Rahmenstärke */}
                <div className="absolute top-[26px] -left-[10px] w-0 h-0 border-t-[8px] border-t-transparent border-r-[10px] border-r-white border-b-[8px] border-b-transparent z-10"></div>
                
                {/* Save Button absolute in top right of bubble */}
                <button 
                    id="roast-save-btn"
                    onClick={handleSaveRoast}
                    className="absolute top-2 right-2 p-1.5 bg-gray-100 hover:bg-pink-100 text-pink-500 rounded-full transition-colors shadow-sm"
                    title="Als Bild speichern"
                    disabled={isSavingRoast}
                >
                    {isSavingRoast ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                </button>

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold text-xs mb-3 text-pink-600 uppercase tracking-wide pr-8">
                  {/* Added class 'roast-name-tag' for selection in html2canvas */}
                  <span className="roast-name-tag bg-pink-100 px-2 py-1 rounded-md whitespace-nowrap">{botRoaster.name}</span>
                  <span>roastet {roastData!.targetName}</span>
                </div>
                
                <p className="text-lg font-serif italic leading-relaxed text-gray-800">
                  "{renderRoastText(roastData!.text)}"
                </p>
            </div>
          </div>
      )}

      {/* HP Fun Fact Overlay */}
      {showHpFact && hpFact && !isFactDismissed && (
          <div className="fixed bottom-24 right-4 left-4 md:left-auto md:w-96 z-[60] animate-fade-in-up">
              <div className="bg-[#f5e6ca] text-[#4a0404] p-4 rounded-lg shadow-2xl border-2 border-[#8b0000] relative">
                  <div className="absolute -top-3 -left-3 bg-[#8b0000] text-[#f5e6ca] p-2 rounded-full border border-[#f5e6ca] shadow-md">
                      <Sparkles size={20} className="animate-pulse" />
                  </div>
                  
                  <button 
                    onClick={() => setIsFactDismissed(true)}
                    className="absolute top-2 right-2 p-1 hover:bg-[#8b0000]/10 rounded-full transition-colors text-[#4a0404]/60 hover:text-[#4a0404]"
                    title="Schließen"
                  >
                      <X size={18} />
                  </button>

                  <h4 className="font-serif font-bold text-lg border-b border-[#8b0000]/20 pb-1 mb-2 flex items-center gap-2 pl-6 pr-6">
                      Magisches Wissen
                  </h4>
                  {hpFact.book && (
                      <div className="flex items-start gap-2 text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
                          <BookOpen size={12} className="mt-0.5" />
                          <span>{hpFact.book}</span>
                      </div>
                  )}
                  <p className="text-sm leading-relaxed font-serif">
                      {hpFact.info}
                  </p>
                  <div className="absolute -bottom-2 -right-2 opacity-10 pointer-events-none text-[#8b0000]">
                      <Scroll size={64} />
                  </div>
              </div>
          </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {answers.map((ans) => {
          const voters = votesForAnswer[ans.id] || [];
          const author = players.find(p => p.id === ans.authorId);
          const isRevealedToPublic = revealedAnswerIds.includes(ans.id);
          const alreadyAwarded = author ? awardedBonusIds.includes(author.id) : false;
          
          return (
            <div 
              key={ans.id} 
              ref={el => { answerRefs.current[ans.id] = el }}
              className={`
                relative overflow-hidden rounded-xl border-2 transition-all duration-300 scroll-mt-24 flex flex-col
                ${isRevealedToPublic 
                  ? (ans.isCorrect ? 'bg-green-900/40 border-green-500/60' : 'bg-white/10 border-white/20 shadow-lg') 
                  : 'bg-white/5 border-white/5'}
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

              <div className={`p-4 transition-opacity duration-500 h-full flex flex-col ${(isRevealedToPublic || canSeeHidden) ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {ans.isCorrect ? (
                    <span className="bg-green-500 text-green-950 text-[10px] font-black px-2 py-0.5 rounded shadow-sm">DIE WAHRHEIT</span>
                  ) : (
                    <span className="bg-purple-600 text-white text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                      <Skull size={10} /> EIN BLUFF
                    </span>
                  )}
                  
                  {author && (
                    <span className={`text-[10px] font-bold flex items-center gap-1.5 px-2 py-0.5 rounded-md ${isRevealedToPublic ? 'text-brand-accent' : 'text-white/40'}`}>
                      <Avatar avatar={author.avatar} name={author.name} size="xs" />
                      von {author.name}
                    </span>
                  )}
                </div>

                <p className={`text-lg font-medium leading-relaxed mb-auto ${isRevealedToPublic ? 'text-white' : 'text-white/60'}`}>
                  {ans.text}
                </p>

                {!isRevealedToPublic && canSeeHidden && (
                  <div className="mt-5 pt-4 border-t border-white/10">
                    <button 
                      onClick={() => handleReveal(ans)}
                      className="w-full py-3 bg-brand-accent text-brand-dark rounded-xl font-black shadow-lg hover:bg-yellow-400 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                    >
                      <MousePointer2 size={18} />
                      Für alle aufdecken
                    </button>
                  </div>
                )}
                 
                <div className="flex flex-col gap-4 pt-4 mt-2 border-t border-white/5">
                  {voters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[9px] text-white/30 font-bold uppercase mr-1">Tipps:</span>
                      {voters.map(v => (
                        <div key={v.id} className={`pl-0 pr-3 py-0 rounded-full text-xs font-black flex items-center gap-2 border shadow-sm ${v.id === ans.authorId ? 'bg-red-500/20 border-red-500/40 text-red-200' : 'bg-white/10 text-purple-100 border-white/20 backdrop-blur-sm'}`}>
                          <Avatar avatar={v.avatar} name={v.name} size="sm" className="!w-12 !h-12 !border-2" />
                          <span className="truncate max-w-[80px] sm:max-w-[120px] leading-none">{v.name}</span>
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
        <Card title="Zwischenstand" className="mt-8 animate-fade-in-up border-brand-accent/20 shadow-2xl">
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
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-brand-dark/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
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
                <button onClick={onNextRound} className="flex-1 px-6 py-3 rounded-xl font-bold transition-all duration-200 shadow-2xl h-14 text-lg border-b-4 bg-brand-accent text-brand-dark hover:bg-yellow-400 border-yellow-700 flex items-center justify-center gap-2">
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
