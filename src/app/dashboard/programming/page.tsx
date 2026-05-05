
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
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
  Info,
  Plus,
  Trash2,
  Cpu,
  Settings2,
  Filter,
  CheckCircle2
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
  isToday,
  getISOWeek
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ResponsiveContainer, 
  BarChart,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  LabelList
} from 'recharts';
import { Label } from '@/components/ui/label';

interface PlanejamentoItem {
  id: string;
  'Data Execução'?: string;
  dataExecucao?: string;
  Site?: string;
  site?: string;
  'Requisição'?: string;
  requisicao?: string;
  'Nome da Peça'?: string;
  nomeDaPeca?: string;
  Quantidade?: number;
  quantidade?: number;
  'Quantidade Realizada'?: number;
  quantidadeRealizada?: number;
  'Perdas planejadas'?: string;
  'Horas Máquina'?: number | string;
  horasPlanejadas?: number | string;
  Técnicos?: string;
  tecnico?: string;
  Observação?: string;
  observacao?: string;
  EQUIPAMENTO?: string;
  equipamento?: string;
  Turno?: string | number;
}

const turnos = [
  { id: '1', label: '1º Turno', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: '2', label: '2º Turno', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  { id: '3', label: '3º Turno', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
];

const operatorList = [
    "Daniel Solivo",
    "Rodrigo Cantano",
    "Gustavo Gozzi",
    "William Martinucci",
    "Nathan Xavier",
    "Jair Melo",
    "Marcos Barbosa"
];

const factoryList = [
    "VALINHOS DOVE",
    "VALINHOS SABONETE",
    "VINHEDO",
    "POUSO ALEGRE",
    "INDAIATUBA",
    "AGUAÍ",
    "SUAPE",
    "IGARASSU",
    "GARANHUNS",
    "TORRE"
];

const planningFormSchema = z.object({
  dataExecucao: z.string().min(1, 'Data é obrigatória.'),
  equipamento: z.string().min(1, 'Equipamento é obrigatório.'),
  requisicao: z.string().min(1, 'Nº da Requisição é obrigatório.'),
  nomeDaPeca: z.string().min(1, 'Nome da peça é obrigatório.'),
  quantidade: z.coerce.number().min(1, 'Quantidade deve ser maior que zero.'),
  quantidadeRealizada: z.coerce.number().default(0),
  tecnico: z.string().min(1, 'Técnico é obrigatório.'),
  horasPlanejadas: z.coerce.number().min(0.1, 'Horas planejadas deve ser maior que zero.'),
  turno: z.string(),
  site: z.string().min(1, 'Site é obrigatório.'),
  observacao: z.string().optional(),
});

type PlanningFormValues = z.infer<typeof planningFormSchema>;

const PlanningChart = ({ data, title }: { data: any[], title: string }) => {
  if (!data || data.length === 0) return (
    <Card className="flex h-[300px] items-center justify-center border-dashed">
      <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">{title}: Sem dados</p>
    </Card>
  );
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-tight">{title}</CardTitle>
        <CardDescription className="text-[10px]">Peças: Divisão por Turnos (Escuro = 3º Turno)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
              <XAxis 
                dataKey="label" 
                className="text-[10px] font-bold uppercase" 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                className="text-[10px]" 
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `${val}p`}
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={60} iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold' }} />
              
              {/* Stacked Bars for Planejado */}
              <Bar dataKey="plan_t1" stackId="planejado" name="Plan 1º T" fill="#c084fc" />
              <Bar dataKey="plan_t2" stackId="planejado" name="Plan 2º T" fill="#a855f7" />
              <Bar dataKey="plan_t3" stackId="planejado" name="Plan 3º T" fill="#7e22ce" radius={[4, 4, 0, 0]}>
                <LabelList 
                    dataKey="quantidade" 
                    position="top" 
                    className="fill-foreground text-[10px] font-bold"
                    formatter={(val: number) => val > 0 ? `${val}p` : ''}
                />
              </Bar>
              
              {/* Stacked Bars for Realizado */}
              <Bar dataKey="real_t1" stackId="realizado" name="Real 1º T" fill="#86efac" />
              <Bar dataKey="real_t2" stackId="realizado" name="Real 2º T" fill="#22c55e" />
              <Bar dataKey="real_t3" stackId="realizado" name="Real 3º T" fill="#15803d" radius={[4, 4, 0, 0]}>
                 <LabelList 
                    dataKey="quantidadeRealizada" 
                    position="top" 
                    className="fill-green-500 text-[10px] font-bold"
                    formatter={(val: number) => val > 0 ? `${val}p` : ''}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProgrammingPage() {
  const database = useDatabase();
  const { toast } = useToast();
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<string>('1');

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('all');

  const form = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema),
    defaultValues: {
      dataExecucao: '',
      equipamento: '',
      requisicao: '',
      nomeDaPeca: '',
      quantidade: 0,
      quantidadeRealizada: 0,
      tecnico: '',
      horasPlanejadas: 0,
      turno: '1',
      site: 'VALINHOS DOVE',
      observacao: '',
    },
  });

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
      const dateStr = item['Data Execução'] || item.dataExecucao;
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

  const chartData = useMemo(() => {
    const centurMap: Record<string, any> = {};
    const centroMap: Record<string, any> = {};

    planejamentoData.forEach(item => {
      const dateStr = item['Data Execução'] || item.dataExecucao;
      if (!dateStr) return;
      
      let date;
      try {
        date = parse(dateStr, 'dd/MM/yyyy', new Date());
      } catch {
        date = new Date(dateStr);
      }
      
      if (isNaN(date.getTime())) return;

      if (selectedWeekFilter !== 'all') {
        const itemWeek = getISOWeek(date);
        if (itemWeek !== parseInt(selectedWeekFilter)) return;
      }
      
      let key, label;
      if (selectedWeekFilter === 'all') {
        key = format(date, 'yyyy-MM');
        label = format(date, 'MMM yy', { locale: ptBR });
      } else {
        key = format(date, 'yyyy-MM-dd');
        label = format(date, 'dd/MM', { locale: ptBR });
      }

      const equip = String(item.EQUIPAMENTO || item.equipamento || '').toUpperCase();
      const turno = String(item.Turno || '1');
      const qtd = Number(item.Quantidade !== undefined ? item.Quantidade : item.quantidade) || 0;
      const qtdReal = Number(item['Quantidade Realizada'] !== undefined ? item['Quantidade Realizada'] : item.quantidadeRealizada) || 0;

      const targetMap = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurMap : 
                         (equip.includes('CENTRO') || equip.includes('D600')) ? centroMap : null;

      if (targetMap) {
        if (!targetMap[key]) {
          targetMap[key] = { 
            key, label, 
            quantidade: 0, 
            quantidadeRealizada: 0,
            plan_t1: 0, plan_t2: 0, plan_t3: 0,
            real_t1: 0, real_t2: 0, real_t3: 0
          };
        }
        targetMap[key].quantidade += qtd;
        targetMap[key].quantidadeRealizada += qtdReal;

        if (turno === '1') { targetMap[key].plan_t1 += qtd; targetMap[key].real_t1 += qtdReal; }
        else if (turno === '2') { targetMap[key].plan_t2 += qtd; targetMap[key].real_t2 += qtdReal; }
        else if (turno === '3') { targetMap[key].plan_t3 += qtd; targetMap[key].real_t3 += qtdReal; }
      }
    });

    const sortFn = (a: any, b: any) => a.key.localeCompare(b.key);

    return {
      centur: Object.values(centurMap).sort(sortFn),
      centro: Object.values(centroMap).sort(sortFn)
    };
  }, [planejamentoData, selectedWeekFilter]);

  const handleShiftClick = (day: Date, turnoId: string) => {
    setEditingId(null);
    setSelectedDay(day);
    setSelectedTurno(turnoId);
    form.reset({
      dataExecucao: format(day, 'dd/MM/yyyy'),
      turno: turnoId,
      equipamento: '',
      requisicao: '',
      nomeDaPeca: '',
      quantidade: 0,
      quantidadeRealizada: 0,
      tecnico: '',
      horasPlanejadas: 0,
      site: 'VALINHOS DOVE',
      observacao: '',
    });
    setIsDialogOpen(true);
  };

  const handleItemClick = (item: PlanejamentoItem) => {
    setEditingId(item.id);
    setSelectedTurno(String(item.Turno || '1'));
    
    let itemDate = new Date();
    const dateStr = item['Data Execução'] || item.dataExecucao;
    if (dateStr) {
        try {
            itemDate = parse(dateStr, 'dd/MM/yyyy', new Date());
        } catch {
            itemDate = new Date(dateStr);
        }
    }
    setSelectedDay(itemDate);

    form.reset({
      dataExecucao: dateStr || '',
      turno: item.Turno ? String(item.Turno) : '1',
      equipamento: item.EQUIPAMENTO || item.equipamento || '',
      requisicao: item['Requisição'] || item.requisicao || '',
      nomeDaPeca: item['Nome da Peça'] || item.nomeDaPeca || '',
      quantidade: Number(item.Quantidade !== undefined ? item.Quantidade : item.quantidade) || 0,
      quantidadeRealizada: Number(item['Quantidade Realizada'] !== undefined ? item['Quantidade Realizada'] : item.quantidadeRealizada) || 0,
      tecnico: item.Técnicos || item.tecnico || '',
      horasPlanejadas: typeof (item['Horas Máquina'] || item.horasPlanejadas) === 'string' 
        ? parseFloat(String(item['Horas Máquina'] || item.horasPlanejadas).replace(',', '.')) 
        : (Number(item['Horas Máquina'] || item.horasPlanejadas) || 0),
      site: item.Site || item.site || 'VALINHOS DOVE',
      observacao: item.Observação || item.observacao || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!database || !editingId) return;
    try {
      const itemRef = ref(database, `/Planejamento S/${editingId}`);
      await remove(itemRef);
      toast({
        title: "Planejamento Excluído",
        description: "O planejamento foi removido com sucesso.",
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao Excluir",
        description: "Não foi possível remover o planejamento.",
        variant: "destructive",
      });
    }
  };

  async function onSubmit(values: PlanningFormValues) {
    if (!database) return;
    
    try {
      const payload = {
        'Data Execução': values.dataExecucao,
        'EQUIPAMENTO': values.equipamento,
        'Requisição': values.requisicao,
        'Nome da Peça': values.nomeDaPeca,
        'Quantidade': values.quantidade,
        'Quantidade Realizada': values.quantidadeRealizada,
        'Técnicos': values.tecnico,
        'Horas Máquina': values.horasPlanejadas,
        'Turno': values.turno,
        'Site': values.site,
        'Observação': values.observacao || '',
      };

      if (editingId) {
        const itemRef = ref(database, `/Planejamento S/${editingId}`);
        await update(itemRef, payload);
        toast({
          title: "Planejamento Atualizado",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        const dbRef = ref(database, '/Planejamento S');
        const newItemRef = push(dbRef);
        await set(newItemRef, payload);
        toast({
          title: "Planejamento Salvo",
          description: "A nova ordem de produção foi adicionada ao plano.",
        });
      }
      
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao Salvar",
        description: "Não foi possível salvar o planejamento.",
        variant: "destructive",
      });
    }
  }

  const renderEvent = (item: PlanejamentoItem) => {
    const requisicao = item['Requisição'] || item.requisicao;
    const nomeDaPeca = item['Nome da Peça'] || item.nomeDaPeca;
    const site = item.Site || item.site;
    const equipamento = item.EQUIPAMENTO || item.equipamento;
    const horas = item['Horas Máquina'] || item.horasPlanejadas;
    const tecnico = item.Técnicos || item.tecnico;
    const observacao = item.Observação || item.observacao;
    const qtdPlan = Number(item.Quantidade !== undefined ? item.Quantidade : item.quantidade) || 0;
    const qtdReal = Number(item['Quantidade Realizada'] !== undefined ? item['Quantidade Realizada'] : item.quantidadeRealizada) || 0;
    const isCompleted = qtdReal >= qtdPlan && qtdPlan > 0;

    return (
      <TooltipProvider key={item.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              onClick={(e) => {
                  e.stopPropagation();
                  handleItemClick(item);
              }}
              className={cn(
                "mb-1 cursor-pointer truncate rounded border p-1 text-[10px] leading-tight shadow-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-1",
                isCompleted ? "border-green-500/50 bg-green-500/5" : "border-border bg-card hover:border-primary"
              )}
            >
              {isCompleted && <CheckCircle2 className="h-2 w-2 text-green-500 shrink-0" />}
              <span className="font-bold text-primary mr-1">{requisicao}</span>
              <span className="truncate">{nomeDaPeca}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="w-64 p-3" side="right">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <span className="font-bold text-sm">Req: {requisicao}</span>
                <Badge variant={isCompleted ? "default" : "outline"} className={cn("text-[10px]", isCompleted && "bg-green-500 hover:bg-green-600")}>
                    {isCompleted ? 'Finalizado' : site}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Factory className="h-3 w-3" />
                  <span>Equip:</span>
                </div>
                <span className="font-medium text-right">{equipamento || 'N/A'}</span>
                
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Produção:</span>
                </div>
                <span className="font-medium text-right">
                    {qtdReal} / {qtdPlan} pçs
                </span>

                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>Técnico:</span>
                </div>
                <span className="font-medium text-right truncate">{tecnico || 'Não definido'}</span>
              </div>
              {observacao && (
                <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground italic">
                  "{observacao}"
                </div>
              )}
              <div className="mt-2 text-[8px] text-center text-primary font-bold uppercase tracking-widest animate-pulse">
                  Clique para editar
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
              <Loader className="h-8 w-8 animate-spin" />
              <span className="font-medium">Carregando planejamento...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border overflow-hidden rounded-lg border shadow-lg">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-muted/50 p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {day}
                </div>
              ))}

              {calendarDays.map((day) => {
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
                    </div>

                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[180px] scrollbar-hide pb-2">
                      {turnos.map(turno => {
                        const itemsInTurno = dayItems.filter(item => {
                          if (!item.Turno) return turno.id === '1';
                          return String(item.Turno) === turno.id;
                        });

                        return (
                          <div key={turno.id} className="group/turno relative">
                            <div 
                              onClick={() => handleShiftClick(day, turno.id)}
                              className={cn(
                                "text-[8px] px-1 py-0.5 rounded border font-bold uppercase tracking-tighter cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-between",
                                turno.color
                              )}
                            >
                              {turno.label}
                              <Plus className="h-2 w-2 opacity-0 group-hover/turno:opacity-100 transition-opacity" />
                            </div>
                            <div className="min-h-[10px] mt-1 px-1">
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

      <div className="flex flex-wrap gap-4 items-center p-4 bg-muted/30 rounded-lg border border-dashed">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>Dica: Clique no nome do turno para adicionar ou em uma barra para editar/ver detalhes.</span>
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

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-8">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Gráficos de Consolidado</h2>
          <p className="text-sm text-muted-foreground">Comparativo de peças planejadas vs realizadas por turno.</p>
        </div>
        <div className="flex items-center gap-3 bg-card p-3 rounded-lg border shadow-sm w-full sm:w-auto">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Filter className="h-4 w-4" />
            <Label htmlFor="week-filter" className="text-xs font-bold uppercase tracking-wider whitespace-nowrap">Semana do Ano:</Label>
          </div>
          <Select value={selectedWeekFilter} onValueChange={setSelectedWeekFilter}>
            <SelectTrigger id="week-filter" className="w-[180px] h-9">
              <SelectValue placeholder="Selecione a semana" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Semanas</SelectItem>
              {Array.from({ length: 53 }, (_, i) => i + 1).map(week => (
                <SelectItem key={week} value={String(week)}>Semana {week}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanningChart 
          data={chartData.centur} 
          title="Consolidado Torno Centur 30" 
        />
        <PlanningChart 
          data={chartData.centro} 
          title="Consolidado Centro D600" 
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
                {editingId ? 'Editar Planejamento' : `Novo Planejamento - ${selectedTurno}º Turno`}
            </DialogTitle>
            <DialogDescription>
              {editingId 
                ? 'Atualize as informações e o status de conclusão desta ordem.' 
                : `Preencha os dados da ordem de produção para ${selectedDay && format(selectedDay, "dd/MM/yyyy")}.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="equipamento"
                render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-base font-bold text-primary uppercase tracking-wider">
                      Selecione o Equipamento (Obrigatório)
                    </FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        type="button"
                        variant={field.value === 'TORNO CNC CENTUR 30' ? 'default' : 'outline'}
                        className={cn(
                          "h-24 flex flex-col gap-2 transition-all border-2",
                          field.value === 'TORNO CNC CENTUR 30' ? "border-primary ring-2 ring-primary/20" : "border-muted"
                        )}
                        onClick={() => field.onChange('TORNO CNC CENTUR 30')}
                      >
                        <Settings2 className={cn("h-8 w-8", field.value === 'TORNO CNC CENTUR 30' ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span className="font-bold text-sm">TORNO CENTUR 30</span>
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === 'CENTRO DE USINAGEM D600' ? 'default' : 'outline'}
                        className={cn(
                          "h-24 flex flex-col gap-2 transition-all border-2",
                          field.value === 'CENTRO DE USINAGEM D600' ? "border-primary ring-2 ring-primary/20" : "border-muted"
                        )}
                        onClick={() => field.onChange('CENTRO DE USINAGEM D600')}
                      >
                        <Cpu className={cn("h-8 w-8", field.value === 'CENTRO DE USINAGEM D600' ? "text-primary-foreground" : "text-muted-foreground")} />
                        <span className="font-bold text-sm">CENTRO D600</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dataExecucao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input disabled {...field} className="bg-muted" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="site"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site/Fábrica</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requisicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Requisição (Forms)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: F-1024" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nomeDaPeca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da Peça</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Eixo do Motor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border border-primary/20">
                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-primary font-bold">Qtd. Planejada</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantidadeRealizada"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-green-500 font-bold">Qtd. Realizada</FormLabel>
                      <FormControl>
                        <Input type="number" className="border-green-500/50 focus-visible:ring-green-500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="horasPlanejadas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Planejadas</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                    control={form.control}
                    name="tecnico"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Técnico Responsável</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecione o técnico" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>

              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionais sobre o processo..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {editingId && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" className="sm:mr-auto">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O planejamento será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Confirmar Exclusão
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingId ? 'Salvar Alterações' : 'Salvar Planejamento'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
