
import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Crown, CheckCircle2, HelpCircle, Dice5, BookOpen, Gavel, Sparkles, Globe, Megaphone, Briefcase, Wand2 } from 'lucide-react';
import { QUESTIONS, CATEGORIES, HP_QUESTIONS } from '../questions';

interface GameMasterInputProps {
  gameMaster: Player;
  onSubmit: (question: string, correctAnswer: string, gmFake: string, category: string) => void;
  isHost: boolean;
  isHarryPotterMode?: boolean; // Neu
}

export const GameMasterInput: React.FC<GameMasterInputProps> = ({ gameMaster, onSubmit, isHost, isHarryPotterMode }) => {
  const [question, setQuestion] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [gmFake, setGmFake] = useState('');
  const [category, setCategory] = useState(isHarryPotterMode ? 'harry_potter' : 'words');

  // Wenn der Modus wechselt, Kategorie anpassen
  useEffect(() => {
    if (isHarryPotterMode) {
        setCategory('harry_potter');
    } else if (category === 'harry_potter') {
        setCategory('words');
    }
  }, [isHarryPotterMode]);

  const pickRandom = () => {
    // Wenn HP Modus an ist, nutze HP_QUESTIONS
    const pool = isHarryPotterMode ? HP_QUESTIONS : (QUESTIONS[category] || QUESTIONS.words);
    const randomIdx = Math.floor(Math.random() * pool.length);
    const q = pool[randomIdx];
    setQuestion(q.q);
    setCorrectAnswer(q.a);
    setGmFake('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question && correctAnswer) {
      onSubmit(question, correctAnswer, gmFake, category);
    }
  };

  return (
    <div className="max-w-xl mx-auto animate-fade-in-up">
      <div className="bg-brand-accent/20 border border-brand-accent/30 rounded-lg p-4 mb-6 flex items-center gap-4">
        <div className="bg-brand-accent text-brand-dark p-2 rounded-full">
          {isHarryPotterMode ? <Wand2 size={24} /> : <Crown size={24} />}
        </div>
        <div>
          <h3 className="font-bold text-brand-accent">Spielleiter: {gameMaster.name}</h3>
          <p className="text-sm text-gray-300">
            {isHarryPotterMode 
                ? "Zaubere eine Frage aus dem Hut." 
                : "Wähle eine Kategorie oder gib eine eigene Frage ein."}
          </p>
        </div>
      </div>

      <Card title={isHarryPotterMode ? "Harry Potter Modus" : "Die Runde vorbereiten"}>
        <div className="mb-6 space-y-4">
          <label className="text-sm font-medium text-purple-200 block text-center uppercase tracking-widest">Kategorie wählen</label>
          
          {isHarryPotterMode ? (
              <div className="flex justify-center">
                  <button
                    type="button"
                    className="flex flex-col items-center p-4 rounded-xl border-2 bg-amber-500 border-amber-400 text-brand-dark shadow-lg scale-105"
                  >
                    <Wand2 size={24} className="mb-2" />
                    <span className="text-xs font-bold uppercase text-center leading-tight">Magisches Wissen</span>
                  </button>
              </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {CATEGORIES.map(cat => (
                <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                    category === cat.id 
                        ? 'bg-brand-accent border-brand-accent text-brand-dark shadow-lg scale-105' 
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500'
                    }`}
                >
                    {cat.id === 'words' && <BookOpen size={20} className="mb-1" />}
                    {cat.id === 'laws' && <Gavel size={20} className="mb-1" />}
                    {cat.id === 'facts' && <Sparkles size={20} className="mb-1" />}
                    {cat.id === 'traditions' && <Globe size={20} className="mb-1" />}
                    {cat.id === 'slogans' && <Megaphone size={20} className="mb-1" />}
                    {cat.id === 'jobs' && <Briefcase size={20} className="mb-1" />}
                    <span className="text-[9px] font-bold uppercase text-center leading-tight">{cat.name}</span>
                </button>
                ))}
            </div>
          )}

          <div className="flex justify-center">
             <Button type="button" onClick={pickRandom} variant="secondary" className="text-sm py-2 px-4">
              <Dice5 size={18} className="mr-2 inline" /> 
              {isHarryPotterMode ? "Zufällige Zauber-Frage" : `Zufällige Frage (${CATEGORIES.find(c => c.id === category)?.name})`}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-purple-200">
              <HelpCircle size={16} />
              Die Frage / Das Rätsel
            </label>
            <textarea
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={isHarryPotterMode ? "Was bewirkt der Zauberspruch..." : "Stell eine Frage oder nenne ein Gesetz..."}
              className="w-full px-4 py-3 rounded-xl bg-purple-950/50 border border-purple-500 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-brand-accent min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-green-300">
              <CheckCircle2 size={16} />
              Die richtige Auflösung
            </label>
            <textarea
              required
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              placeholder="Die Wahrheit..."
              className="w-full px-4 py-3 rounded-xl bg-purple-950/50 border border-green-700/50 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[60px]"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-yellow-200">
               Deine Täuschung (Optional)
            </label>
            <input
              type="text"
              value={gmFake}
              onChange={(e) => setGmFake(e.target.value)}
              placeholder="Zusätzlicher Bluff des Spielleiters"
              className="w-full px-4 py-3 rounded-xl bg-purple-950/50 border border-yellow-700/50 text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
          </div>

          <Button type="submit" fullWidth>
            Runde für alle starten
          </Button>
        </form>
      </Card>
    </div>
  );
};
