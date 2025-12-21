import { useEffect, useState } from "react";
import AiIcon from "./icons/AiIcon";
import { InlineSpacer } from "./InlineSpacer";

interface AIProgressBoxProps {
  messages: string[];
  messageDuration?: number;
}

export function AIProgressBox({
  messages,
  messageDuration = 6000
}: AIProgressBoxProps) {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => {
        if (prev !== messages.length - 1) { return prev + 1 }
        return prev;
      });
    }, messageDuration);

    return () => clearInterval(interval);
  }, [messages.length, messageDuration]);

  return (
    <div className="ai-progress-box">
      <div className="ai-progress-box__gradient-wrapper">
        <div className="ai-progress-box__content-wrapper">
          <div className="flex align-top">
            <span className="animate-pulse">
              <AiIcon color="var(--text-color-accent)" size={24} />
            </span>
            <InlineSpacer size={1} />
            <p className="font-semibold text-secondary">
              {messages[currentMessageIndex] + "..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
