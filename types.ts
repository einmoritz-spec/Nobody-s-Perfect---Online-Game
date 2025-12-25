
export type PlayerId = string;

export type BotPersonality = 'beginner' | 'pro' | 'troll';

export type GameMode = 'classic' | 'host' | 'ai';

export interface Player {
  id: PlayerId;
  name: string;
  score: number;
  avatar: string; // URL oder Hex-Code
  isHost?: boolean;
  isBot?: boolean;
  botPersonality?: BotPersonality;
  isHeckler?: boolean; // Neuer Flag für den reinen Zuschauer-Troll
}

// Monster Avatar URLs
export const AVATAR_IMAGES = [
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_1.jpg",
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_2.jpg",
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_3.jpg",
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_4.jpg",
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_5.jpg",
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_6.jpg",
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_7.jpg",
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_8.jpg",
  "https://raw.githubusercontent.com/einmoritz-spec/Monster-Avatar-assets/main/monster_9.jpg"
];

export enum GamePhase {
  LOBBY = 'LOBBY',
  GM_INPUT = 'GM_INPUT',
  PLAYER_INPUT = 'PLAYER_INPUT',
  VOTING = 'VOTING',
  RESOLUTION = 'RESOLUTION',
  FINAL_LEADERBOARD = 'FINAL_LEADERBOARD',
}

export interface Answer {
  id: string;
  text: string;
  authorId: PlayerId | 'GAME' | 'AI';
  isCorrect: boolean;
}

export interface RoundHistory {
  question: string;
  correctAnswerText: string;
  answers: Answer[];
  votes: Record<PlayerId, string>;
  roastTargetId?: PlayerId;
}

export interface GameState {
  players: Player[];
  gameMasterId: PlayerId | null;
  phase: GamePhase;
  currentRound: number;
  question: string;
  correctAnswerText: string;
  gmFakeAnswer: string;
  category: string;
  participantIds: PlayerId[];
  submittedAnswers: Answer[];
  votes: Record<PlayerId, string>;
  revealedAnswerIds: string[]; 
  awardedBonusIds: PlayerId[];
  lastUpdated: number;
  isAiGameMasterMode: boolean; // Bleibt für Kompatibilität, wird durch gameMode gesteuert
  gameMode: GameMode; // Neuer Modus
  timerEndTime: number | null; // Neuer Timer State
  timerDuration: number | null; // Gesamtdauer des Timers für Progress Bar
  showRules: boolean; // Zeigt das Regelfenster für alle an
  isHarryPotterMode?: boolean; // Neuer Harry Potter Modus Flag
  roastData?: {
    targetName: string;
    botName: string;
    text: string;
    answerId: string; // ID der Antwort, die den Roast auslöst
  } | null;
  finalRoast?: string | null; // Neuer Roast für das Ende
  history: RoundHistory[];
}

export type NetworkAction = 
  | { type: 'JOIN'; payload: Player }
  | { type: 'UPDATE_PLAYER'; payload: { playerId: string; avatar?: string; name?: string } }
  | { type: 'REMOVE_PLAYER'; payload: { playerId: string } }
  | { type: 'ADD_BOT'; payload: { botId: string; name: string; avatar: string; personality: BotPersonality } }
  | { type: 'TOGGLE_TROLL_MODE'; payload: { enable: boolean } } 
  | { type: 'TOGGLE_HP_MODE'; payload: { enable: boolean } }
  | { type: 'START_GAME'; payload: { mode: GameMode } } // Payload geändert
  | { type: 'SUBMIT_GM'; payload: { question: string; correct: string; fake: string; category: string } }
  | { type: 'SUBMIT_FAKE'; payload: { playerId: string; text: string } }
  | { type: 'VOTE'; payload: { playerId: string; answerId: string } }
  | { type: 'AWARD_POINT'; payload: { playerId: string } }
  | { type: 'REVEAL_ANSWER'; payload: { answerId: string } }
  | { type: 'NEXT_ROUND' }
  | { type: 'END_GAME' }
  | { type: 'RESET_GAME' }
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'START_TIMER'; payload: { duration: number } } // Neue Timer Action
  | { type: 'SET_ROAST'; payload: { targetName: string; botName: string; text: string; answerId: string } }
  | { type: 'SET_FINAL_ROAST'; payload: { text: string } }
  | { type: 'TOGGLE_RULES'; payload: { show: boolean } }
  | { type: 'PING' };
