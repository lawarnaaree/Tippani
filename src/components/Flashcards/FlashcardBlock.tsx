import { useState } from "react";
import { useCards } from "../../stores/cards";

type Props = {
  cardId: string;
  front: string;
  back: string;
  noteIndex: number;
};

export function FlashcardBlock({ cardId, front, back }: Props) {
  const [flipped, setFlipped] = useState(false);
  const cardState = useCards((s) => s.getCardState(cardId));

  const nextDate = new Date(cardState.nextReviewDate);
  const isDue = cardState.nextReviewDate <= Date.now();

  return (
    <div className="tippani-flashcard">
      <div className="tippani-flashcard-front">
        <div style={{ fontSize: 11, color: "var(--tippani-muted)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <span>Flashcard</span>
          {isDue && (
            <span style={{ background: "var(--tippani-accent)", color: "var(--tippani-bg)", borderRadius: 3, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>
              Due
            </span>
          )}
          {!isDue && (
            <span style={{ color: "var(--tippani-muted)", fontSize: 10 }}>
              Next: {nextDate.toLocaleDateString()}
            </span>
          )}
        </div>
        <div>{front}</div>
      </div>
      <div className={`tippani-flashcard-back${flipped ? "" : " hidden"}`}>
        {back}
      </div>
      <div className="tippani-flashcard-actions">
        <button
          className="tippani-flashcard-flip"
          onClick={() => setFlipped((f) => !f)}
        >
          {flipped ? "Hide answer" : "Show answer"}
        </button>
      </div>
    </div>
  );
}
