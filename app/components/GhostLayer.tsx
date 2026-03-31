"use client";

interface Props {
  words: string[];
}

// Deterministic pseudo-random placement based on word + index
function ghostStyle(word: string, i: number) {
  const seed = i * 137 + word.charCodeAt(0) * 31 + word.length * 17;
  const top = ((seed * 7 + 23) % 85) + 5;
  const left = ((seed * 13 + 17) % 90) - 5;
  const rotate = (((seed * 3) % 20) - 10) * 0.7;
  const size = 100 + ((seed * 11) % 120);
  const opacity = 0.022 + (i % 4) * 0.008;

  return {
    top: `${top}%`,
    left: `${left}%`,
    fontSize: `${size}px`,
    transform: `rotate(${rotate}deg)`,
    opacity,
  };
}

export default function GhostLayer({ words }: Props) {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 select-none"
      aria-hidden="true"
    >
      {words.map((word, i) => (
        <span
          key={i}
          className="absolute font-display font-black text-fg whitespace-nowrap"
          style={ghostStyle(word, i)}
        >
          {word}
        </span>
      ))}
    </div>
  );
}
