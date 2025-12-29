
import React, { useState, useEffect, useRef } from 'react';
import { Player, AVATAR_IMAGES, HP_AVATAR_IMAGES, BotPersonality, GameMode } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Avatar } from './ui/Avatar';
import { Play, Crown, Loader2, Users, Monitor, Smartphone, Check, UserX, Lock, BrainCircuit, Baby, GraduationCap, PartyPopper, X, ToggleLeft, ToggleRight, Sparkles, Ghost, Repeat, User, HelpCircle, Wand2, ZoomIn, KeyRound } from 'lucide-react';

interface LobbyProps {
  players: Player[];
  localPlayerId: string | null;
  onJoin: (name: string, roomCode: string, avatar: string) => void;
  onCreate: (name: string, avatar: string, isSuperAdmin: boolean) => void;
  onStartGame: (mode: GameMode) => void;
  onRemovePlayer?: (playerId: string) => void;
  onUpdatePlayer?: (updates: { avatar?: string }) => void;
  onAddBot?: (personality: BotPersonality) => void;
  onToggleTrollMode?: (enable: boolean) => void;
  onToggleRules?: (show: boolean) => void;
  onToggleHPMode?: (enable: boolean) => void; // Neu
  isHost: boolean;
  roomCode?: string;
  connectionStatus: string;
  isHarryPotterMode?: boolean; // NEW: receive mode from server state
}

export const Lobby: React.FC<LobbyProps> = ({ 
  players, 
  localPlayerId, 
  onJoin, 
  onCreate,
  onStartGame, 
  onRemovePlayer,
  onUpdatePlayer,
  onAddBot,
  onToggleTrollMode,
  onToggleRules,
  onToggleHPMode,
  isHost,
  roomCode,
  connectionStatus,
  isHarryPotterMode
}) => {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [adminCode, setAdminCode] = useState(''); // Neuer State für Admin Code
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_IMAGES[0]);
  const [view, setView] = useState<'main' | 'join' | 'create'>('main');
  const [showBotModal, setShowBotModal] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [isHPMode, setIsHPMode] = useState(false);
  const [randomAvatars, setRandomAvatars] = useState<string[]>([]);
  const [randomHpAvatars, setRandomHpAvatars] = useState<string[]>([]); // New State for Random HP Selection
  
  // Neuer State für das HP Avatar Popup
  const [showHpAvatarSelection, setShowHpAvatarSelection] = useState(false);
  
  // State für Long-Press Preview
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if Troll Torben is present
  const isTrollModeActive = players.some(p => p.isHeckler);
  
  // Ref to track previous value of HP mode to detect transition to true
  const prevHPModeRef = useRef(isHarryPotterMode);

  // Sync local HP Mode State with Players State (falls vom Server kommt)
  useEffect(() => {
     if (isHarryPotterMode !== undefined) {
         setIsHPMode(isHarryPotterMode);
         
         // Logic: If mode changes from FALSE/UNDEFINED to TRUE, open the modal for EVERYONE
         if (isHarryPotterMode && !prevHPModeRef.current) {
             setShowHpAvatarSelection(true);
         }
         
         prevHPModeRef.current = isHarryPotterMode;
     }
  }, [isHarryPotterMode]);

  const toggleHP = () => {
      const newVal = !isHPMode; 
      setIsHPMode(newVal);
      onToggleHPMode?.(newVal);
  };

  // Zufällige Auswahl von Avataren initialisieren (Monsters)
  useEffect(() => {
    // Generiere Avatare, wenn wir im Setup sind ODER wenn noch keine da sind (z.B. nach Reload im Spiel)
    if (view === 'create' || view === 'join' || randomAvatars.length === 0) {
      
      // Wenn wir bereits im Main View sind und schon Avatare haben, nicht neu würfeln (verhindert Flackern)
      if (view === 'main' && randomAvatars.length > 0) return;

      const shuffled = [...AVATAR_IMAGES].sort(() => 0.5 - Math.random());
      // 9 Avatare für perfektes 3x3 Grid auf Mobile
      const selected = shuffled.slice(0, 9); 
      setRandomAvatars(selected);
      
      // Wähle automatisch den ersten der neuen Auswahl, falls der alte nicht dabei ist (nur im Setup)
      if ((view === 'create' || view === 'join') && !selected.includes(selectedAvatar)) {
        setSelectedAvatar(selected[0]);
      }
    }
  }, [view]);

  // Zufällige Auswahl von Avataren initialisieren (Harry Potter)
  useEffect(() => {
    if (randomHpAvatars.length === 0) {
        const shuffled = [...HP_AVATAR_IMAGES].sort(() => 0.5 - Math.random());
        // 9 Avatare für perfektes 3x3 Grid
        setRandomHpAvatars(shuffled.slice(0, 9));
    }
  }, []);

  // --- Long Press Logic ---
  const handlePressStart = (avatarUrl: string) => {
    pressTimer.current = setTimeout(() => {
      setPreviewAvatar(avatarUrl);
    }, 400); // Nach 400ms gedrückt halten geht die Vorschau auf
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    // WICHTIG: Vorschau NICHT schließen beim Loslassen. Nur Timer resetten.
    // Schließen erfolgt explizit über den X-Button oder Klick auf Overlay.
  };

  // --- BOT SELECTION MODAL ---
  const renderBotModal = () => {
    if (!showBotModal) return null;

    const personalities: { id: BotPersonality; name: string; icon: React.ReactNode; desc: string; color: string }[] = [
      { 
        id: 'beginner', 
        name: 'Anfänger', 
        icon: <Baby size={24} />, 
        desc: 'Gibt oft kurze oder leicht durchschaubare Antworten.', 
        color: 'bg-green-500/20 border-green-500' 
      },
      { 
        id: 'pro', 
        name: 'Profi', 
        icon: <GraduationCap size={24} />, 
        desc: 'Schreibt perfekte, glaubwürdige Lexikon-Einträge.', 
        color: 'bg-purple-500/20 border-purple-500' 
      },
      { 
        id: 'troll', 
        name: 'Troll', 
        icon: <PartyPopper size={24} />, 
        desc: 'Gibt absurde, lustige oder verwirrende Antworten.', 
        color: 'bg-pink-500/20 border-pink-500' 
      }
    ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-brand-dark border-2 border-brand-accent rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-brand-primary">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <BrainCircuit className="text-brand-accent" /> Bot konfigurieren
            </h3>
            <button onClick={() => setShowBotModal(false)} className="text-white/50 hover:text-white">
              <X size={24} />
            </button>
          </div>
          <div className="p-4 space-y-3">
            <p className="text-sm text-gray-300 mb-2">Wie soll dieser Bot spielen?</p>
            {personalities.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  onAddBot?.(p.id);
                  setShowBotModal(false);
                }}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-[1.02] text-left group ${p.color} hover:bg-opacity-40`}
              >
                <div className="p-3 bg-brand-dark rounded-full border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                  {p.icon}
                </div>
                <div>
                  <div className="font-bold text-white text-lg">{p.name}</div>
                  <div className="text-xs text-gray-300 leading-tight">{p.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // --- LOGIN VIEWS ---
  if (!localPlayerId && view === 'main') {
    return (
      <div className="max-w-md mx-auto space-y-8 animate-fade-in pt-10">
        <div className="text-center space-y-2">
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand-accent to-yellow-200 drop-shadow-sm font-serif text-center">
            Nobody's Perfect
          </h1>
          <p className="text-purple-200 text-lg md:text-2xl text-center">Online Multiplayer</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <button 
            onClick={() => setView('create')}
            className="group flex flex-col items-center p-8 bg-purple-900/40 hover:bg-brand-primary border-2 border-purple-500 hover:border-brand-accent rounded-2xl transition-all hover:scale-[1.02] shadow-xl"
          >
            <Monitor size={56} className="text-purple-300 mb-4 group-hover:text-brand-accent group-hover:animate-bounce-short transition-colors" />
            <span className="text-2xl font-bold uppercase tracking-wide text-gray-200 group-hover:text-white">Spiel erstellen</span>
          </button>

          <button 
            onClick={() => setView('join')}
            className="group flex flex-col items-center p-8 bg-purple-900/40 hover:bg-brand-primary border-2 border-purple-500 hover:border-brand-accent rounded-2xl transition-all hover:scale-[1.02] shadow-xl"
          >
            <Smartphone size={56} className="text-purple-300 mb-4 group-hover:text-brand-accent transition-colors" />
            <span className="text-2xl font-bold uppercase tracking-wide text-gray-200 group-hover:text-white">Spiel beitreten</span>
          </button>
        </div>
      </div>
    );
  }

  const renderAvatarPicker = (
    currentSelection: string, 
    onSelect: (c: string) => void, 
    takenColors: string[] = [], 
    availableAvatars: string[] = AVATAR_IMAGES,
    isLargeMode: boolean = false,
    hideLabels: boolean = false // Neuer Parameter
  ) => (
    <div className="space-y-3 relative">
      
      {/* PREVIEW OVERLAY */}
      {previewAvatar && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in p-4">
           <div className="relative">
              <button 
                onClick={() => setPreviewAvatar(null)}
                className="absolute -top-12 -right-4 sm:-right-12 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 border border-white/20 transition-all z-50"
              >
                  <X size={32} />
              </button>
              <img 
                src={previewAvatar} 
                alt="Preview" 
                className="w-full max-w-sm sm:max-w-md aspect-square object-cover rounded-full border-4 border-brand-accent shadow-[0_0_50px_rgba(245,158,11,0.5)]" 
                style={{ WebkitTouchCallout: 'none' }}
                onContextMenu={(e) => e.preventDefault()}
              />
           </div>
        </div>
      )}

      {!hideLabels && (
        <div className="flex justify-between items-center">
             <label className="text-sm font-medium text-purple-200 block">Wähle deinen {availableAvatars === HP_AVATAR_IMAGES ? 'Zauber-' : 'Monster-'}Avatar</label>
             <span className="text-[10px] text-white/40 flex items-center gap-1"><ZoomIn size={10} /> Gedrückt halten für Zoom</span>
        </div>
      )}
      
      <div className={`
        grid p-1
        ${isLargeMode 
            ? 'grid-cols-3 gap-3 sm:gap-5' // 3 Spalten für viel größere Bilder im HP Modus / Create Modus
            : 'grid-cols-4 sm:grid-cols-5 gap-3 max-h-64 overflow-y-auto custom-scrollbar'
        }
      `}>
        {availableAvatars.map((imgUrl) => {
          const isTaken = takenColors.includes(imgUrl) && imgUrl !== currentSelection;
          return (
           <button
            key={imgUrl}
            type="button"
            disabled={isTaken}
            onClick={() => onSelect(imgUrl)}
            // --- POINTER EVENTS FÜR LONG PRESS ---
            onPointerDown={() => handlePressStart(imgUrl)}
            onPointerUp={handlePressEnd}
            onPointerLeave={handlePressEnd}
            onContextMenu={(e) => e.preventDefault()} // Verhindert Rechtsklick-Menü auf Mobile (auf dem Button)
            // -------------------------------------
            className={`
              relative aspect-square rounded-full transition-all flex items-center justify-center overflow-hidden border-2 touch-manipulation select-none
              ${currentSelection === imgUrl 
                ? 'border-brand-accent scale-105 ring-2 sm:ring-4 ring-brand-accent/50 z-10 shadow-2xl' 
                : isTaken 
                  ? 'border-transparent opacity-20 cursor-not-allowed grayscale'
                  : 'border-white/10 hover:border-white/30 active:scale-95'
              }
            `}
            title={isTaken ? 'Bereits vergeben' : 'Wählen (Gedrückt halten für Vorschau)'}
          >
            <img 
              src={imgUrl} 
              alt="Avatar" 
              className="w-full h-full object-cover pointer-events-none select-none" 
              style={{ WebkitTouchCallout: 'none' }} // Verhindert iOS Menü (Save/Copy)
              onContextMenu={(e) => e.preventDefault()} // Extra Sicherheit gegen Context Menu
            />
            
            {currentSelection === imgUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 animate-fade-in pointer-events-none">
                <Check size={isLargeMode ? 32 : 20} strokeWidth={4} className="text-brand-accent drop-shadow-md" />
              </div>
            )}
            {isTaken && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <Lock size={16} className="text-white/50" />
              </div>
            )}
          </button>
        )})}
      </div>
    </div>
  );

  if (!localPlayerId && (view === 'create' || view === 'join')) {
    return (
      <div className="max-w-md mx-auto animate-fade-in pt-6">
        <Button variant="ghost" onClick={() => setView('main')} className="mb-4">← Zurück</Button>
        <Card title={view === 'create' ? "Neues Spiel erstellen" : "Spiel beitreten"} className="!p-4 sm:!p-6">
          <div className="space-y-3 sm:space-y-6">
            {view === 'join' && (
              <div className="space-y-1 sm:space-y-2">
                <label className="text-sm font-medium text-purple-200">Raum-Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  maxLength={4}
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl bg-purple-950/50 border border-purple-500 text-white placeholder-purple-400 font-mono text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-accent uppercase"
                />
              </div>
            )}
            <div className="space-y-1 sm:space-y-2">
              <label className="text-sm font-medium text-purple-200">Dein Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name eingeben..."
                className="w-full px-4 py-2.5 sm:py-3 rounded-xl bg-purple-950/50 border border-purple-500 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
            </div>

            {/* Admin Code Input for Creating Game */}
            {view === 'create' && (
              <div className="space-y-1 sm:space-y-2">
                <label className="text-xs font-medium text-purple-300 flex items-center gap-1">
                    <KeyRound size={12} /> Admin Code (Optional)
                </label>
                <input
                  type="password"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Code für volle Rechte"
                  className="w-full px-4 py-2 rounded-xl bg-purple-950/30 border border-purple-500/50 text-white placeholder-purple-500/50 text-sm focus:outline-none focus:ring-1 focus:ring-brand-accent"
                />
              </div>
            )}
            
            {/* Große, zufällige Auswahl (mit Long Press, nur 9 Items für 3x3) */}
            {renderAvatarPicker(selectedAvatar, setSelectedAvatar, [], randomAvatars, true)}

            <Button 
              fullWidth 
              onClick={() => view === 'create' 
                ? onCreate(name, selectedAvatar, adminCode === '0824') 
                : onJoin(name, joinCode, selectedAvatar)
              } 
              disabled={!name.trim() || (view === 'join' && joinCode.length !== 4) || connectionStatus === 'connecting'}
            >
              {connectionStatus === 'connecting' ? <Loader2 className="animate-spin mx-auto" /> : (view === 'create' ? 'Lobby öffnen' : 'Beitreten')}
            </Button>
            {connectionStatus === 'error' && (
              <p className="text-red-400 text-center text-sm">Fehler. Prüfe Code & Internet.</p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const currentPlayer = players.find(p => p.id === localPlayerId);

  return (
    <div className="max-w-6xl mx-auto animate-fade-in pt-6">
      {renderBotModal()}
      
      {/* HP AVATAR SELECTION MODAL */}
      {showHpAvatarSelection && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
             <div className="bg-[#2a1b3d] border-4 border-amber-500 rounded-3xl w-full max-w-2xl shadow-[0_0_60px_rgba(245,158,11,0.3)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700"></div>
                
                <div className="p-6 text-center">
                   <div className="flex items-center justify-center gap-3 mb-4">
                      <Wand2 size={28} className="text-amber-400 animate-pulse" />
                      <h2 className="text-2xl font-serif font-bold text-amber-100">Wähle deinen Avatar</h2>
                   </div>

                   {currentPlayer && (
                        <div className="bg-black/30 rounded-2xl p-4 border border-white/10">
                            {renderAvatarPicker(
                                currentPlayer.avatar, 
                                (newAvatar) => {
                                    onUpdatePlayer?.({ avatar: newAvatar });
                                    setShowHpAvatarSelection(false);
                                },
                                players.map(p => p.avatar), // Zeige bereits vergebene an
                                randomHpAvatars, // ÄNDERUNG: Host sieht hier auch nur 9 zufällige!
                                true, // Large Mode
                                true // Hide Labels
                            )}
                        </div>
                   )}
                </div>
             </div>
          </div>
      )}

      <div className="text-center space-y-2 mb-8">
        <h1 className="text-3xl font-extrabold text-white font-serif">Lobby</h1>
        {roomCode && (
          <div className="bg-white/10 p-4 rounded-xl border border-brand-accent/50 inline-block">
            <p className="text-xs text-brand-accent uppercase font-bold tracking-widest mb-1">Raum-Code</p>
            <p className="text-4xl font-black font-mono tracking-widest text-white select-all">{roomCode}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LINKS: EINSTELLUNGEN (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
            <Card title="Dein Profil">
                 {currentPlayer && onUpdatePlayer && (
                    <div className="">
                        {/* 
                            LOGIC CHANGE: 
                            - HP Mode: Host sieht hier ALLE (HP_AVATAR_IMAGES), Spieler nur 9 zufällige
                            - Host: Alle Monster Bilder (wenn nicht HP Mode).
                            - Normaler Spieler: Nur die 9 zufälligen (randomAvatars), die beim Joinen generiert wurden.
                        */}
                        {renderAvatarPicker(
                        currentPlayer.avatar, 
                        (newColor) => onUpdatePlayer({ avatar: newColor }), 
                        players.map(p => p.avatar),
                        isHPMode 
                            ? (isHost ? HP_AVATAR_IMAGES : randomHpAvatars) 
                            : (isHost ? AVATAR_IMAGES : randomAvatars), 
                        false 
                        )}
                    </div>
                 )}
            </Card>

            {isHost && (
                <Card title="Spiel-Einstellungen">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {/* Nur anzeigen wenn SuperAdmin (Code 0824) */}
                            {currentPlayer?.isSuperAdmin && (
                                <Button variant="secondary" onClick={() => setShowBotModal(true)} fullWidth className="text-xs py-2 bg-white/5 border-white/20 hover:bg-white/10">
                                    <BrainCircuit size={16} className="mr-2 inline" /> KI-Bot
                                </Button>
                            )}
                            
                            {onToggleRules && (
                                <Button variant="secondary" onClick={() => onToggleRules(true)} className={`text-xs py-2 bg-white/5 border-white/20 hover:bg-white/10 px-4 ${!currentPlayer?.isSuperAdmin ? 'col-span-2 w-full' : ''}`}>
                                    <HelpCircle size={16} className="mr-2 inline" /> Regeln
                                </Button>
                            )}
                        </div>

                        {/* Troll Modus Toggle (Für ALLE Hosts sichtbar) */}
                        <div 
                        onClick={() => onToggleTrollMode?.(!isTrollModeActive)}
                        className={`
                            cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between
                            ${isTrollModeActive ? 'bg-pink-900/40 border-pink-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}
                        `}
                        >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isTrollModeActive ? 'bg-pink-500/20 text-pink-300' : 'bg-gray-800 text-gray-400'}`}>
                                <Ghost size={20} />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className={`font-bold text-sm ${isTrollModeActive ? 'text-pink-300' : 'text-gray-300'}`}>Troll-Modus</span>
                                <span className="text-[10px] text-white/50">Troll Torben als fieser Zuschauer</span>
                            </div>
                        </div>
                        {isTrollModeActive ? <ToggleRight size={24} className="text-pink-400" /> : <ToggleLeft size={24} className="text-gray-500" />}
                        </div>

                        {/* Harry Potter Modus Toggle */}
                        <div 
                        onClick={toggleHP}
                        className={`
                            cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between
                            ${isHPMode ? 'bg-amber-900/40 border-amber-400' : 'bg-white/5 border-white/10 hover:bg-white/10'}
                        `}
                        >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isHPMode ? 'bg-amber-500/20 text-amber-300' : 'bg-gray-800 text-gray-400'}`}>
                                <Wand2 size={20} />
                            </div>
                            <div className="flex flex-col text-left">
                                <span className={`font-bold text-sm ${isHPMode ? 'text-amber-300' : 'text-gray-300'}`}>Harry Potter Modus</span>
                                <span className="text-[10px] text-white/50">50 Fragen aus der Zauberwelt</span>
                            </div>
                        </div>
                        {isHPMode ? <ToggleRight size={24} className="text-amber-400" /> : <ToggleLeft size={24} className="text-gray-500" />}
                        </div>

                        {/* Game Mode Selection */}
                        <div className="space-y-2 mt-4 pt-4 border-t border-white/10">
                        <label className="text-xs text-purple-300 font-bold uppercase tracking-wider block">Spielmodus wählen</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                            onClick={() => setSelectedMode('classic')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${selectedMode === 'classic' ? 'bg-brand-accent text-brand-dark border-brand-accent' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                            <Repeat size={20} />
                            <span className="text-[10px] font-bold">Klassisch</span>
                            </button>
                            <button 
                            onClick={() => setSelectedMode('host')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${selectedMode === 'host' ? 'bg-brand-accent text-brand-dark border-brand-accent' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                            <User size={20} />
                            <span className="text-[10px] font-bold">Host-Modus</span>
                            </button>
                            <button 
                            onClick={() => setSelectedMode('ai')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${selectedMode === 'ai' ? 'bg-cyan-500 text-brand-dark border-cyan-500' : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'}`}
                            >
                            <Sparkles size={20} />
                            <span className="text-[10px] font-bold">KI-Modus</span>
                            </button>
                        </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>

        {/* RECHTS: SPIELERLISTE (7 cols) */}
        <div className="lg:col-span-7 h-full flex flex-col">
             <Card className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-300 flex items-center gap-2">
                    <Users size={18} /> Spieler in der Lobby ({players.length})
                </h3>
                {connectionStatus === 'connected' && <span className="text-xs text-green-400 flex items-center gap-1">● Online</span>}
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto mb-6 pr-1 custom-scrollbar min-h-[300px]">
                {players.map((player, index) => (
                    <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${player.id === localPlayerId ? 'bg-brand-accent/10 border-brand-accent' : 'bg-white/5 border-transparent'}`}
                    >
                    <div className="flex items-center gap-3">
                        <Avatar avatar={player.avatar} name={player.name} size="md" />
                        <div className="flex flex-col text-left">
                        <span className="font-medium text-lg flex items-center gap-2">
                            {player.name} {player.id === localPlayerId && "(Du)"}
                            {player.isBot && !player.isHeckler && <BrainCircuit size={16} className="text-purple-400" />}
                            {player.isHeckler && <Ghost size={16} className="text-pink-400" />}
                        </span>
                        {player.isHeckler && (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-pink-400 flex items-center gap-1">
                                Zuschauer (Troll)
                            </span>
                        )}
                        {player.isBot && !player.isHeckler && player.botPersonality && (
                            <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 flex items-center gap-1">
                            {player.botPersonality === 'beginner' && <><Baby size={10} /> Anfänger</>}
                            {player.botPersonality === 'pro' && <><GraduationCap size={10} /> Profi</>}
                            {player.botPersonality === 'troll' && <><PartyPopper size={10} /> Troll</>}
                            </span>
                        )}
                        </div>
                        {index === 0 && <Crown size={16} className="text-yellow-400 ml-1" />}
                    </div>
                    
                    {isHost && player.id !== localPlayerId && onRemovePlayer && (
                        <button 
                        onClick={() => onRemovePlayer(player.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                        <UserX size={18} />
                        </button>
                    )}
                    </div>
                ))}
                </div>

                {isHost ? (
                    <Button fullWidth onClick={() => onStartGame(selectedMode)} disabled={players.length < (selectedMode === 'ai' ? 1 : 2)} className="group mt-4">
                        <div className="flex items-center justify-center gap-2">
                        <span>Spiel starten</span>
                        <Play size={20} className="group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Button>
                    ) : (
                    <div className="text-center p-4 bg-purple-900/50 rounded-lg border border-purple-800">
                        <p className="text-purple-200 flex items-center justify-center gap-2 animate-pulse font-medium">
                        <Loader2 className="animate-spin" size={16} /> Warte auf Start...
                        </p>
                    </div>
                )}
             </Card>
        </div>
      </div>
    </div>
  );
};
