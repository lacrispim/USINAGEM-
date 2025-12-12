'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface ProductionTimerProps {
  title: string;
}

export function ProductionTimer({ title }: ProductionTimerProps) {
  const [timeInSeconds, setTimeInSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        setTimeInSeconds((prevTime) => prevTime + 1);
      }, 1000);
    } else if (!isActive && timeInSeconds !== 0) {
      if (interval) {
        clearInterval(interval);
      }
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, timeInSeconds]);

  const handleStartPause = useCallback(() => {
    setIsActive((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsActive(false);
    setTimeInSeconds(0);
  }, []);

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
          <Button onClick={handleStartPause}>
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
          <Button variant="secondary" onClick={handleReset}>
            <RotateCcw className="mr-2" /> Zerar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
