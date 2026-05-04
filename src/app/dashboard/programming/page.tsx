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
  BarChart3
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
  TooltipProvider,
  TooltipTrigger,
  TooltipContent
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
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';

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
  tecnico: z.string().min(1, 'Técnico é obrigatório.'),
  horasPlanejadas: z.coerce.number().min(0.1, 'Horas planejadas deve ser maior que zero.'),
  turno: z.string(),
  site: z.string().min(1, 'Site é obrigatório.'),
  observacao: z.string().optional(),
});

type PlanningFormValues = z.infer<typeof planningFormSchema>;

const chartConfig = {
  'TORNO CNC CENTUR 30': {
    label: 'Centur 30 (h)',
    color: 'hsl(var(--chart-1))',
  },
  'CENTRO DE USINAGEM D600': {
    label: 'D600 (h)',
    color: 'hsl(var(--chart-2))',
  },
  'Outros': {
      label: 'Outros (h)',
      color: 'hsl(var(--muted))',
  },
  'totalQuantity': {
    label: 'Total de Peças',
    color: 'hsl(var(--chart-3))',
  }
};

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

  const form = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema),
    defaultValues: {
      dataExecucao: '',
      equipamento: '',
      requisicao: '',
      nomeDaPeca: '',
      quantidade: 0,
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

  const chartData = useMemo(() => {
    const monthsMap: { [key: string]: { name: string, date: Date, totalQuantity: number, [machine: string]: any } } = {};
    
    planejamentoData.forEach(item => {
      const dateStr = item['Data Execução'];
      if (!dateStr) return;
      try {
        const date = parse(dateStr, 'dd/MM/yyyy', new Date());
        if (isNaN(date.getTime())) return;
        
        const key = format(date, 'yyyy-MM');
        const monthLabel = format(date, 'MMM/yy', { locale: ptBR });
        const hours = typeof item['Horas Máquina'] === 'string' 
          ? parseFloat(item['Horas Máquina'].replace(',', '.')) 
          : (Number(item['Horas Máquina']) || 0);
        
        const qty = Number(item.Quantidade) || 0;
        const machine = item.EQUIPAMENTO || 'Outros';
        
        if (!monthsMap[key]) {
          monthsMap[key] = { name: monthLabel, date: startOfMonth(date), totalQuantity: 0 };
        }
        monthsMap[key][machine] = (monthsMap[key][machine] || 0) + hours;
        monthsMap[key].totalQuantity += qty;
      } catch (e) {}
    });

    return Object.values(monthsMap)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [planejamentoData]);

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
    if (item['Data Execução']) {
        try {
            itemDate = parse(item['Data Execução'], 'dd/MM/yyyy', new Date());
        } catch {
            itemDate = new Date(item['Data Execução']);
        }
    }
    setSelectedDay(itemDate);

    form.reset({
      dataExecucao: item['Data Execução'] || '',
      turno: String(item.Turno || '1'),
      equipamento: item.EQUIPAMENTO || '',
      requisicao: item['Requisição'] || '',
      nomeDaPeca: item['Nome da Peça'] || '',
      quantidade: Number(item.Quantidade) || 0,
      tecnico: item.Técnicos || '',
      horasPlanejadas: typeof item['Horas Máquina'] === 'string' 
        ? parseFloat(item['Horas Máquina'].replace(',', '.')) 
        : (Number(item['Horas Máquina']) || 0),
      site: item.Site || 'VALINHOS DOVE',
      observacao: item.Observação || '',
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

  const renderEvent = (item: PlanejamentoItem) => (
    <TooltipProvider key={item.id}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            onClick={(e) => {
                e.stopPropagation();
                handleItemClick(item);
            }}
            className="mb-1 cursor-pointer truncate rounded border border-border bg-card p-1 text-[10px] leading-tight shadow-sm hover:border-primary transition-all hover:scale-[1.02] active:scale-95"
          >
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
            <div className="mt-2 text-[8px] text-center text-primary font-bold uppercase tracking-widest animate-pulse">
                Clique para editar
            </div>
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
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-muted/50 p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {day}
                </div>
              ))}

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

      <div className="mt-4 grid grid-cols-1 gap-6">
          <Card>
              <CardHeader>
                  <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <CardTitle>Consolidado Mensal de Planejamento</CardTitle>
                  </div>
                  <CardDescription>
                      Horas totais por equipamento (Barras) e quantidade de peças programadas (Linha).
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  {!loading && chartData.length > 0 ? (
                      <div className="h-[400px] w-full mt-4">
                          <ChartContainer config={chartConfig} className="h-full w-full">
                              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                  <XAxis 
                                      dataKey="name" 
                                      tickLine={false}
                                      axisLine={false}
                                      tickMargin={10}
                                      className="text-xs font-bold uppercase"
                                  />
                                  <YAxis 
                                      yAxisId="left"
                                      unit="h"
                                      tickLine={false}
                                      axisLine={false}
                                      className="text-xs"
                                  />
                                  <YAxis 
                                      yAxisId="right"
                                      orientation="right"
                                      unit=" un"
                                      tickLine={false}
                                      axisLine={false}
                                      className="text-xs"
                                  />
                                  <ChartTooltip 
                                      cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                                  />
                                  <Legend verticalAlign="top" align="right" className="text-xs" />
                                  
                                  <Bar 
                                      yAxisId="left"
                                      dataKey="CENTRO DE USINAGEM D600" 
                                      name="D600 (h)" 
                                      fill="hsl(var(--chart-2))" 
                                      stackId="a" 
                                  />
                                  <Bar 
                                      yAxisId="left"
                                      dataKey="TORNO CNC CENTUR 30" 
                                      name="Centur 30 (h)" 
                                      fill="hsl(var(--chart-1))" 
                                      stackId="a" 
                                      radius={[4, 4, 0, 0]} 
                                  />
                                  <Bar 
                                      yAxisId="left"
                                      dataKey="Outros" 
                                      name="Outros (h)" 
                                      fill="hsl(var(--muted))" 
                                      stackId="a" 
                                      radius={[4, 4, 0, 0]} 
                                  />
                                  
                                  <Line 
                                      yAxisId="right"
                                      type="monotone" 
                                      dataKey="totalQuantity" 
                                      name="Total Peças" 
                                      stroke="hsl(var(--chart-3))" 
                                      strokeWidth={3}
                                      dot={{ r: 4, fill: "hsl(var(--chart-3))" }}
                                      activeDot={{ r: 6 }}
                                  />
                              </ComposedChart>
                          </ChartContainer>
                      </div>
                  ) : (
                      <div className="flex h-[350px] items-center justify-center text-muted-foreground italic border rounded-lg border-dashed">
                          {loading ? "Carregando dados..." : "Nenhum dado planejado para exibir no gráfico."}
                      </div>
                  )}
              </CardContent>
          </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
                {editingId ? 'Editar Planejamento' : `Novo Planejamento - ${selectedTurno}º Turno`}
            </DialogTitle>
            <DialogDescription>
              {editingId 
                ? 'Atualize as informações desta ordem de produção.' 
                : `Preencha os dados da ordem de produção para ${selectedDay && format(selectedDay, "dd/MM/yyyy")}.`}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="dataExecucao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl>
                        <Input disabled {...field} />
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

              <FormField
                control={form.control}
                name="equipamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a máquina" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TORNO CNC CENTUR 30">TORNO CNC CENTUR 30</SelectItem>
                        <SelectItem value="CENTRO DE USINAGEM D600">CENTRO DE USINAGEM D600</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="requisicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nº Requisição</FormLabel>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
              </div>

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

              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Notas adicionais..." {...field} />
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
