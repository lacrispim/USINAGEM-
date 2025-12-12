'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface ProductionTimerProps {
  title: string;
  initialTimeInMinutes: number;
  onTimeChange: (timeInMinutes: number) => void;
}

export function ProductionTimer({
  title,
  initialTimeInMinutes,
  onTimeChange,
}: ProductionTimerProps) {
  const [timeInSeconds, setTimeInSeconds] = useState(initialTimeInMinutes * 60);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setTimeInSeconds(initialTimeInMinutes * 60);
  }, [initialTimeInMinutes]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setTimeInSeconds((prevTime) => {
          const newTime = prevTime + 1;
          onTimeChange(Math.floor(newTime / 60));
          return newTime;
        });
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, onTimeChange]);

  const handleStartPause = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setTimeInSeconds(0);
    onTimeChange(0);
  }, [onTimeChange]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((totalSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  return (
    <Card className="bg-card-foreground/5">
      <CardContent className="p-4 text-center">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-4xl font-bold tracking-tighter">
          {formatTime(timeInSeconds)}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button type="button" onClick={handleStartPause}>
            {isActive ? (
              <>
                <Pause className="mr-2" /> Pausar
              </>
            ) : (
              <>
                <Play className="mr-2" /> Iniciar
              </>
            )}
          </Button>
          <Button type="button" variant="secondary" onClick={handleReset}>
            <RotateCcw className="mr-2" /> Zerar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
