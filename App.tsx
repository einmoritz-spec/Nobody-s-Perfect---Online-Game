
import React, { useState, useEffect, useRef } from 'react';
import { GamePhase, GameState, Player, Answer, NetworkAction, AVATAR_IMAGES, BotPersonality, GameMode, RoundHistory } from './types';
import { Lobby } from './components/Lobby';
import { GameMasterInput } from './components/GameMasterInput';
import { PlayerInput } from './components/PlayerInput';
import { Voting } from './components/Voting';
import { Resolution } from './components/Resolution';
import { FinalLeaderboard } from './components/FinalLeaderboard';
import { Avatar } from './components/ui/Avatar';
import { Button } from './components/ui/Button';
import { Peer, DataConnection } from 'peerjs';
import { GoogleGenAI } from "@google/genai";
import { BrainCircuit, Loader2, UserX, Settings, Users, Crown, Wand2, Sparkles, LogIn, LogOut, BookOpen, Lightbulb, Hourglass, Ghost, Eye, CheckCircle2, Timer, Play, X, HelpCircle, PenTool, Medal } from 'lucide-react';
import { CATEGORIES, QUESTIONS, HP_QUESTIONS } from './questions';

// --- HELPER ---
function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function cleanAnswer(text: string): string {
  if (!text) return "";
  // Entfernt einen oder mehrere Punkte am Ende des Strings
  return text.trim().replace(/\.+$/, "");
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Robuster Parser für KI-Antworten
function extractAndParseJson(text: string): any {
  try {
    // 1. Versuche direkten Parse nach einfacher Bereinigung
    const clean = text.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(clean);
  } catch (e) {
    // 2. Fallback: Suche nach dem ersten { und letzten }
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      try {
        const jsonSubstring = text.substring(start, end + 1);
        return JSON.parse(jsonSubstring);
      } catch (innerE) {
        throw new Error("JSON extraction failed");
      }
    }
    throw e;
  }
}

const APP_PREFIX = 'nobodyperfect-game-v1-';
const SESSION_KEY = 'nobodyperfect-session-v1';
const STATE_RECOVERY_KEY = 'nobodyperfect-last-state';
const AI_GM_ID = 'AI_GM_HOST';
const HECKLER_ID = 'TROLL_TORBEN_SPECTATOR';

const PEER_CONFIG = {
  debug: 1, 
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  },
};

const INITIAL_STATE: GameState = {
  players: [],
  gameMasterId: null,
  phase: GamePhase.LOBBY,
  currentRound: 0,
  question: '',
  correctAnswerText: '',
  gmFakeAnswer: '',
  category: 'words',
  participantIds: [],
  submittedAnswers: [],
  votes: {},
  revealedAnswerIds: [],
  awardedBonusIds: [],
  lastUpdated: 0,
  isAiGameMasterMode: false,
  gameMode: 'classic',
  timerEndTime: null,
  timerDuration: null,
  showRules: false,
  isHarryPotterMode: false, // Default aus
  history: [],
  finalRoast: null
};

const App: React.FC = () => {
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [roomCode, setRoomCode] = useState<string>('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [hasJoinedSuccessfully, setHasJoinedSuccessfully] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<DataConnection[]>([]);
  const hostConnectionRef = useRef<DataConnection | null>(null);
  
  // Ref für den aktuellen GameState, um "Stale Closures" in PeerJS Callbacks zu vermeiden
  const gameStateRef = useRef<GameState>(INITIAL_STATE);

  const botProcessingRef = useRef<boolean>(false);
  const botVotingRef = useRef<boolean>(false);
  const roastProcessingRef = useRef<boolean>(false);

  // Sync Ref mit State
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // --- HEARTBEAT & SYNC ---
  // Der Host sendet regelmäßig den State, um Verbindungsabbrüche zu verhindern (Keep-Alive)
  // und um sicherzustellen, dass Clients, die kurz weg waren, sofort wieder up-to-date sind.
  useEffect(() => {
    if (!isHost) return;
    
    const interval = setInterval(() => {
       // Sende State nur, wenn Verbindungen bestehen
       if (connectionsRef.current.length > 0) {
           broadcastState(gameStateRef.current);
       }
    }, 4000); // Alle 4 Sekunden Heartbeat

    return () => clearInterval(interval);
  }, [isHost]);

  // --- ADMIN SYNC EFFECT ---
  // Wenn mir im GameState die Rolle "isHost" zugewiesen wird (z.B. durch Host-Migration),
  // übernehme ich auch lokal die Admin-Rechte.
  useEffect(() => {
    if (localPlayerId && gameState.players.length > 0) {
      const me = gameState.players.find(p => p.id === localPlayerId);
      if (me?.isHost && !isHost) {
        setIsHost(true);
      }
    }
  }, [gameState.players, localPlayerId, isHost]);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (isHost) {
      localStorage.setItem(STATE_RECOVERY_KEY, JSON.stringify({ roomCode, state: gameState }));
    }
  }, [gameState, isHost, roomCode]);

  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved && !localPlayerId) {
      try {
        const { id, roomCode: savedCode, name, avatar, isHost: wasHost } = JSON.parse(saved);
        if (wasHost) {
          const recovery = localStorage.getItem(STATE_RECOVERY_KEY);
          if (recovery) {
            const { roomCode: rc, state } = JSON.parse(recovery);
            if (rc === savedCode) {
              // Stelle sicher, dass showRules existiert (falls altes State-Objekt geladen wird)
              const safeState = { ...INITIAL_STATE, ...state, showRules: state.showRules || false };
              setGameState(safeState);
              recreateHost(savedCode, id, name, avatar);
              return;
            }
          }
          createGame(name, avatar, savedCode, id);
        } else {
          joinGame(name, savedCode, avatar, id);
        }
      } catch (e) {
        localStorage.removeItem(SESSION_KEY);
      }
    }
  }, []);

  const getAiInstance = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanJsonString = (text: string): string => text.replace(/```json\n?|```/g, '').trim();

  // --- NETWORK ---
  const broadcastState = (state: GameState) => {
    connectionsRef.current.forEach(c => {
      if (c.open) c.send({ type: 'SYNC_STATE', payload: state });
    });
  };

  const dispatch = (action: NetworkAction) => {
    if (isHost) {
      handleHostAction(action);
    } else if (hostConnectionRef.current?.open) {
      hostConnectionRef.current.send(action);
    }
  };

  const createGame = (playerName: string, avatar: string, code?: string, existingId?: string) => {
    setConnectionStatus('connecting');
    const newCode = code || generateRoomCode();
    const hostId = existingId || Math.random().toString(36).substr(2, 9);
    setRoomCode(newCode);
    setLocalPlayerId(hostId);
    setIsHost(true);
    
    const peer = new Peer(`${APP_PREFIX}${newCode}`, PEER_CONFIG);
    peerRef.current = peer;
    
    peer.on('open', () => {
      setConnectionStatus('connected');
      const p: Player = { id: hostId, name: playerName, score: 0, avatar, isHost: true };
      setGameState(prev => ({ ...prev, players: [p] }));
      localStorage.setItem(SESSION_KEY, JSON.stringify({ id: hostId, roomCode: newCode, name: playerName, avatar, isHost: true }));
    });
    
    peer.on('disconnected', () => {
        console.warn('Host disconnected from server. Reconnecting...');
        peer.reconnect();
    });

    peer.on('error', (err) => {
        console.error('Host Error:', err);
        // Ignore fatal errors here if possible, rely on reconnect logic for network issues
    });

    peer.on('connection', (conn) => {
      connectionsRef.current.push(conn);
      conn.on('data', (d) => handleHostAction(d as NetworkAction));
      // WICHTIG: Nutze gameStateRef.current, um den AKTUELLEN State zu senden, nicht den zum Zeitpunkt der Erstellung
      setTimeout(() => conn.open && conn.send({ type: 'SYNC_STATE', payload: gameStateRef.current }), 500);
    });
  };

  const recreateHost = (code: string, id: string, name: string, avatar: string) => {
    setConnectionStatus('connecting');
    setRoomCode(code);
    setLocalPlayerId(id);
    setIsHost(true);
    const peer = new Peer(`${APP_PREFIX}${code}`, PEER_CONFIG);
    peerRef.current = peer;
    
    peer.on('open', () => setConnectionStatus('connected'));
    
    peer.on('disconnected', () => {
        console.warn('Host (recovered) disconnected from server. Reconnecting...');
        peer.reconnect();
    });

    peer.on('error', (err) => console.error('Recover Host Error:', err));

    peer.on('connection', (conn) => {
      connectionsRef.current.push(conn);
      conn.on('data', (d) => handleHostAction(d as NetworkAction));
      // WICHTIG: Nutze gameStateRef.current
      setTimeout(() => conn.open && conn.send({ type: 'SYNC_STATE', payload: gameStateRef.current }), 800);
    });
  };

  const joinGame = (playerName: string, code: string, avatar: string, existingId?: string) => {
    setConnectionStatus('connecting');
    const clientId = existingId || Math.random().toString(36).substr(2, 9);
    setLocalPlayerId(clientId);
    setIsHost(false);
    setRoomCode(code);
    
    const peer = new Peer(PEER_CONFIG);
    peerRef.current = peer;
    
    peer.on('open', () => {
      const conn = peer.connect(`${APP_PREFIX}${code}`, { reliable: true });
      hostConnectionRef.current = conn;
      
      conn.on('open', () => {
        setConnectionStatus('connected');
        conn.send({ type: 'JOIN', payload: { id: clientId, name: playerName, score: 0, avatar } });
        localStorage.setItem(SESSION_KEY, JSON.stringify({ id: clientId, roomCode: code, name: playerName, avatar, isHost: false }));
      });

      conn.on('data', (d) => {
        const action = d as NetworkAction;
        if (action.type === 'SYNC_STATE') {
          const me = action.payload.players.find(p => p.id === clientId);
          if (!me && !isHost && hasJoinedSuccessfully) {
             localStorage.removeItem(SESSION_KEY);
             localStorage.removeItem(STATE_RECOVERY_KEY);
             window.location.reload(); 
             return;
          }
          
          if (!isHost && gameStateRef.current.players.length > 0 && action.payload.players.length === 0) {
              return;
          }

          setGameState(action.payload);
          setHasJoinedSuccessfully(true);
        }
      });
      
      conn.on('close', () => {
          // Versuche Reconnect bei Verbindungsabbruch zum Host
          console.warn("Connection to host closed.");
      });
    });

    peer.on('disconnected', () => {
        console.warn('Client disconnected from PeerServer. Reconnecting...');
        peer.reconnect();
    });

    peer.on('error', (err) => {
        console.error('Client Peer Error:', err);
        // Nur kritische Fehler anzeigen, transiente Fehler ignorieren für bessere UX
        if (err.type === 'peer-unavailable') {
            setConnectionStatus('error');
        } else if (err.type !== 'network' && err.type !== 'server-error' && err.type !== 'socket-error' && err.type !== 'socket-closed') {
             // Zeige Fehler nur wenn es kein Netzwerk/Disconnect Fehler ist (die werden vom Reconnect handled)
             // setConnectionStatus('error');
        }
    });
  };

  const leaveSession = () => {
    if (window.confirm("Willst du das Spiel wirklich verlassen?")) {
      // 1. Wenn wir kein Host sind, sagen wir dem Host, dass er uns löschen soll
      if (localPlayerId && !isHost) {
          dispatch({ type: 'REMOVE_PLAYER', payload: { playerId: localPlayerId } });
      }

      // 2. Kurz warten, damit die Nachricht rausgeht, dann lokal aufräumen
      setTimeout(() => {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(STATE_RECOVERY_KEY);
          window.location.reload();
      }, 150);
    }
  };

  // --- REDUCER ---
  const handleHostAction = (action: NetworkAction) => {
    setGameState(prevState => {
      const nextState = processGameReducer(prevState, action);
      if (nextState !== prevState) broadcastState(nextState);
      return nextState;
    });
  };

  const processGameReducer = (state: GameState, action: NetworkAction): GameState => {
    switch (action.type) {
      case 'JOIN': {
        if (state.players.some(p => p.id === action.payload.id)) return state;
        return { ...state, players: [...state.players, action.payload] };
      }
      case 'REMOVE_PLAYER': {
        const pid = action.payload.playerId;
        const playerToRemove = state.players.find(p => p.id === pid);
        let newPlayers = state.players.filter(p => p.id !== pid);
        
        // 1. HOST MIGRATION LOGIK
        // Wenn der Host geht, gib die Krone an den nächsten menschlichen Spieler weiter.
        const wasHostRemoved = playerToRemove?.isHost;
        if (wasHostRemoved) {
             const newHostCandidate = newPlayers.find(p => !p.isBot && !p.isHeckler);
             if (newHostCandidate) {
                 newPlayers = newPlayers.map(p => 
                    p.id === newHostCandidate.id ? { ...p, isHost: true } : p
                 );
             }
        }

        // 2. SPIELLEITER (GM) FAILSAFE LOGIK
        const wasGameMaster = state.gameMasterId === pid;
        if (wasGameMaster && state.phase !== GamePhase.LOBBY && state.phase !== GamePhase.FINAL_LEADERBOARD) {
            let nextGmId = null;
            const validCandidates = newPlayers.filter(p => !p.isHeckler);

            if (state.gameMode === 'ai') {
                nextGmId = AI_GM_ID; 
            } else if (state.gameMode === 'host') {
                const newHost = newPlayers.find(p => p.isHost);
                nextGmId = newHost ? newHost.id : (validCandidates[0]?.id || null);
            } else {
                nextGmId = validCandidates.length > 0 ? validCandidates[0].id : null;
            }

            return {
                ...state,
                players: newPlayers,
                gameMasterId: nextGmId,
                phase: GamePhase.GM_INPUT, // Reset auf Frage-Auswahl
                currentRound: state.currentRound + 1, // Nächste Runde
                question: '',
                correctAnswerText: '',
                gmFakeAnswer: '',
                submittedAnswers: [],
                votes: {},
                revealedAnswerIds: [],
                awardedBonusIds: [],
                timerEndTime: null, // Timer reset
                timerDuration: null,
                roastData: null,
            };
        }

        // 3. NORMALER SPIELER VERLÄSST DAS SPIEL (Nicht GM)
        
        let newGmId = state.gameMasterId;
        if (state.gameMasterId === pid && state.phase === GamePhase.LOBBY) {
             const validCandidates = newPlayers.filter(p => !p.isHeckler);
             newGmId = validCandidates.length > 0 ? validCandidates[0].id : null;
        }

        const newSubmitted = state.submittedAnswers.filter(a => a.authorId !== pid);
        const newParticipantIds = state.participantIds.filter(id => id !== pid);
        const newVotes = { ...state.votes };
        delete newVotes[pid];

        let nextState = { 
          ...state, 
          players: newPlayers, 
          gameMasterId: newGmId,
          submittedAnswers: newSubmitted,
          participantIds: newParticipantIds,
          votes: newVotes
        };

        // AUTO-ADVANCE LOGIC
        if (state.phase === GamePhase.PLAYER_INPUT) {
            const allAnswered = newParticipantIds.length > 0 && newParticipantIds.every(pId => newSubmitted.some(a => a.authorId === pId));
            
            if (allAnswered) {
                 const final = [{ id: 'correct', text: state.correctAnswerText, authorId: 'GAME', isCorrect: true }, ...newSubmitted];
                 if (state.gmFakeAnswer.trim()) final.push({ id: 'ai-fake', text: state.gmFakeAnswer, authorId: 'AI', isCorrect: false });
                 nextState = { ...nextState, submittedAnswers: shuffle(final), phase: GamePhase.VOTING, timerEndTime: null, timerDuration: null };
            }
        }
        
        if (state.phase === GamePhase.VOTING) {
            const allVoted = newParticipantIds.length > 0 && newParticipantIds.every(pId => newVotes[pId]);
            
            if (allVoted) {
                 const upd = newPlayers.map(p => {
                    let pts = 0;
                    const myVote = newVotes[p.id];
                    if (myVote && nextState.submittedAnswers.find(a => a.id === myVote)?.isCorrect) pts += 1;
                    pts += Object.entries(newVotes).filter(([vid, aid]) => {
                      const ans = nextState.submittedAnswers.find(a => a.id === aid);
                      return ans && ans.authorId === p.id && vid !== p.id;
                    }).length;
                    return { ...p, score: p.score + pts };
                  });
                  nextState = { ...nextState, votes: newVotes, players: upd, phase: GamePhase.RESOLUTION, revealedAnswerIds: [] };
            }
        }

        return nextState;
      }
      case 'START_GAME': return { ...state, phase: GamePhase.GM_INPUT, gameMode: action.payload.mode, gameMasterId: action.payload.mode === 'ai' ? AI_GM_ID : state.players[0].id, currentRound: 1, history: [], showRules: false };
      case 'SUBMIT_GM': {
        const parts = state.players.filter(p => p.id !== state.gameMasterId && !p.isHeckler && !p.isBot).map(p => p.id);
        const bots = state.players.filter(p => p.isBot && !p.isHeckler).map(p => p.id);
        return { ...state, phase: GamePhase.PLAYER_INPUT, question: action.payload.question, correctAnswerText: action.payload.correct, gmFakeAnswer: action.payload.fake, category: action.payload.category, submittedAnswers: [], participantIds: [...parts, ...bots], votes: {}, roastData: null, timerEndTime: null, timerDuration: null };
      }
      case 'SUBMIT_FAKE': {
        if (state.submittedAnswers.some(a => a.authorId === action.payload.playerId)) return state;
        const newAns = [...state.submittedAnswers, { id: Math.random().toString(36).substr(2, 9), text: action.payload.text, authorId: action.payload.playerId, isCorrect: false }];
        if (newAns.length >= state.participantIds.length) {
          const final = [{ id: 'correct', text: state.correctAnswerText, authorId: 'GAME', isCorrect: true }, ...newAns];
          if (state.gmFakeAnswer.trim()) final.push({ id: 'ai-fake', text: state.gmFakeAnswer, authorId: 'AI', isCorrect: false });
          return { ...state, submittedAnswers: shuffle(final), phase: GamePhase.VOTING, timerEndTime: null, timerDuration: null };
        }
        return { ...state, submittedAnswers: newAns };
      }
      case 'VOTE': {
        const nextV = { ...state.votes, [action.payload.playerId]: action.payload.answerId };
        if (Object.keys(nextV).length >= state.participantIds.length) {
          const upd = state.players.map(p => {
            let pts = 0;
            const myVote = nextV[p.id];
            if (myVote && state.submittedAnswers.find(a => a.id === myVote)?.isCorrect) pts += 1;
            pts += Object.entries(nextV).filter(([vid, aid]) => {
              const ans = state.submittedAnswers.find(a => a.id === aid);
              return ans && ans.authorId === p.id && vid !== p.id;
            }).length;
            return { ...p, score: p.score + pts };
          });
          return { ...state, votes: nextV, players: upd, phase: GamePhase.RESOLUTION, revealedAnswerIds: [] };
        }
        return { ...state, votes: nextV };
      }
      case 'NEXT_ROUND': {
        const historyEntry: RoundHistory = { question: state.question, correctAnswerText: state.correctAnswerText, answers: [...state.submittedAnswers], votes: { ...state.votes } };
        let nGm = '';
        if (state.gameMode === 'ai') nGm = AI_GM_ID;
        else if (state.gameMode === 'host') nGm = state.players.find(p => p.isHost)?.id || state.players[0].id;
        else {
           let cur = state.players.findIndex(p => p.id === state.gameMasterId);
           let nxt = (cur + 1) % state.players.length;
           while (state.players[nxt].isHeckler) nxt = (nxt + 1) % state.players.length;
           nGm = state.players[nxt].id;
        }
        return { 
          ...state, 
          phase: GamePhase.GM_INPUT, 
          gameMasterId: nGm, 
          currentRound: state.currentRound + 1, 
          question: '', 
          submittedAnswers: [], 
          votes: {}, 
          revealedAnswerIds: [], 
          roastData: null, 
          timerEndTime: null, 
          timerDuration: null,
          awardedBonusIds: [], // WICHTIG: Reset Bonus Points
          history: [...state.history, historyEntry] 
        };
      }
      case 'END_GAME': {
        const historyEntry: RoundHistory = { question: state.question, correctAnswerText: state.correctAnswerText, answers: [...state.submittedAnswers], votes: { ...state.votes } };
        return { ...state, phase: GamePhase.FINAL_LEADERBOARD, history: [...state.history, historyEntry] };
      }
      case 'RESET_GAME': return { ...INITIAL_STATE, players: state.players.map(p => ({ ...p, score: 0 })), phase: GamePhase.LOBBY };
      case 'ADD_BOT': return { ...state, players: [...state.players, { id: action.payload.botId, name: action.payload.name, avatar: action.payload.avatar, botPersonality: action.payload.personality, score: 0, isBot: true }] };
      case 'REVEAL_ANSWER': return { ...state, revealedAnswerIds: [...state.revealedAnswerIds, action.payload.answerId] };
      case 'AWARD_POINT': return { ...state, players: state.players.map(p => p.id === action.payload.playerId ? { ...p, score: p.score + 1 } : p), awardedBonusIds: [...state.awardedBonusIds, action.payload.playerId] };
      case 'SET_ROAST': return { ...state, roastData: action.payload };
      case 'SET_FINAL_ROAST': return { ...state, finalRoast: action.payload.text };
      case 'SYNC_STATE': return action.payload;
      case 'START_TIMER': return { ...state, timerEndTime: Date.now() + action.payload.duration * 1000, timerDuration: action.payload.duration }; // Sync Timer & Duration
      case 'UPDATE_PLAYER': return { ...state, players: state.players.map(p => p.id === action.payload.playerId ? { ...p, ...action.payload } : p) };
      case 'TOGGLE_TROLL_MODE': {
        if (action.payload.enable) return { ...state, players: [...state.players, { id: HECKLER_ID, name: "Troll Torben", avatar: "https://robohash.org/Troll?set=set2", score: 0, isBot: true, isHeckler: true, botPersonality: 'troll' }] };
        return { ...state, players: state.players.filter(p => !p.isHeckler) };
      }
      case 'TOGGLE_HP_MODE': return { ...state, isHarryPotterMode: action.payload.enable };
      case 'TOGGLE_RULES': return { ...state, showRules: action.payload.show };
      default: return state;
    }
  };

  // --- AI ---
  const generateAiContent = async (categoryInput: string, personality: BotPersonality = 'pro') => {
    setIsAiLoading(true);
    const cat = CATEGORIES.find(c => c.id === categoryInput) || CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const isHP = gameStateRef.current.isHarryPotterMode;

    // Wenn HP Modus UND kein Troll: Nutze direkt den Pool, statt KI zu fragen
    if (isHP && personality !== 'troll') {
       const pool = HP_QUESTIONS;
       const randomQ = pool[Math.floor(Math.random() * pool.length)];
       setIsAiLoading(false);
       return { 
           question: randomQ.q, 
           correctAnswer: cleanAnswer(randomQ.a), 
           category: 'harry_potter' 
       };
    }
    
    // Fallback Funktion (für andere Modi oder Fehlerfall)
    const fallback = () => {
      const pool = isHP ? HP_QUESTIONS : (QUESTIONS[cat.id] || QUESTIONS['words']);
      const randomQ = pool[Math.floor(Math.random() * pool.length)];
      return {
          question: randomQ.q,
          correctAnswer: cleanAnswer(randomQ.a),
          category: isHP ? 'harry_potter' : cat.id
      };
    };

    try {
      const ai = getAiInstance();
      let prompt = `Nobody's Perfect: Kategorie ${cat.name}. Typ: ${personality}. Erfinde eine kuriose Frage + WAHRHEIT. Die Wahrheit MUSS EXTREM KURZ sein (max. 8 Wörter). Antworte OHNE Punkt am Ende. JSON: {"question": "...", "correctAnswer": "..."}`;
      
      // SPEZIAL LOGIK FÜR TROLL BOT
      if (personality === 'troll') {
          if (isHP) {
             // Einfachere Quatsch-Fragen im HP Kontext
             prompt = `Du bist ein lustiger Troll im Harry Potter Universum.
             Aufgabe: Erfinde eine kurze, einfache, aber total absurde QUATSCH-FRAGE zu einem *komplett erfundenen* magischen Ding (z.B. "Was macht der Zauberspruch 'Popel-Patronus'?" oder "Was ist ein 'Schoko-Schnarcher'?").
             Dazu eine "korrekte" Antwort, die lustig ist, aber *plausibel klingt* (als wäre es ein echter Fakt, keine reine wirre Buchstabenfolge).
             Antwort MAXIMAL 8 Wörter. Keine Punkte am Ende.
             JSON Format: {"question": "...", "correctAnswer": "..."}`;
          } else {
             // Einfachere Quatsch-Fragen im Standard Kontext
             prompt = `Du bist ein lustiger Troll-Spielleiter.
             Aufgabe: Erfinde eine kurze, einfache, aber total absurde QUATSCH-FRAGE (z.B. "Warum tragen Pinguine keine Socken?" oder "Wozu dient der 'Nudel-Magnet'?").
             Dazu eine "korrekte" Antwort, die lustig ist, aber *plausibel und logisch klingt* (als wäre es ein echter Fakt).
             Antwort MAXIMAL 8 Wörter. Keine Punkte am Ende.
             JSON Format: {"question": "...", "correctAnswer": "..."}`;
          }
      } else if (isHP) {
          // SPEZIAL LOGIK FÜR HARRY POTTER MODUS (KI Generierung, falls kein Pool genutzt wird - aktuell via if oben abgefangen)
          prompt = `Nobody's Perfect: Harry Potter Universum. Typ: ${personality}. Erfinde eine kuriose Frage über einen sehr unbekannten Zauberspruch, ein magisches Wesen oder ein Objekt aus der Harry Potter Welt. Die Wahrheit MUSS EXTREM KURZ sein (max. 8 Wörter). Antworte OHNE Punkt am Ende. JSON: {"question": "...", "correctAnswer": "..."}`;
      }

      const resp = await ai.models.generateContent({ 
        model: 'gemini-3-flash-preview', 
        contents: prompt
      });
      
      const data = extractAndParseJson(resp.text || '{}');
      
      // VALIDATION: Ensure we have data before returning
      if (!data.question || typeof data.question !== 'string' || data.question.length < 3) {
          throw new Error("Invalid or empty question generated");
      }
      if (!data.correctAnswer) {
          throw new Error("Invalid or empty answer generated");
      }

      setIsAiLoading(false);
      return { 
        question: data.question, 
        correctAnswer: cleanAnswer(data.correctAnswer), 
        category: isHP ? 'harry_potter' : (personality === 'troll' ? 'nonsense' : cat.id)
      };

    } catch (e) {
      console.error("AI Generation failed, using fallback", e);
      setIsAiLoading(false);
      return fallback();
    }
  };

  const generateBotAnswers = async (bots: Player[], q: string) => {
    if (botProcessingRef.current) return;
    botProcessingRef.current = true;
    
    try {
      const ai = getAiInstance();
      const isHP = gameStateRef.current.isHarryPotterMode;
      
      // Gruppiere Bots nach Persönlichkeit
      const trolls = bots.filter(b => b.botPersonality === 'troll');
      const pros = bots.filter(b => b.botPersonality === 'pro' || !b.botPersonality);
      const beginners = bots.filter(b => b.botPersonality === 'beginner');

      const promises = [];

      const contextPrefix = isHP ? "Harry Potter Universum Quiz." : "Allgemeinwissen Quiz.";

      // 1. TROLLS: Lustig, absurd, aber passend
      if (trolls.length > 0) {
          promises.push((async () => {
              const resp = await ai.models.generateContent({ 
                  model: 'gemini-3-flash-preview', 
                  contents: `${contextPrefix} Frage: "${q}". Erfinde für ${trolls.length} Spieler lustige, absurde Quatsch-Antworten, die aber grammatikalisch/thematisch als Antwort durchgehen könnten. Max 8 Wörter. Keine Punkte am Ende. JSON Array von Strings.` 
              });
              const ans = JSON.parse(cleanJsonString(resp.text || '[]'));
              trolls.forEach((b, i) => {
                  if (ans[i]) setTimeout(() => dispatch({ type: 'SUBMIT_FAKE', payload: { playerId: b.id, text: cleanAnswer(ans[i]) } }), 500 + i * 1000);
              });
          })());
      }

      // 2. PROS: Glaubwürdig
      if (pros.length > 0) {
          promises.push((async () => {
              const resp = await ai.models.generateContent({ 
                  model: 'gemini-3-flash-preview', 
                  contents: `${contextPrefix} Frage: "${q}". Erfinde für ${pros.length} Spieler absolut glaubwürdige, lexikon-artige Lügen. Max 10 Wörter. Keine Punkte am Ende. JSON Array von Strings.` 
              });
              const ans = JSON.parse(cleanJsonString(resp.text || '[]'));
              pros.forEach((b, i) => {
                  if (ans[i]) setTimeout(() => dispatch({ type: 'SUBMIT_FAKE', payload: { playerId: b.id, text: cleanAnswer(ans[i]) } }), 200 + i * 800);
              });
          })());
      }

      // 3. BEGINNERS: Simpel
      if (beginners.length > 0) {
          promises.push((async () => {
              const resp = await ai.models.generateContent({ 
                  model: 'gemini-3-flash-preview', 
                  contents: `${contextPrefix} Frage: "${q}". Erfinde für ${beginners.length} Spieler simple, etwas plumpe Lügen, die man leicht durchschaut. Max 6 Wörter. Keine Punkte am Ende. JSON Array von Strings.` 
              });
              const ans = JSON.parse(cleanJsonString(resp.text || '[]'));
              beginners.forEach((b, i) => {
                   if (ans[i]) setTimeout(() => dispatch({ type: 'SUBMIT_FAKE', payload: { playerId: b.id, text: cleanAnswer(ans[i]) } }), 1000 + i * 1000);
              });
          })());
      }

      await Promise.all(promises);

    } catch(e) {
        console.error("Bot generation failed", e);
    } finally { 
        botProcessingRef.current = false; 
    }
  };

  const processBotVotes = (bots: Player[]) => {
      if (botVotingRef.current) return;
      botVotingRef.current = true;
      
      bots.forEach((bot, index) => {
          setTimeout(() => {
              const ownAnswer = gameState.submittedAnswers.find(a => a.authorId === bot.id);
              const possibleAnswers = gameState.submittedAnswers.filter(a => a.id !== ownAnswer?.id);
              
              if (possibleAnswers.length > 0) {
                  const choice = possibleAnswers[Math.floor(Math.random() * possibleAnswers.length)];
                  dispatch({ type: 'VOTE', payload: { playerId: bot.id, answerId: choice.id } });
              }
          }, 1500 + (index * 1500)); 
      });
      setTimeout(() => { botVotingRef.current = false; }, 1500 + (bots.length * 1500) + 1000);
  };

  // --- HECKLER / ROAST LOGIC ---
  const generateRoundRoast = async () => {
      // 1. Abbrechen wenn bereits in Arbeit oder schon vorhanden
      if (roastProcessingRef.current || gameState.roastData) return;
      
      const heckler = gameState.players.find(p => p.isHeckler);
      if (!heckler) return;

      roastProcessingRef.current = true;

      // 2. Suche Opfer: Spieler, die für eine FALSCHE Antwort gestimmt haben
      const victims: { player: Player, answer: Answer }[] = [];
      const votes = gameState.votes;

      for (const p of gameState.players) {
          if (p.isHeckler) continue; 
          if (p.isBot) continue; // WICHTIG: Keine Bots roasten
          
          const votedAnswerId = votes[p.id];
          if (!votedAnswerId) continue;

          const votedAnswer = gameState.submittedAnswers.find(a => a.id === votedAnswerId);
          if (votedAnswer && !votedAnswer.isCorrect) {
             victims.push({ player: p, answer: votedAnswer });
          }
      }

      if (victims.length === 0) { 
          roastProcessingRef.current = false; 
          return; 
      }

      // 3. Zufälliges Opfer auswählen
      const victim = victims[Math.floor(Math.random() * victims.length)];

      try {
          const ai = getAiInstance();
          const resp = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Du bist "Troll Torben", ein zynischer Zuschauer beim Quiz.
              Frage: "${gameState.question}".
              Spieler "${victim.player.name}" hat tatsächlich geglaubt, die Antwort sei: "${victim.answer.text}".

              Aufgabe: Roaste ${victim.player.name} in 2-3 Sätzen dafür. 
              - Nutze MAXIMAL EINE Jugendsprache-Phrase (z.B. "Uff", "Lost", "Digga").
              - Der Fokus liegt darauf, wie lächerlich der Inhalt der Antwort "${victim.answer.text}" ist. 
              - Mache dich konkret darüber lustig, dass jemand so etwas Absurdes für wahr hält.`
          });
          const text = resp.text?.trim() || "Uff. Wie kann man das nur glauben?";
          
          dispatch({ 
              type: 'SET_ROAST', 
              payload: { 
                  targetName: victim.player.name, 
                  botName: heckler.name, 
                  text: text,
                  answerId: victim.answer.id 
              } 
          });
      } catch (e) {
          console.error("Roast failed", e);
      } finally {
          roastProcessingRef.current = false;
      }
  };

  const generateFinalRoast = async () => {
      // WICHTIG: Nutze aktuellen Ref-State, um sicherzugehen, dass wir die neuesten Spielerdaten haben
      const currentPlayers = gameStateRef.current.players;
      const heckler = currentPlayers.find(p => p.isHeckler);
      
      if (!heckler) return;

      // Prevent double calls
      if (roastProcessingRef.current) return;
      roastProcessingRef.current = true;

      // Nur menschliche Verlierer roasten
      const sorted = [...currentPlayers.filter(p => !p.isHeckler && !p.isBot)].sort((a,b) => b.score - a.score);
      const loser = sorted[sorted.length - 1];
      const loserName = loser ? loser.name : 'jemand';
      const loserScore = loser ? loser.score : 0;

      try {
          const ai = getAiInstance();
          const resp = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Du bist "Troll Torben". Das Spiel ist vorbei. 
              Der Verlierer ist: ${loserName} mit nur ${loserScore} Punkten.
              Aufgabe: Roaste den Verlierer gnadenlos für diesen letzten Platz.
              Umfang: 2-3 kurze, zynische Sätze.
              Nutze Jugendsprache (z.B. "lost", "bodenlos").`
          });
          
          const text = resp.text?.trim();
          if (!text) throw new Error("No text generated");

          dispatch({ type: 'SET_FINAL_ROAST', payload: { text } });
      } catch (e) {
          // FALLBACK: Falls die API fehlschlägt, roasten wir trotzdem!
          console.error("Roast API failed, using fallback", e);
          const fallbacks = [
            `Uff ${loserName}, das war bodenlos. Letzter Platz? Ernsthaft?`,
            `${loserName} ist heute komplett lost. ${loserScore} Punkte sind ja fast Minusbereich.`,
            `Glückwunsch ${loserName} zur roten Laterne. Jemand muss ja der Loser sein.`,
            `Satz mit X, ${loserName}: Das war wohl nix!`
          ];
          const fallbackText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
          dispatch({ type: 'SET_FINAL_ROAST', payload: { text: fallbackText } });
      } finally {
          roastProcessingRef.current = false;
      }
  };

  // --- EFFECTS ---
  
  // 1. Bot GM schlägt Frage vor
  useEffect(() => {
    if (!isHost || gameState.phase !== GamePhase.GM_INPUT) return;
    const gm = gameState.players.find(p => p.id === gameState.gameMasterId);
    if (gm?.isBot || gameState.gameMasterId === AI_GM_ID) {
      setTimeout(async () => {
        const d = await generateAiContent("random", gm?.botPersonality || 'pro');
        dispatch({ type: 'SUBMIT_GM', payload: { question: d.question, correct: d.correctAnswer, fake: "", category: d.category } });
      }, 1500);
    }
  }, [gameState.phase, gameState.gameMasterId, isHost]);

  // 2. Bots reichen Antworten ein
  useEffect(() => {
    if (!isHost || gameState.phase !== GamePhase.PLAYER_INPUT) return;
    const bts = gameState.players.filter(p => p.isBot && !p.isHeckler && gameState.participantIds.includes(p.id) && !gameState.submittedAnswers.some(a => a.authorId === p.id));
    if (bts.length > 0) generateBotAnswers(bts, gameState.question);
  }, [gameState.phase, gameState.submittedAnswers, isHost]);

  // 3. Bots stimmen ab
  useEffect(() => {
    if (!isHost || gameState.phase !== GamePhase.VOTING) return;
    const botsToVote = gameState.players.filter(p => p.isBot && !p.isHeckler && gameState.participantIds.includes(p.id) && !gameState.votes[p.id]);
    if (botsToVote.length > 0) {
        processBotVotes(botsToVote);
    } else {
        botVotingRef.current = false;
    }
  }, [gameState.phase, gameState.votes, isHost, gameState.participantIds]);

  // 4. Heckler Roast (Trigger während Voting)
  useEffect(() => {
      if (!isHost) return;

      // Wenn wir im Voting sind, versuche einen Roast zu generieren, sobald falsche Stimmen da sind
      if (gameState.phase === GamePhase.VOTING) {
          generateRoundRoast();
      }
      
      // Fallback: Wenn wir in der Auflösung sind und noch keinen Roast haben (z.B. weil Generierung fehlgeschlagen), versuche es nochmal
      if (gameState.phase === GamePhase.RESOLUTION && !gameState.roastData) {
          generateRoundRoast();
      }
      // Reset lock wenn wir nicht in relevanten Phasen sind
      if (gameState.phase !== GamePhase.VOTING && gameState.phase !== GamePhase.RESOLUTION && gameState.phase !== GamePhase.FINAL_LEADERBOARD) {
          roastProcessingRef.current = false;
      }

  }, [gameState.phase, gameState.votes, isHost]);

  // 5. Heckler Roast (Ende)
  // Fix: Stelle sicher, dass der Roast auch feuert, wenn finalRoast noch null ist aber die Phase stimmt.
  useEffect(() => {
      if (!isHost || gameState.phase !== GamePhase.FINAL_LEADERBOARD) return;
      if (!gameState.finalRoast) {
          generateFinalRoast();
      }
  }, [gameState.phase, isHost]); // Entferne gameState.finalRoast aus Dependency, um Loop zu vermeiden.


  // --- RENDER ---
  const gm = gameState.players.find(p => p.id === gameState.gameMasterId);
  const isAiGm = gameState.gameMasterId === AI_GM_ID;

  // TIMER CONTROLS
  const renderTimerControls = () => {
     // Zeige Controls nur in der PLAYER_INPUT Phase, wenn noch kein Timer läuft
     if (gameState.phase !== GamePhase.PLAYER_INPUT || gameState.timerEndTime) return null;
     
     const isGM = localPlayerId === gameState.gameMasterId;
     const isAiMode = gameState.gameMode === 'ai';

     // Bedingung 1: KI Modus -> Host darf Timer starten (auch wenn er Spieler ist)
     if (isAiMode && isHost) return renderUI();

     // Bedingung 2: Klassik/Host Modus -> Der aktuelle Spielleiter darf Timer starten (wenn er kein Bot ist)
     if (!isAiMode && isGM) return renderUI();
     
     return null;

     function renderUI() {
         return (
            // Positionierung: Auf Mobile unten mittig, auf Desktop oben links.
            <div className="fixed z-40 w-full max-w-sm px-4 bottom-6 left-1/2 -translate-x-1/2 md:top-32 md:left-8 md:bottom-auto md:translate-x-0 md:w-auto md:max-w-xs animate-fade-in-down pointer-events-none">
               <div className="bg-brand-dark/95 backdrop-blur-xl border border-white/20 p-3 rounded-2xl shadow-2xl flex flex-row items-center justify-between gap-4 pointer-events-auto ring-4 ring-black/20">
                  <div className="flex items-center gap-2 text-brand-accent font-bold uppercase text-xs whitespace-nowrap">
                     <Timer size={16} /> Timer:
                  </div>
                  <div className="flex gap-2 w-full justify-end">
                    {[10, 30, 60].map(sec => (
                        <Button 
                           key={sec}
                           onClick={() => dispatch({ type: 'START_TIMER', payload: { duration: sec } })}
                           className="flex-1 sm:flex-none py-1.5 text-xs h-9 min-w-[40px]"
                           variant="secondary"
                        >
                           {sec}
                        </Button>
                    ))}
                  </div>
               </div>
            </div>
         );
     }
  };

  const renderRulesModal = () => {
      if (!gameState.showRules) return null;

      return (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-brand-dark border-2 border-brand-accent rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
                <button 
                  onClick={() => isHost ? dispatch({ type: 'TOGGLE_RULES', payload: { show: false } }) : setGameState(s => ({...s, showRules: false}))}
                  className="absolute top-4 right-4 text-white/50 hover:text-white bg-black/20 rounded-full p-2 hover:bg-black/40 transition-all z-10"
                >
                    <X size={24} />
                </button>
                
                <div className="p-8">
                   <div className="text-center mb-8">
                      <h2 className="text-3xl font-black font-serif text-brand-accent mb-2 uppercase tracking-wide">Spielregeln</h2>
                      <p className="text-purple-300 italic">Wie man "Nobody's Perfect" gewinnt</p>
                   </div>

                   <div className="grid gap-6 md:grid-cols-2">
                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="flex items-center gap-3 mb-3 text-brand-accent">
                            <HelpCircle size={28} />
                            <h3 className="text-xl font-bold">1. Die kuriose Frage</h3>
                         </div>
                         <p className="text-gray-300 text-sm leading-relaxed">
                            Der Spielleiter (oder die KI) stellt eine seltsame Frage, auf die niemand die Antwort kennt.
                         </p>
                      </div>

                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="flex items-center gap-3 mb-3 text-brand-accent">
                            <PenTool size={28} />
                            <h3 className="text-xl font-bold">2. Kreativ Lügen</h3>
                         </div>
                         <p className="text-gray-300 text-sm leading-relaxed">
                            Erfinde eine Antwort, die <b>glaubwürdig</b> klingt! Ziel ist es, dass die anderen Spieler auf deine Lüge hereinfallen.
                         </p>
                      </div>

                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="flex items-center gap-3 mb-3 text-brand-accent">
                            <CheckCircle2 size={28} />
                            <h3 className="text-xl font-bold">3. Die Wahrheit finden</h3>
                         </div>
                         <p className="text-gray-300 text-sm leading-relaxed">
                            Alle Antworten werden gemischt (inklusive der Wahrheit). Versuche, die <b>echte</b> Antwort zu erraten.
                         </p>
                      </div>

                      <div className="bg-white/5 p-5 rounded-2xl border border-white/10">
                         <div className="flex items-center gap-3 mb-3 text-brand-accent">
                            <Medal size={28} />
                            <h3 className="text-xl font-bold">4. Punkte sammeln</h3>
                         </div>
                         <ul className="text-gray-300 text-sm space-y-2">
                            <li className="flex gap-2"><span>✅</span> <b>+1 Punkt</b> wenn du die Wahrheit tippst.</li>
                            <li className="flex gap-2"><span>😈</span> <b>+1 Punkt</b> für jeden Spieler, der auf deine Lüge reinfällt.</li>
                         </ul>
                      </div>
                   </div>

                   {isHost && (
                       <div className="mt-8 text-center">
                          <Button onClick={() => dispatch({ type: 'TOGGLE_RULES', payload: { show: false } })} className="px-8">
                             Alles klar, verstanden!
                          </Button>
                          <p className="text-[10px] text-white/30 mt-2 uppercase tracking-widest">Nur der Host kann dieses Fenster für alle schließen</p>
                       </div>
                   )}
                   {!isHost && (
                       <div className="mt-8 text-center text-purple-300 animate-pulse text-sm">
                          Warte auf den Host, um das Spiel fortzusetzen...
                       </div>
                   )}
                </div>
             </div>
          </div>
      );
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 font-sans pb-40 relative overflow-x-hidden ${gameState.isHarryPotterMode ? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900 via-slate-900 to-slate-950 text-amber-50' : 'bg-brand-dark text-brand-light'}`}>
      {renderRulesModal()}

      {localPlayerId && (
        <div className="fixed top-2 right-2 md:top-6 md:right-6 z-50">
            <button onClick={leaveSession} className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg border-2 border-red-400"><LogOut size={24} /></button>
        </div>
      )}
      {isHost && <div className="fixed top-2 left-2 md:top-6 md:left-6 text-[10px] md:text-xs text-white/30 font-mono tracking-widest uppercase z-50 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/5 shadow-sm">RAUM: {roomCode}</div>}

      <div className="max-w-4xl mx-auto">
        {gameState.phase === GamePhase.LOBBY && <Lobby players={gameState.players} localPlayerId={localPlayerId} onJoin={joinGame} onCreate={createGame} onStartGame={(m) => dispatch({ type: 'START_GAME', payload: { mode: m } })} onRemovePlayer={(pid) => dispatch({ type: 'REMOVE_PLAYER', payload: { playerId: pid } })} onUpdatePlayer={(u) => dispatch({ type: 'UPDATE_PLAYER', payload: { playerId: localPlayerId!, ...u } })} onAddBot={(p) => addBot(p)} onToggleTrollMode={(e) => dispatch({ type: 'TOGGLE_TROLL_MODE', payload: { enable: e } })} onToggleHPMode={(e) => dispatch({ type: 'TOGGLE_HP_MODE', payload: { enable: e } })} onToggleRules={(show) => dispatch({ type: 'TOGGLE_RULES', payload: { show } })} isHost={isHost} roomCode={roomCode} connectionStatus={connectionStatus} />}

        {localPlayerId && gameState.phase !== GamePhase.LOBBY && (
          <div className="animate-fade-in">
             {gameState.phase === GamePhase.GM_INPUT && (
              (localPlayerId === gameState.gameMasterId && !isAiGm) ? (
                <div className="space-y-4">
                  <div className="flex justify-end"><Button variant="secondary" className="text-xs" onClick={async () => { const d = await generateAiContent("random"); dispatch({ type: 'SUBMIT_GM', payload: { question: d.question, correct: d.correctAnswer, fake: "", category: d.category } }); }} disabled={isAiLoading}>{isAiLoading ? <Loader2 className="animate-spin mr-2" /> : <Wand2 size={14} className="mr-2" />}KI-Vorschlag</Button></div>
                  <GameMasterInput gameMaster={gm!} onSubmit={(q, a, f, c) => dispatch({ type: 'SUBMIT_GM', payload: { question: q, correct: a, fake: f, category: c } })} isHost={isHost} isHarryPotterMode={gameState.isHarryPotterMode} />
                </div>
              ) : (
                <div className="text-center pt-20"><Avatar avatar={isAiGm ? "https://robohash.org/AI?set=set4" : (gm?.avatar || "")} size="3xl" className="mx-auto mb-6 border-8 border-brand-dark" /><h2 className="text-3xl font-bold">{isAiGm ? "KI-Monster" : gm?.name} wählt eine Frage...</h2></div>
              )
            )}
            
            {gameState.phase === GamePhase.PLAYER_INPUT && (
              localPlayerId === gameState.gameMasterId ? (
                <div className="text-center pt-10">
                   <Avatar avatar={gm?.avatar || ""} size="3xl" className="mx-auto mb-8 border-8 border-brand-dark" />
                   <h2 className="text-3xl font-bold mb-8">Spieler überlegen...</h2>
                   <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {gameState.players.filter(p => !p.isHeckler && p.id !== gameState.gameMasterId).map(p => {
                        const sub = gameState.submittedAnswers.some(a => a.authorId === p.id);
                        return (
                          <div key={p.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${sub ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-white/5 border-white/10 text-white/50'}`}>
                             <Avatar avatar={p.avatar} size="sm" /><div className="flex-1 text-left"><p className="font-bold truncate">{p.name}</p></div>{sub && <CheckCircle2 size={20} className="text-green-500" />}
                          </div>
                        );
                      })}
                   </div>
                   <p className="text-purple-300 mt-10 flex items-center justify-center gap-2"><Eye className="animate-pulse" /> Du bist der Spielleiter.</p>
                </div>
              ) : gameState.participantIds.includes(localPlayerId) ? <PlayerInput player={gameState.players.find(p => p.id === localPlayerId)!} question={gameState.question} onSubmit={(t) => dispatch({ type: 'SUBMIT_FAKE', payload: { playerId: localPlayerId!, text: cleanAnswer(t) } })} hasSubmitted={gameState.submittedAnswers.some(a => a.authorId === localPlayerId)} timerEndTime={gameState.timerEndTime} timerTotal={gameState.timerDuration} /> : <div className="text-center pt-20"><Users size={60} className="mx-auto mb-4 text-brand-accent animate-pulse" /><h2 className="text-2xl font-bold">Du schaust gerade zu...</h2></div>
            )}

            {renderTimerControls()}

            {gameState.phase === GamePhase.VOTING && (
              (gameState.participantIds.includes(localPlayerId) || localPlayerId === gameState.gameMasterId) ? <Voting player={gameState.players.find(p => p.id === localPlayerId)!} question={gameState.question} answers={gameState.submittedAnswers} onSubmitVote={(aid) => dispatch({ type: 'VOTE', payload: { playerId: localPlayerId!, answerId: aid } })} hasVoted={!!gameState.votes[localPlayerId!]} isGameMaster={(localPlayerId === gameState.gameMasterId)} votes={gameState.votes} players={gameState.players} /> : <div className="text-center pt-20"><h2 className="text-2xl font-bold">Abstimmung...</h2></div>
            )}

            {gameState.phase === GamePhase.RESOLUTION && <Resolution localPlayerId={localPlayerId} question={gameState.question} correctAnswerText={gameState.correctAnswerText} answers={gameState.submittedAnswers} players={gameState.players} votes={gameState.votes} onNextRound={() => dispatch({ type: 'NEXT_ROUND' })} onRevealAnswer={(aid) => dispatch({ type: 'REVEAL_ANSWER', payload: { answerId: aid } })} onAwardPoint={(pid) => dispatch({ type: 'AWARD_POINT', payload: { playerId: pid } })} onEndGame={() => dispatch({ type: 'END_GAME' })} isHost={isHost} revealedAnswerIds={gameState.revealedAnswerIds} gameMasterId={gameState.gameMasterId} awardedBonusIds={gameState.awardedBonusIds} roastData={gameState.roastData} gameMode={gameState.gameMode} isHarryPotterMode={gameState.isHarryPotterMode} />}

            {gameState.phase === GamePhase.FINAL_LEADERBOARD && <FinalLeaderboard players={gameState.players} onReset={() => dispatch({ type: 'RESET_GAME' })} isHost={isHost} history={gameState.history} gameMode={gameState.gameMode} />}
          </div>
        )}

        {localPlayerId && isHost && (
          <div className="mt-20 border-t border-white/10 pt-10">
             <div className="flex items-center gap-2 text-xs font-black uppercase text-brand-accent mb-4"><Settings size={14}/> Admin</div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {gameState.players.map(p => (
                 <div key={p.id} className={`p-4 rounded-xl flex items-center justify-between border ${p.id === localPlayerId ? 'bg-brand-accent/10 border-brand-accent' : 'bg-white/5'}`}>
                   <div className="flex items-center gap-3"><Avatar avatar={p.avatar} size="sm" /><span className="text-sm font-bold">{p.name} {p.id === localPlayerId && "(Du)"}</span></div>
                   {p.id !== localPlayerId && <button onClick={() => dispatch({ type: 'REMOVE_PLAYER', payload: { playerId: p.id } })} className="p-2 text-red-500"><UserX size={18} /></button>}
                 </div>
               ))}
             </div>
          </div>
        )}
      </div>
    </div>
  );

  function addBot(personality: BotPersonality) {
    const existing = gameState.players.map(pl => pl.name);
    let pool: string[] = [];

    if (personality === 'beginner') {
        pool = ["Ahnungslose Anne", "Planloser Paul", "Verwirrter Volker", "Naive Nina", "Rate-Rudi"];
    } else if (personality === 'pro') {
        pool = ["Lexikon-Lisa", "Fakten-Frank", "Wissens-Willi", "Professor Primus", "Schlaue Sarah"];
    } else if (personality === 'troll') {
        pool = ["Chaos-Caspar", "Troll-Torben", "Witz-Walter", "Spam-Susi", "Joker-Jonas"];
    } else {
        pool = ["Bluff-Boris", "Rate-Ralf", "Schlau-Schlumpf", "Mogel-Moritz"];
    }

    const available = pool.filter(n => !existing.includes(n));
    const n = available.length > 0 
        ? available[Math.floor(Math.random() * available.length)] 
        : `${personality === 'pro' ? 'Profi' : personality === 'beginner' ? 'Noob' : 'Bot'} ${Math.floor(Math.random() * 100)}`;

    // Random Monster Avatar for Bots
    const av = AVATAR_IMAGES.find(c => !gameState.players.map(pl => pl.avatar).includes(c)) || AVATAR_IMAGES[Math.floor(Math.random() * AVATAR_IMAGES.length)];
    
    dispatch({ type: 'ADD_BOT', payload: { botId: `bot-${Math.random().toString(36).substr(2,9)}`, name: n, avatar: av, personality } });
  }
};

export default App;
