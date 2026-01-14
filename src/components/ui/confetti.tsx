"use client";

import React, { useEffect, useState } from "react";
import ReactConfetti from "react-confetti";
import { useWindowSize } from "react-use";

interface ConfettiProps {
  onComplete?: () => void;
  recycle?: boolean;
  duration?: number; // in milliseconds
}

export function Confetti({
  onComplete,
  recycle = false,
  duration = 5000,
}: ConfettiProps) {
  const { width, height } = useWindowSize();
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!recycle) {
      const timer = setTimeout(() => {
        setShow(false);
        if (onComplete) {
          onComplete();
        }
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [recycle, duration, onComplete]);

  if (!show) {
    return null;
  }

  return <ReactConfetti width={width} height={height} recycle={recycle} />;
}
