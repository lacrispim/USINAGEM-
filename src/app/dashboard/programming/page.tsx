
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Loader, 
  Plus,
  Trash2,
  Settings2,
  PlusCircle,
  User as UserIcon,
  Cpu
} from 'lucide-react';
import { 
  format, 
  addWeeks, 
  subWeeks, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, LabelList, Legend } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

interface AtividadePlanejada {
  tipo: string;
  tempo: number;
  site?: string;
}

interface PlanejamentoItem {
  id: string;
  dataExecucao?: string;
  'Data Execução'?: string;
  site?: string;
  Site?: string;
  requisicao?: string;
  'Requisição'?: string;
  nomeDaPeca?: string;
  'Nome da Peça'?: string;
  quantidade?: number;
  Quantidade?: number;
  tecnico?: string;
  Técnicos?: string;
  horasPlanejadas?: number | string;
  'Horas Máquina'?: number | string;
  observacao?: string;
  Observação?: string;
  equipamento?: string;
  EQUIPAMENTO?: string;
  Turno?: string | number;
  turno?: string | number;
  perdaPlanejada?: string;
  'Perdas planejadas'?: string;
  atividades?: AtividadePlanejada[];
}

const turnos = [
  { id: '1', label: '1º Turno', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', chartColor: '#3b82f6', technicians: ["Marcos Barbosa", "Daniel Solivo", "William Martinucci", "Alisson Franca"] },
  { id: '2', label: '2º Turno', color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', chartColor: '#f97316', technicians: ["Nathan Xavier", "Jair Melo"] },
  { id: '3', label: '3º Turno', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', chartColor: '#a855f7', technicians: ["Gustavo Gozzi", "Rodrigo Cantano"] },
];

const operatorList = [
    "Alisson Franca",
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

const lossOptions = [
  { value: 'PRODUCAO', label: 'Produção Normal', color: '#ffffff' },
  { value: 'PROGRAMACAO', label: 'Programação', color: '#a855f7' },
  { value: 'SETUP', label: 'Setup', color: '#ef4444' },
  { value: 'DDS', label: 'Atividades ADM', color: '#f97316' },
  { value: 'CAFE', label: 'Parada para Café', color: '#eab308' },
  { value: 'LIMPEZA', label: 'Limpeza Planejada', color: '#22c55e' },
  { value: 'QUALIDADE', label: 'Inspeção / Qualidade', color: '#3b82f6' },
  { value: 'AUXÍLIO AS FÁBRICAS', label: 'Auxílio as Fábricas', color: '#0ea5e9' },
];

const planningFormSchema = z.object({
  dataExecucao: z.string().min(1, 'Data é obrigatória.'),
  equipamento: z.string().min(1, 'Equipamento é obrigatório.'),
  requisicao: z.string().min(1, 'Nº da Requisição é obrigatório.'),
  nomeDaPeca: z.string().min(1, 'Nome da peça é obrigatória.'),
  quantidade: z.coerce.number().min(0, 'Quantidade deve ser zero ou maior.'),
  tecnico: z.string().min(1, 'Técnico é obrigatório.'),
  horasPlanejadas: z.coerce.number().default(0),
  turno: z.string(),
  site: z.string().min(1, 'Site é obrigatório.'),
  observacao: z.string().optional(),
  atividades: z.array(z.object({
    tipo: z.string().min(1, 'Tipo é obrigatório'),
    tempo: z.coerce.number().min(0, 'Tempo deve ser zero ou maior'),
    site: z.string().min(1, 'Fábrica da atividade é obrigatória')
  })).min(1, 'Adicione pelo menos uma atividade'),
});

type PlanningFormValues = z.infer<typeof planningFormSchema>;

export default function ProgrammingPage() {
  const database = useDatabase();
  const { toast } = useToast();
  
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<string>('1');

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

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
      atividades: [{ tipo: 'PRODUCAO', tempo: 0, site: 'VALINHOS DOVE' }],
    },
  });

  const { fields, append, remove: removeAtividade } = useFieldArray({
    control: form.control,
    name: "atividades"
  });

  const watchAtividades = useWatch({
    control: form.control,
    name: "atividades"
  });

  useEffect(() => {
    const total = (watchAtividades || []).reduce((acc, curr) => acc + (Number(curr.tempo) || 0), 0);
    form.setValue('horasPlanejadas', total);
  }, [watchAtividades, form]);

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

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 0 });

  const calendarDays = eachDayOfInterval({
    start: weekStart,
    end: weekEnd,
  });

  const nextWeek = () => setCurrentDate(prev => addWeeks(prev, 1));
  const prevWeek = () => setCurrentDate(prev => subWeeks(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  const getItemsForDay = (day: Date) => {
    return planejamentoData.filter(item => {
      const dateStr = item.dataExecucao || item['Data Execução'];
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

  const weeklyChartData = useMemo(() => {
    const grouped: Record<string, any> = {};
    calendarDays.forEach(day => {
      const items = getItemsForDay(day);
      items.forEach(item => {
        const req = item.requisicao || item['Requisição'] || 'S/N';
        const shiftId = String(item.Turno || item.turno || '1');
        const rawHours = item.horasPlanejadas || item['Horas Máquina'];
        const hours = typeof rawHours === 'string' 
          ? parseFloat(rawHours.replace(',', '.')) 
          : (Number(rawHours) || 0);
        
        if (!grouped[req]) {
          grouped[req] = { name: req, total: 0, shift1: 0, shift2: 0, shift3: 0 };
        }
        
        grouped[req].total += hours;
        if (shiftId === '1') grouped[req].shift1 += hours;
        else if (shiftId === '2') grouped[req].shift2 += hours;
        else if (shiftId === '3') grouped[req].shift3 += hours;
      });
    });

    return Object.values(grouped)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 15);
  }, [calendarDays, planejamentoData]);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.setData('itemId', id);
  };

  const handleDrop = async (e: React.DragEvent, day: Date, turnoId: string, tecnico?: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId') || draggedItemId;
    if (!itemId || !database) return;

    const newDateStr = format(day, 'dd/MM/yyyy');
    try {
      const updatePayload: any = {
        dataExecucao: newDateStr,
        Turno: turnoId,
        turno: turnoId
      };
      if (tecnico) {
        updatePayload.tecnico = tecnico;
      }
      await update(ref(database, `/Planejamento S/${itemId}`), updatePayload);
      toast({ title: "Planejamento Movido", description: `Movido para ${newDateStr}` });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao mover", variant: "destructive" });
    }
    setDraggedItemId(null);
  };

  const handleShiftClick = (day: Date, turnoId: string, tecnico?: string) => {
    setEditingId(null);
    setSelectedDay(day);
    setSelectedTurno(turnoId);

    const isSunday = day.getDay() === 0;
    const defaultAtividades = [{ tipo: 'PRODUCAO', tempo: 0, site: 'VALINHOS DOVE' }];
    
    if (!isSunday) {
        defaultAtividades.push({ tipo: 'DDS', tempo: 0.25, site: 'TORRE' });
        defaultAtividades.push({ tipo: 'CAFE', tempo: 0.25, site: 'TORRE' });
    }

    form.reset({
      dataExecucao: format(day, 'dd/MM/yyyy'),
      turno: turnoId,
      equipamento: '',
      requisicao: '',
      nomeDaPeca: '',
      quantidade: 0,
      tecnico: tecnico || '',
      horasPlanejadas: isSunday ? 0 : 0.5,
      site: 'VALINHOS DOVE',
      observacao: '',
      atividades: defaultAtividades,
    });
    setIsDialogOpen(true);
  };

  const handleItemClick = (item: PlanejamentoItem) => {
    setEditingId(item.id);
    const shiftVal = String(item.Turno || item.turno || '1');
    setSelectedTurno(shiftVal);
    
    let itemDate = new Date();
    const dateStr = item.dataExecucao || item['Data Execução'];
    if (dateStr) { try { itemDate = parse(dateStr, 'dd/MM/yyyy', new Date()); } catch { itemDate = new Date(dateStr); } }
    setSelectedDay(itemDate);

    const initialAtividades = item.atividades || [{
      tipo: (item.perdaPlanejada || item['Perdas planejadas'] || 'PRODUCAO').toUpperCase(),
      tempo: typeof (item.horasPlanejadas || item['Horas Máquina']) === 'string' 
        ? parseFloat(String(item.horasPlanejadas || item['Horas Máquina']).replace(',', '.')) 
        : (Number(item.horasPlanejadas || item['Horas Máquina']) || 0),
      site: item.site || item.Site || 'VALINHOS DOVE'
    }];

    form.reset({
      dataExecucao: dateStr || '',
      turno: shiftVal,
      equipamento: item.equipamento || item.EQUIPAMENTO || '',
      requisicao: item.requisicao || item['Requisição'] || '',
      nomeDaPeca: item.nomeDaPeca || item['Nome da Peça'] || '',
      quantidade: Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0,
      tecnico: item.tecnico || item.Técnicos || '',
      horasPlanejadas: typeof (item.horasPlanejadas || item['Horas Máquina']) === 'string' 
        ? parseFloat(String(item.horasPlanejadas || item['Horas Máquina']).replace(',', '.')) 
        : (Number(item.horasPlanejadas || item['Horas Máquina']) || 0),
      site: item.site || item.Site || 'VALINHOS DOVE',
      observacao: item.observacao || item.Observação || '',
      atividades: initialAtividades,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!database || !editingId) return;
    try {
      await remove(ref(database, `/Planejamento S/${editingId}`));
      toast({ title: "Planejamento Excluído" });
      setIsDialogOpen(false);
    } catch (error) { console.error(error); }
  };

  async function onSubmit(values: PlanningFormValues) {
    if (!database) return;
    try {
      const mainLoss = values.atividades.length === 1 ? values.atividades[0].tipo : 'MÚLTIPLAS';
      const lossLabel = lossOptions.find(o => o.value === mainLoss)?.label || mainLoss;

      const payload = {
        dataExecucao: values.dataExecucao,
        equipamento: values.equipamento,
        requisicao: values.requisicao,
        nomeDaPeca: values.nomeDaPeca,
        quantidade: values.quantidade,
        tecnico: values.tecnico,
        horasPlanejadas: values.horasPlanejadas,
        Turno: values.turno,
        turno: values.turno,
        site: values.site,
        observacao: values.observacao || '',
        'Perdas planejadas': values.atividades.find(a => a.tipo !== 'PRODUCAO') ? lossLabel.toUpperCase() : '',
        atividades: values.atividades
      };

      if (editingId) {
        await update(ref(database, `/Planejamento S/${editingId}`), payload);
        toast({ title: "Planejamento Atualizado" });
      } else {
        await set(push(ref(database, '/Planejamento S')), payload);
        toast({ title: "Planejamento Salvo" });
      }
      setIsDialogOpen(false);
    } catch (error) { console.error(error); }
  }

  const renderEvent = (item: PlanejamentoItem) => {
    const rawHours = item.horasPlanejadas || item['Horas Máquina'];
    const totalHours = typeof rawHours === 'string' 
      ? parseFloat(rawHours.replace(',', '.')) 
      : (Number(rawHours) || 0);

    const firstType = item.atividades && item.atividades.length > 0 ? item.atividades[0].tipo : (item.perdaPlanejada || item['Perdas planejadas'] || 'PRODUCAO');
    const typeColor = lossOptions.find(o => o.value === firstType.toUpperCase())?.color || '#ffffff';
    
    return (
      <TooltipProvider key={item.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
              className={cn(
                "mb-1 cursor-grab active:cursor-grabbing rounded border p-1.5 text-[10px] leading-tight shadow-sm transition-all flex flex-col gap-1 group/event",
                "border-border bg-card hover:border-primary shrink-0 min-w-[80px] max-w-[120px]"
              )}
              style={{ borderLeft: `3px solid ${typeColor}` }}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="font-bold text-primary truncate max-w-[70%]" title={item.requisicao || item['Requisição']}>
                  {item.requisicao || item['Requisição']}
                </span>
                <span className="bg-muted px-1 rounded-sm font-black text-[9px] shrink-0">
                  {totalHours.toFixed(1)}h
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-70">
                <span className="truncate">{item.nomeDaPeca || item['Nome da Peça']}</span>
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="w-64 p-3" side="right">
            <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Equip:</span><span className="font-medium text-right">{item.equipamento || item.EQUIPAMENTO}</span>
                <span className="text-muted-foreground">Site:</span><span className="font-medium text-right">{item.site || item.Site}</span>
                <span className="text-muted-foreground">Total Planejado:</span><span className="font-medium text-right">{totalHours.toFixed(1)}h</span>
                <span className="text-muted-foreground">Técnico:</span><span className="font-medium text-right truncate">{item.tecnico || item.Técnicos}</span>
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
          <p className="text-muted-foreground">Gestão semanal detalhada por turnos e técnicos.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={prevWeek}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[140px] text-center font-bold capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</div>
          <Button variant="ghost" size="icon" onClick={nextWeek}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>Hoje</Button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-[400px] items-center justify-center gap-2 bg-card rounded-lg border">
              <Loader className="h-8 w-8 animate-spin" /><span className="font-medium">Carregando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border overflow-hidden rounded-lg border shadow-lg">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-muted/50 p-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b">{day}</div>
              ))}
              {calendarDays.map((day) => {
                const dayItems = getItemsForDay(day);
                return (
                  <div key={day.toString()} className={cn("min-h-[500px] bg-card p-0 flex flex-col border-r last:border-r-0", isToday(day) && "ring-1 ring-inset ring-primary z-10")}>
                    <div className="flex items-center justify-between p-2 border-b bg-muted/20">
                      <span className={cn("text-xs font-black w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{format(day, 'd')}</span>
                      <span className="text-[9px] text-muted-foreground font-bold uppercase">{format(day, 'MMM', { locale: ptBR })}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                      {turnos.map(turno => {
                        const techniciansInThisTurno = Array.from(new Set([
                           ...turno.technicians,
                           ...dayItems.filter(item => String(item.Turno || item.turno || '1') === turno.id).map(item => item.tecnico || item.Técnicos || '')
                        ])).filter(Boolean);

                        return (
                          <div key={turno.id} className="border-b last:border-b-0">
                            <div className={cn("px-2 py-1 text-[8px] font-black uppercase tracking-tighter border-b", turno.color)}>
                              {turno.label}
                            </div>
                            <div className="p-1 space-y-2">
                                {techniciansInThisTurno.map(tech => {
                                   const itemsForTech = dayItems.filter(item => 
                                      String(item.Turno || item.turno || '1') === turno.id && 
                                      (item.tecnico === tech || item.Técnicos === tech)
                                   );
                                   
                                   const totalHoursForTech = itemsForTech.reduce((acc, item) => {
                                      const raw = item.horasPlanejadas || item['Horas Máquina'];
                                      return acc + (typeof raw === 'string' ? parseFloat(raw.replace(',', '.')) : (Number(raw) || 0));
                                   }, 0);

                                   return (
                                     <div key={tech} className="bg-muted/10 rounded border border-dashed p-1.5 min-h-[40px] group/tech">
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1">
                                                    <UserIcon className="h-2 w-2 text-muted-foreground" />
                                                    <span className="text-[8px] font-bold text-muted-foreground uppercase truncate max-w-[60px]">{tech.split(' ')[0]}</span>
                                                </div>
                                                {totalHoursForTech > 0 && (
                                                  <span className={cn("text-[7px] font-black px-1 rounded-sm w-fit", totalHoursForTech > 8 ? "bg-red-500/20 text-red-400" : "bg-primary/20 text-primary")}>
                                                    TOTAL: {totalHoursForTech.toFixed(1)}h
                                                  </span>
                                                )}
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-3 w-3 opacity-0 group-hover/tech:opacity-100 transition-opacity"
                                                onClick={() => handleShiftClick(day, turno.id, tech)}
                                            >
                                                <Plus className="h-2 w-2" />
                                            </Button>
                                        </div>
                                        <div 
                                          className="min-h-[10px] flex flex-row flex-wrap gap-1"
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={(e) => handleDrop(e, day, turno.id, tech)}
                                        >
                                            {itemsForTech.map(item => renderEvent(item))}
                                        </div>
                                     </div>
                                   );
                                })}
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

      {/* NOVO GRÁFICO DE TEMPO PLANEJADO POR REQUISIÇÃO (EMPILHADO POR TURNO) */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Tempo Planejado por Requisição (Justapostas por Turno)</CardTitle>
            <CardDescription>
              Total de horas planejadas por Forms na semana, divididas pela participação de cada turno.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              {weeklyChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ChartContainer config={{ 
                    shift1: { label: '1º Turno', color: '#3b82f6' },
                    shift2: { label: '2º Turno', color: '#f97316' },
                    shift3: { label: '3º Turno', color: '#a855f7' }
                  }}>
                    <BarChart
                      data={weeklyChartData}
                      layout="vertical"
                      margin={{ top: 5, right: 60, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" opacity={0.1} />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        className="text-[10px] font-bold"
                        width={80}
                      />
                      <RechartsTooltip 
                         cursor={{ fill: 'hsl(var(--accent))', opacity: 0.1 }}
                         content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-lg border bg-background p-2 shadow-sm min-w-[12rem]">
                                  <p className="font-bold text-sm mb-2 border-b pb-1">Forms: {label}</p>
                                  <div className="space-y-1">
                                    {payload.map((entry: any) => (
                                      entry.value > 0 && (
                                        <div key={entry.name} className="flex justify-between items-center gap-4">
                                          <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                            <span className="text-[10px] text-muted-foreground">{entry.name}:</span>
                                          </div>
                                          <span className="text-[10px] font-black">{Number(entry.value).toFixed(1)}h</span>
                                        </div>
                                      )
                                    ))}
                                    <div className="flex justify-between items-center pt-1 border-t mt-1">
                                      <span className="text-[10px] font-bold">Total:</span>
                                      <span className="text-[10px] font-black">{payload.reduce((acc: number, curr: any) => acc + curr.value, 0).toFixed(1)}h</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                         }}
                      />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar name="1º Turno" dataKey="shift1" stackId="a" fill="#3b82f6" />
                      <Bar name="2º Turno" dataKey="shift2" stackId="a" fill="#f97316" />
                      <Bar name="3º Turno" dataKey="shift3" stackId="a" fill="#a855f7" radius={[0, 4, 4, 0]}>
                        <LabelList
                          dataKey="total"
                          position="right"
                          formatter={(v: number) => `${v.toFixed(1)}h`}
                          className="fill-foreground text-[10px] font-bold"
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                  Nenhum planejamento encontrado para esta semana.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Planejamento' : `Novo Planejamento - ${selectedTurno}º Turno`}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="equipamento" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold">Equipamento</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <Button type="button" variant={field.value === 'TORNO CNC CENTUR 30' ? 'default' : 'outline'} className="h-16 flex flex-col" onClick={() => field.onChange('TORNO CNC CENTUR 30')}>
                        <Settings2 className="h-4 w-4" /><span className="text-xs font-bold">TORNO CENTUR 30</span>
                      </Button>
                      <Button type="button" variant={field.value === 'CENTRO DE USINAGEM D600' ? 'default' : 'outline'} className="h-16 flex flex-col" onClick={() => field.onChange('CENTRO DE USINAGEM D600')}>
                        <Cpu className="h-4 w-4" /><span className="text-xs font-bold">CENTRO D600</span>
                      </Button>
                    </div>
                  </FormItem>
                )} />

              <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                <div className="flex items-center justify-between">
                    <Label className="font-bold uppercase text-[10px] tracking-widest text-primary">Atividades / Perdas Planejadas</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ tipo: 'PRODUCAO', tempo: 0, site: form.getValues('site') || 'VALINHOS DOVE' })} className="h-7 text-[10px] font-bold"><PlusCircle className="h-3 w-3 mr-1" /> ADICIONAR ATIVIDADE</Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-end border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex-[1.5]">
                      <FormField control={form.control} name={`atividades.${index}.tipo`} render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {lossOptions.map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />{opt.label}</div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="flex-[1.5]">
                      <FormField control={form.control} name={`atividades.${index}.site`} render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-8 text-[10px]"><SelectValue placeholder="Fábrica" /></SelectTrigger></FormControl>
                            <SelectContent>
                                {factoryList.map(f => <SelectItem key={f} value={f} className="text-[10px]">{f}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )} />
                    </div>
                    <div className="w-20">
                      <FormField control={form.control} name={`atividades.${index}.tempo`} render={({ field }) => (
                        <FormItem><FormControl><Input type="number" step="0.1" placeholder="Horas" className="h-8 text-[10px]" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAtividade(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="tecnico" render={({ field }) => (<FormItem><FormLabel>Técnico Responsável</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                <FormField control={form.control} name="site" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Fábrica Principal</FormLabel>
                        <Select onValueChange={(val) => {
                            field.onChange(val);
                            const currentAtivs = form.getValues('atividades');
                            currentAtivs.forEach((_, idx) => {
                                if (!form.getValues(`atividades.${idx}.site`)) {
                                    form.setValue(`atividades.${idx}.site`, val);
                                }
                            });
                        }} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                        </Select>
                    </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="requisicao" render={({ field }) => (<FormItem className="col-span-1"><FormLabel>Nº Forms</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="nomeDaPeca" render={({ field }) => (<FormItem className="col-span-1"><FormLabel>Peça</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="quantidade" render={({ field }) => (<FormItem className="col-span-1"><FormLabel>Meta (Peças)</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
              </div>
              <FormField control={form.control} name="observacao" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
              <DialogFooter>
                {editingId && (<Button type="button" variant="destructive" onClick={handleDeleteItem}>Excluir</Button>)}
                <Button type="submit">Salvar Planejamento</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

