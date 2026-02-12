import confetti from "canvas-confetti";

export const fireDealWonConfetti = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ["#22c55e", "#eab308", "#3b82f6", "#f97316", "#a855f7"];

  const frame = () => {
    confetti({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  // Big initial burst
  confetti({
    particleCount: 100,
    spread: 100,
    origin: { y: 0.6 },
    colors,
  });

  frame();
};
