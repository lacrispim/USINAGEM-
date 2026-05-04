'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader, 
  Clock, 
  Calendar as CalendarIcon,
  Factory,
  User,
  Info
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  parse, 
  isToday 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';

interface PlanejamentoItem {
  id: string;
  'Data Execução'?: string;
  Site?: string;
  Requisição?: string;
  'Nome da Peça'?: string;
  Quantidade?: number;
  'Perdas planejadas'?: string;
  'Horas Máquina'?: number | string;
  Técnicos?: string;
  Observação?: string;
  EQUIPAMENTO?: string;
  Turno?: string | number; // Adicionado suporte a campo de turno se disponível
}

const turnos = [
  { id: '1', label: '1º Turno', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: '2', label: '2º Turno', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { id: '3', label: '3º Turno', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
];

export default function ProgrammingPage() {
  const database = useDatabase();
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (!database) {
      setLoading(false);
      return;
    }

    const dbRef = ref(database, '/Planejamento S');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const dataArray: PlanejamentoItem[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key],
        }));
        setPlanejamentoData(dataArray);
      } else {
        setPlanejamentoData([]);
      }
      setLoading(false);
    }, (error) => {
      console.error(error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [database]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  const getItemsForDay = (day: Date) => {
    return planejamentoData.filter(item => {
      const dateStr = item['Data Execução'];
      if (!dateStr) return false;
      try {
        const parsedDate = parse(dateStr, 'dd/MM/yyyy', new Date());
        return isSameDay(parsedDate, day);
      } catch {
        const fallbackDate = new Date(dateStr);
        return isSameDay(fallbackDate, day);
      }
    });
  };

  const renderEvent = (item: PlanejamentoItem) => (
    <TooltipProvider key={item.id}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="mb-1 cursor-help truncate rounded border border-border bg-card p-1 text-[10px] leading-tight shadow-sm hover:border-primary/50 transition-colors">
            <span className="font-bold text-primary mr-1">{item['Requisição']}</span>
            <span>{item['Nome da Peça']}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-64 p-3" side="right">
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b pb-1">
              <span className="font-bold text-sm">Req: {item['Requisição']}</span>
              <Badge variant="outline" className="text-[10px]">{item['Site']}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Factory className="h-3 w-3" />
                <span>Equip:</span>
              </div>
              <span className="font-medium text-right">{item['EQUIPAMENTO'] || 'N/A'}</span>
              
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Horas:</span>
              </div>
              <span className="font-medium text-right">{item['Horas Máquina'] || '0'}h</span>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <User className="h-3 w-3" />
                <span>Técnico:</span>
              </div>
              <span className="font-medium text-right truncate">{item['Técnicos'] || 'Não definido'}</span>
            </div>
            {item['Observação'] && (
              <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground italic">
                "{item['Observação']}"
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planejamento de Produção</h1>
          <p className="text-muted-foreground">Visualização mensal do plano mestre por turnos.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-[140px] text-center font-bold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </div>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="secondary" size="sm" onClick={goToToday} className="h-8">
            Hoje
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-[600px] items-center justify-center gap-2 bg-card rounded-lg border">
              <Loader className="h-8 w-8 animate-spin text-primary" />
              <span className="font-medium">Carregando planejamento...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border overflow-hidden rounded-lg border shadow-lg">
              {/* Cabeçalho da Semana */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-muted/50 p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {day}
                </div>
              ))}

              {/* Dias do Calendário */}
              {calendarDays.map((day, dayIdx) => {
                const dayItems = getItemsForDay(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toString()}
                    className={cn(
                      "min-h-[160px] bg-card p-1 flex flex-col gap-1 transition-colors",
                      !isCurrentMonth && "bg-muted/30 opacity-50",
                      isTodayDate && "ring-1 ring-inset ring-primary z-10"
                    )}
                  >
                    <div className="flex items-center justify-between p-1">
                      <span className={cn(
                        "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full",
                        isTodayDate ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayItems.length > 0 && (
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 rounded-full">
                          {dayItems.length}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[150px] scrollbar-hide">
                      {turnos.map(turno => {
                        // Se o item tiver um campo 'Turno' que corresponda, filtramos aqui. 
                        // Caso contrário, mostramos no 1º turno por padrão ou distribuímos.
                        const itemsInTurno = dayItems.filter(item => {
                          if (!item.Turno) return turno.id === '1'; // Default para 1º turno
                          return String(item.Turno) === turno.id;
                        });

                        return (
                          <div key={turno.id} className="space-y-1">
                            <div className={cn(
                              "text-[8px] px-1 py-0.5 rounded border font-bold uppercase tracking-tighter",
                              turno.color
                            )}>
                              {turno.label}
                            </div>
                            <div className="min-h-[10px]">
                              {itemsInTurno.map(item => renderEvent(item))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda e Dicas */}
      <div className="flex flex-wrap gap-4 items-center p-4 bg-muted/30 rounded-lg border border-dashed">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>Dica: Passe o mouse sobre uma ordem de produção para ver os detalhes completos.</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          {turnos.map(t => (
            <div key={t.id} className="flex items-center gap-1.5 text-xs">
              <div className={cn("w-3 h-3 rounded-sm border", t.color.split(' ')[0])} />
              <span className="text-muted-foreground">{t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
