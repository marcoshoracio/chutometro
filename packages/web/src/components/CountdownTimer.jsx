import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ kickoffAt, className = '' }) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const deadline = kickoffAt - 1800; // 30 min before

    function update() {
      const now = Math.floor(Date.now() / 1000);
      const diff = deadline - now;
      setTimeLeft(diff);
    }

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [kickoffAt]);

  if (timeLeft === null) return null;

  if (timeLeft <= 0) {
    return (
      <span className={`text-red-400 font-semibold text-xs ${className}`}>
        ENCERRADO
      </span>
    );
  }

  const h = Math.floor(timeLeft / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;

  let display;
  if (h > 0) {
    display = `Fecha em ${h}h ${m}m`;
  } else if (m > 0) {
    display = `Fecha em ${m}m ${s}s`;
  } else {
    display = `Fecha em ${s}s`;
  }

  const urgent = timeLeft < 3600;

  return (
    <span className={`text-xs font-medium ${urgent ? 'text-gold animate-pulse' : 'text-pitch-light'} ${className}`}>
      {display}
    </span>
  );
}
