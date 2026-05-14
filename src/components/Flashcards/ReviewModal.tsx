import { useState, useEffect } from "react";
import { useCards } from "../../stores/cards";
import { noteRead } from "../../lib/tauri";
import { splitMarkdown } from "../../lib/markdown";
import type { VaultEntry } from "../../lib/tauri";

type VaultCard = {
  cardId: string;
  front: string;
  back: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  entries: VaultEntry[];
  vaultPath?: string | null;
};

export function ReviewModal({ open, onClose, entries }: Props) {
  const [cards, setCards] = useState<VaultCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const recordReview = useCards((s) => s.recordReview);
  const getCardState = useCards((s) => s.getCardState);

  useEffect(() => {
    if (!open) return;

    async function loadCards() {
      setLoading(true);
      const now = Date.now();
      const allCards: VaultCard[] = [];

      function flatFiles(ents: VaultEntry[]): string[] {
        const paths: string[] = [];
        for (const e of ents) {
          if (e.kind === "file") paths.push(e.path);
          else if (e.children) paths.push(...flatFiles(e.children));
        }
        return paths;
      }

      const paths = flatFiles(entries);

      for (const p of paths) {
        try {
          const content = await noteRead(p);
          const segments = splitMarkdown(content);
          for (const seg of segments) {
            if (seg.kind === "card") {
              const state = getCardState(seg.key);
              if (state.nextReviewDate <= now) {
                allCards.push({ cardId: seg.key, front: seg.front, back: seg.back });
              }
            }
          }
        } catch {
          // skip unreadable files
        }
      }

      setCards(allCards);
      setCurrentIndex(0);
      setFlipped(false);
      setSessionDone(allCards.length === 0);
      setLoading(false);
    }

    void loadCards();
  }, [open]);

  if (!open) return null;

  function grade(g: 0 | 1 | 2 | 3 | 4 | 5) {
    const card = cards[currentIndex];
    if (!card) return;
    recordReview(card.cardId, g);
    const next = currentIndex + 1;
    if (next >= cards.length) {
      setSessionDone(true);
    } else {
      setCurrentIndex(next);
      setFlipped(false);
    }
  }

  const card = cards[currentIndex];
  const progress = cards.length > 0 ? (currentIndex / cards.length) * 100 : 100;

  return (
    <div className="tippani-review-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tippani-review-modal">
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            {sessionDone ? "Session complete" : `Card ${currentIndex + 1} of ${cards.length}`}
          </span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--tippani-muted)", fontSize: 18, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <div className="tippani-review-progress">
          <div className="tippani-review-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "var(--tippani-muted)", padding: "40px 0" }}>
            Loading cards…
          </div>
        )}

        {!loading && sessionDone && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>All caught up!</div>
            <div style={{ color: "var(--tippani-muted)", fontSize: 13, marginBottom: 20 }}>
              No more cards due for review.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: "8px 20px",
                borderRadius: 7,
                border: "1px solid var(--tippani-border)",
                background: "var(--tippani-bg)",
                color: "var(--tippani-fg)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            >
              Close
            </button>
          </div>
        )}

        {!loading && !sessionDone && card && (
          <>
            <div className="tippani-review-card-front">{card.front}</div>

            {flipped ? (
              <>
                <div className="tippani-review-card-back">{card.back}</div>
                <div className="tippani-review-grade-row">
                  <button className="tippani-review-grade-btn tippani-review-grade-again" onClick={() => grade(0)}>
                    Again<br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>&lt;1d</span>
                  </button>
                  <button className="tippani-review-grade-btn tippani-review-grade-hard" onClick={() => grade(2)}>
                    Hard<br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>~1d</span>
                  </button>
                  <button className="tippani-review-grade-btn tippani-review-grade-good" onClick={() => grade(4)}>
                    Good<br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>~{Math.round(useCards.getState().getCardState(card.cardId).intervalDays * useCards.getState().getCardState(card.cardId).easinessFactor)}d</span>
                  </button>
                  <button className="tippani-review-grade-btn tippani-review-grade-easy" onClick={() => grade(5)}>
                    Easy<br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>longer</span>
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", paddingTop: 20 }}>
                <button
                  className="tippani-flashcard-flip"
                  style={{ padding: "10px 28px", fontSize: 13 }}
                  onClick={() => setFlipped(true)}
                >
                  Show answer
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
