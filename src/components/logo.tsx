import { Factory } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Factory className="h-7 w-7 text-primary" />
      <h1 className="text-xl font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
        USINAGEM
      </h1>
    </div>
  );
}
