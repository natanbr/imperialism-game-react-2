import React from "react";
import { useGameStore } from "@/store/rootStore";
import { eventText, refusalText } from "../gameText";

/** The last refused order and the news of the last resolved turn (FR-024). */
export const NewsPanel: React.FC = () => {
  const lastRejection = useGameStore((s) => s.lastRejection);
  const lastReport = useGameStore((s) => s.eventLog[s.eventLog.length - 1]);

  const news = lastReport ? lastReport.events.map(eventText).filter((line): line is string => line !== null) : [];

  return (
    <div className="news-panel" data-testid="news-panel">
      {lastRejection && (
        <div role="status" data-testid="order-refusal" className="news-refusal">
          {refusalText(lastRejection)}
        </div>
      )}
      {lastReport && (
        <div>
          <strong>
            News, turn {lastReport.turn} ({lastReport.year})
          </strong>
          {news.length > 0 ? (
            <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
              {news.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          ) : (
            <div>Nothing to report.</div>
          )}
        </div>
      )}
    </div>
  );
};
