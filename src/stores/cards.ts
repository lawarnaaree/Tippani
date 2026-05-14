import { create } from "zustand";

export type CardState = {
  cardId: string;
  repetitions: number;
  easinessFactor: number;
  intervalDays: number;
  nextReviewDate: number; // Unix ms
};

type CardsStoreState = {
  cards: Record<string, CardState>;
  recordReview: (cardId: string, grade: 0 | 1 | 2 | 3 | 4 | 5) => void;
  getDueCards: () => CardState[];
  getCardState: (cardId: string) => CardState;
  getDueCount: () => number;
};

const STORAGE_KEY = "tippani.cards";

function defaultCard(cardId: string): CardState {
  return {
    cardId,
    repetitions: 0,
    easinessFactor: 2.5,
    intervalDays: 1,
    nextReviewDate: Date.now(),
  };
}

function loadCards(): Record<string, CardState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CardState>) : {};
  } catch {
    return {};
  }
}

function persistCards(cards: Record<string, CardState>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // ignore storage errors
  }
}

// SM-2 algorithm
function sm2(card: CardState, grade: 0 | 1 | 2 | 3 | 4 | 5): CardState {
  let { repetitions, easinessFactor, intervalDays } = card;

  if (grade >= 3) {
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easinessFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    intervalDays = 1;
  }

  easinessFactor = Math.max(
    1.3,
    easinessFactor + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02),
  );

  const nextReviewDate = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
  return { ...card, repetitions, easinessFactor, intervalDays, nextReviewDate };
}

export const useCards = create<CardsStoreState>((set, get) => ({
  cards: loadCards(),

  recordReview: (cardId, grade) => {
    const existing = get().getCardState(cardId);
    const updated = sm2(existing, grade);
    const cards = { ...get().cards, [cardId]: updated };
    persistCards(cards);
    set({ cards });
  },

  getCardState: (cardId) => {
    return get().cards[cardId] ?? defaultCard(cardId);
  },

  getDueCards: () => {
    const now = Date.now();
    return Object.values(get().cards).filter((c) => c.nextReviewDate <= now);
  },

  getDueCount: () => get().getDueCards().length,
}));
