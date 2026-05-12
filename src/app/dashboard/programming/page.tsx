'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDatabase, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { collection, query } from 'firebase/firestore';
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
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  Cpu,
  Settings2,
  CheckCircle2,
  Clock,
  PlusCircle,
  Move
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
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { 
  ResponsiveContainer, 
  BarChart,
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend,
  LabelList,
} from 'recharts';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AtividadePlanejada {
  tipo: string;
  tempo: number;
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
  quantidadeRealizada?: number;
  'Quantidade Realizada'?: number;
  operacoesRealizadas?: number;
  'Operações Realizadas'?: number;
  operacoesPorPeca?: number;
  'Operações por Peça'?: number;
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

const lossOptions = [
  { value: 'PRODUCAO', label: 'Produção Normal', color: '#a855f7' },
  { value: 'SETUP', label: 'Setup', color: '#ef4444' },
  { value: 'DDS', label: 'Atividades ADM', color: '#f97316' },
  { value: 'CAFE', label: 'Parada para Café', color: '#eab308' },
  { value: 'LIMPEZA', label: 'Limpeza Planejada', color: '#22c55e' },
  { value: 'QUALIDADE', label: 'Inspeção / Qualidade', color: '#3b82f6' },
];

const planningFormSchema = z.object({
  dataExecucao: z.string().min(1, 'Data é obrigatória.'),
  equipamento: z.string().min(1, 'Equipamento é obrigatório.'),
  requisicao: z.string().min(1, 'Nº da Requisição é obrigatório.'),
  nomeDaPeca: z.string().min(1, 'Nome da peça é obrigatório.'),
  quantidade: z.coerce.number().min(0, 'Quantidade deve ser zero ou maior.'),
  quantidadeRealizada: z.coerce.number().default(0),
  operacoesRealizadas: z.coerce.number().default(0),
  operacoesPorPeca: z.coerce.number().default(1),
  tecnico: z.string().min(1, 'Técnico é obrigatório.'),
  horasPlanejadas: z.coerce.number().default(0),
  turno: z.string(),
  site: z.string().min(1, 'Site é obrigatório.'),
  observacao: z.string().optional(),
  atividades: z.array(z.object({
    tipo: z.string().min(1, 'Tipo é obrigatório'),
    tempo: z.coerce.number().min(0, 'Tempo deve ser zero ou maior')
  })).min(1, 'Adicione pelo menos uma atividade'),
});

type PlanningFormValues = z.infer<typeof planningFormSchema>;

const PlanningChart = ({ 
  data, 
  title, 
  isDayView, 
  metric, 
}: { 
  data: any[], 
  title: string, 
  isDayView: boolean, 
  metric: 'production' | 'hours',
}) => {
  if (!data || data.length === 0) return (
    <Card className="flex h-[300px] items-center justify-center border-dashed">
      <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">{title}: Sem dados</p>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-tight">{title}</CardTitle>
        <CardDescription className="text-[10px]">
          {isDayView ? "Visão por Turno" : `Consolidado ${metric === 'production' ? 'de Produção' : 'de Horas'}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={8} margin={{ top: 30, right: 30, left: 10, bottom: 40 }}>
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
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend verticalAlign="bottom" height={36}/>
              
              {metric === 'production' ? (
                <>
                  <Bar name="Peças Fin." dataKey="pecas_real" fill="#22c55e" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="pecas_real" position="top" className="fill-foreground text-[10px] font-bold" />
                  </Bar>
                  <Bar name="Ops. Realizadas" dataKey="ops_real" fill="#a855f7" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="ops_real" position="top" className="fill-foreground text-[10px] font-bold" />
                  </Bar>
                  <Bar name="Peças Plan." dataKey="pecas_plan" fill="#6b7280" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="pecas_plan" position="top" className="fill-muted-foreground text-[10px] font-bold" />
                  </Bar>
                </>
              ) : (
                <>
                  <Bar name="Horas Realizadas" dataKey="horas_real" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="horas_real" position="top" className="fill-foreground text-[10px] font-bold" formatter={(val: number) => `${val.toFixed(1)}h`} />
                  </Bar>
                  <Bar name="Horas Planejadas" dataKey="horas_plan" fill="#6b7280" opacity={0.6} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="horas_plan" position="top" className="fill-muted-foreground text-[10px] font-bold" formatter={(val: number) => `${val.toFixed(1)}h`} />
                  </Bar>
                </>
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ProgrammingPage() {
  const database = useDatabase();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMetric, setViewMetric] = useState<'production' | 'hours'>('production');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<string>('1');

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | undefined>(undefined);

  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);

  // Escuta registros de produção do Firestore para somar como Peças Finalizadas
  const productionRecordsQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'productionRecords')) : null
  , [firestore]);
  const { data: firestoreProduction } = useCollection(productionRecordsQuery);

  const form = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema),
    defaultValues: {
      dataExecucao: '',
      equipamento: '',
      requisicao: '',
      nomeDaPeca: '',
      quantidade: 0,
      quantidadeRealizada: 0,
      operacoesRealizadas: 0,
      operacoesPorPeca: 1,
      tecnico: '',
      horasPlanejadas: 0,
      turno: '1',
      site: 'VALINHOS DOVE',
      observacao: '',
      atividades: [{ tipo: 'PRODUCAO', tempo: 0 }],
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.setData('itemId', id);
  };

  const handleDrop = async (e: React.DragEvent, day: Date, turnoId: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('itemId') || draggedItemId;
    if (!itemId || !database) return;

    const newDateStr = format(day, 'dd/MM/yyyy');
    try {
      await update(ref(database, `/Planejamento S/${itemId}`), {
        dataExecucao: newDateStr,
        Turno: turnoId,
        turno: turnoId
      });
      toast({ title: "Planejamento Movido", description: `Movido para ${newDateStr} - ${turnoId}º Turno` });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao mover", variant: "destructive" });
    }
    setDraggedItemId(null);
  };

  const { chartData, isDayView: calculatedIsDayView } = useMemo(() => {
    const isDayView = !!selectedDateFilter;

    const centurTurns = [
      { label: '1º TURNO', pecas_plan: 0, pecas_real: 0, ops_real: 0, horas_plan: 0, horas_real: 0 },
      { label: '2º TURNO', pecas_plan: 0, pecas_real: 0, ops_real: 0, horas_plan: 0, horas_real: 0 },
      { label: '3º TURNO', pecas_plan: 0, pecas_real: 0, ops_real: 0, horas_plan: 0, horas_real: 0 }
    ];
    const centroTurns = [
      { label: '1º TURNO', pecas_plan: 0, pecas_real: 0, ops_real: 0, horas_plan: 0, horas_real: 0 },
      { label: '2º TURNO', pecas_plan: 0, pecas_real: 0, ops_real: 0, horas_plan: 0, horas_real: 0 },
      { label: '3º TURNO', pecas_plan: 0, pecas_real: 0, ops_real: 0, horas_plan: 0, horas_real: 0 }
    ];

    const centurMap: Record<string, any> = {};
    const centroMap: Record<string, any> = {};

    const calculateItemVolumes = (item: PlanejamentoItem) => {
      const pPlan = Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0;
      const pReal = Number(item.quantidadeRealizada !== undefined ? item.quantidadeRealizada : item['Quantidade Realizada']) || 0;
      const oReal = Number(item.operacoesRealizadas !== undefined ? item.operacoesRealizadas : (item['Operações Realizadas'] || 0)) || 0;
      
      let hPlan = 0, hReal = 0;
      const scale = pPlan > 0 ? (pReal / pPlan) : (pReal > 0 ? 1 : 0);

      if (item.atividades && Array.isArray(item.atividades)) {
          item.atividades.forEach(ativ => {
              const pTime = Number(ativ.tempo) || 0;
              hPlan += pTime;
              hReal += pTime * Math.min(1, scale);
          });
      } else {
          const h = typeof (item.horasPlanejadas || item['Horas Máquina']) === 'string' 
              ? parseFloat(String(item.horasPlanejadas || item['Horas Máquina']).replace(',', '.')) 
              : (Number(item.horasPlanejadas || item['Horas Máquina']) || 0);
          hPlan = h;
          hReal = h * Math.min(1, scale);
      }
      
      return { pPlan, pReal, oReal, hPlan, hReal };
    };

    // 1. Processar dados do Realtime Database (Planejamento)
    planejamentoData.forEach(item => {
      const dateStr = item.dataExecucao || item['Data Execução'];
      if (!dateStr) return;
      let date;
      try { date = parse(dateStr, 'dd/MM/yyyy', new Date()); } catch { date = new Date(dateStr); }
      if (isNaN(date.getTime())) return;

      const v = calculateItemVolumes(item);
      const equip = String(item.equipamento || item.EQUIPAMENTO || '').toUpperCase();
      
      if (isDayView) {
        if (!isSameDay(date, selectedDateFilter!)) return;
        const shiftVal = item.Turno || item.turno || '1';
        const turnoIndex = (parseInt(String(shiftVal)) || 1) - 1;
        const targetArr = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurTurns : 
                           (equip.includes('CENTRO') || equip.includes('D600')) ? centroTurns : null;
        if (targetArr && turnoIndex >= 0 && turnoIndex < 3) {
            targetArr[turnoIndex].pecas_plan += v.pPlan;
            targetArr[turnoIndex].pecas_real += v.pReal;
            targetArr[turnoIndex].ops_real += v.oReal;
            targetArr[turnoIndex].horas_plan += v.hPlan;
            targetArr[turnoIndex].horas_real += v.hReal;
        }
      } else {
        if (selectedWeekFilter !== 'all' && getISOWeek(date) !== parseInt(selectedWeekFilter)) return;
        let key = selectedWeekFilter !== 'all' ? format(date, 'yyyy-MM-dd') : format(date, 'yyyy-MM');
        let label = selectedWeekFilter !== 'all' ? format(date, 'dd/MM', { locale: ptBR }) : format(date, 'MMM yy', { locale: ptBR });
        const targetMap = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurMap : 
                           (equip.includes('CENTRO') || equip.includes('D600')) ? centroMap : null;
        if (targetMap) {
          if (!targetMap[key]) {
            targetMap[key] = { key, label, pecas_plan: 0, pecas_real: 0, ops_real: 0, horas_plan: 0, horas_real: 0 };
          }
          targetMap[key].pecas_plan += v.pPlan;
          targetMap[key].pecas_real += v.pReal;
          targetMap[key].ops_real += v.oReal;
          targetMap[key].horas_plan += v.hPlan;
          targetMap[key].horas_real += v.hReal;
        }
      }
    });

    // 2. Processar registros do Firestore (Produção Real do Técnico)
    if (firestoreProduction) {
      firestoreProduction.forEach(record => {
        const recordDate = record.date?.toDate ? record.date.toDate() : (record.date ? new Date(record.date) : null);
        if (!recordDate || isNaN(recordDate.getTime())) return;

        const qty = Number(record.quantityProduced) || 0;
        if (qty <= 0) return;

        const equip = String(record.machine || '').toUpperCase();
        
        // Determinar turno aproximado pelo horário de criação
        const hour = record.createdAt?.toDate ? record.createdAt.toDate().getHours() : 10;
        let tIdx = 0; // 1º Turno (default)
        if (hour >= 14 && hour < 22) tIdx = 1; // 2º Turno
        else if (hour >= 22 || hour < 6) tIdx = 2; // 3º Turno

        // Extrair número de operações se possível
        let ops = 0;
        const opsMatch = String(record.operationsNumber || '').match(/\d+/);
        ops = opsMatch ? parseInt(opsMatch[0]) : qty;

        if (isDayView) {
          if (!isSameDay(recordDate, selectedDateFilter!)) return;
          const targetArr = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurTurns : 
                             (equip.includes('CENTRO') || equip.includes('D600')) ? centroTurns : null;
          if (targetArr && tIdx >= 0 && tIdx < 3) {
            targetArr[tIdx].pecas_real += qty;
            targetArr[tIdx].ops_real += ops;
          }
        } else {
          if (selectedWeekFilter !== 'all' && getISOWeek(recordDate) !== parseInt(selectedWeekFilter)) return;
          let key = selectedWeekFilter !== 'all' ? format(recordDate, 'yyyy-MM-dd') : format(recordDate, 'yyyy-MM');
          let label = selectedWeekFilter !== 'all' ? format(recordDate, 'dd/MM', { locale: ptBR }) : format(recordDate, 'MMM yy', { locale: ptBR });
          const targetMap = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurMap : 
                             (equip.includes('CENTRO') || equip.includes('D600')) ? centroMap : null;
          if (targetMap) {
            if (!targetMap[key]) {
              targetMap[key] = { key, label, pecas_plan: 0, pecas_real: 0, ops_real: 0, horas_plan: 0, horas_real: 0 };
            }
            targetMap[key].pecas_real += qty;
            targetMap[key].ops_real += ops;
          }
        }
      });
    }

    const sortFn = (a: any, b: any) => a.key.localeCompare(b.key);
    return { chartData: { 
      centur: isDayView ? centurTurns : Object.values(centurMap).sort(sortFn), 
      centro: isDayView ? centroTurns : Object.values(centroMap).sort(sortFn) 
    }, isDayView };
  }, [planejamentoData, firestoreProduction, selectedWeekFilter, selectedDateFilter, viewMetric]);

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
      operacoesRealizadas: 0,
      operacoesPorPeca: 1,
      tecnico: '',
      horasPlanejadas: 0,
      site: 'VALINHOS DOVE',
      observacao: '',
      atividades: [{ tipo: 'PRODUCAO', tempo: 0 }],
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
        : (Number(item.horasPlanejadas || item['Horas Máquina']) || 0)
    }];

    form.reset({
      dataExecucao: dateStr || '',
      turno: shiftVal,
      equipamento: item.equipamento || item.EQUIPAMENTO || '',
      requisicao: item.requisicao || item['Requisição'] || '',
      nomeDaPeca: item.nomeDaPeca || item['Nome da Peça'] || '',
      quantidade: Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0,
      quantidadeRealizada: Number(item.quantidadeRealizada !== undefined ? item.quantidadeRealizada : item['Quantidade Realizada']) || 0,
      operacoesRealizadas: Number(item.operacoesRealizadas !== undefined ? item.operacoesRealizadas : (item['Operações Realizadas'] || 0)) || 0,
      operacoesPorPeca: Number(item.operacoesPorPeca !== undefined ? item.operacoesPorPeca : (item['Operações por Peça'] || 1)),
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
        quantidadeRealizada: values.quantidadeRealizada,
        operacoesRealizadas: values.operacoesRealizadas,
        operacoesPorPeca: values.operacoesPorPeca,
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
    const qtdPlan = Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0;
    const qtdReal = Number(item.quantidadeRealizada !== undefined ? item.quantidadeRealizada : item['Quantidade Realizada']) || 0;
    const isCompleted = qtdReal >= qtdPlan && qtdPlan > 0;
    
    return (
      <TooltipProvider key={item.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
              className={cn(
                "mb-1 cursor-grab active:cursor-grabbing truncate rounded border p-1 text-[10px] leading-tight shadow-sm transition-all flex items-center gap-1 group/event",
                isCompleted ? "border-green-500/50 bg-green-500/5" : "border-border bg-card hover:border-primary"
              )}
            >
              <Move className="h-2 w-2 opacity-0 group-hover/event:opacity-40 transition-opacity" />
              {isCompleted && <CheckCircle2 className="h-2 w-2 text-green-500 shrink-0" />}
              <span className="font-bold text-primary mr-1">{item.requisicao || item['Requisição']}</span>
              <span className="truncate">{item.nomeDaPeca || item['Nome da Peça']}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="w-64 p-3" side="right">
            <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-muted-foreground">Equip:</span><span className="font-medium text-right">{item.equipamento || item.EQUIPAMENTO}</span>
                <span className="text-muted-foreground">Produção:</span><span className="font-medium text-right">{qtdReal} / {qtdPlan} pçs</span>
                <span className="text-muted-foreground">Total Planejado:</span><span className="font-medium text-right">{(Number(item.horasPlanejadas || item['Horas Máquina']) || 0).toFixed(1)}h</span>
                <span className="text-muted-foreground">Técnico:</span><span className="font-medium text-right truncate">{item.tecnico || item.Técnicos}</span>
                <span className="text-[10px] text-muted-foreground col-span-2 pt-1 border-t italic">Segure e arraste para mudar a data ou turno</span>
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
          <p className="text-muted-foreground">Visualização mensal do plano mestre por turnos com suporte a Drag & Drop.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[140px] text-center font-bold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</div>
          <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="secondary" size="sm" onClick={goToToday}>Hoje</Button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-[600px] items-center justify-center gap-2 bg-card rounded-lg border">
              <Loader className="h-8 w-8 animate-spin" /><span className="font-medium">Carregando...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border overflow-hidden rounded-lg border shadow-lg">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-muted/50 p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{day}</div>
              ))}
              {calendarDays.map((day) => {
                const dayItems = getItemsForDay(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                return (
                  <div key={day.toString()} className={cn("min-h-[160px] bg-card p-1 flex flex-col gap-1", !isCurrentMonth && "bg-muted/30 opacity-50", isToday(day) && "ring-1 ring-inset ring-primary z-10")}>
                    <div className="flex items-center justify-between p-1">
                      <span className={cn("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full", isToday(day) ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{format(day, 'd')}</span>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[180px] scrollbar-hide">
                      {turnos.map(turno => {
                        const itemsInTurno = dayItems.filter(item => { 
                          const shiftVal = String(item.Turno || item.turno || '1');
                          return shiftVal === turno.id; 
                        });
                        return (
                          <div 
                            key={turno.id} 
                            className="group/turno relative"
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDrop(e, day, turno.id)}
                          >
                            <div onClick={() => handleShiftClick(day, turno.id)} className={cn("text-[8px] px-1 py-0.5 rounded border font-bold uppercase cursor-pointer hover:opacity-80 flex items-center justify-between transition-colors", turno.color)}>
                              {turno.label}<Plus className="h-2 w-2 opacity-0 group-hover/turno:opacity-100" />
                            </div>
                            <div className="min-h-[5px] mt-1">{itemsInTurno.map(item => renderEvent(item))}</div>
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

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t pt-8">
        <h2 className="text-xl font-bold tracking-tight">Gráficos de Consolidado</h2>
        <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border shadow-sm">
          <Tabs value={viewMetric} onValueChange={(val: any) => setViewMetric(val)}>
            <TabsList className="h-8">
              <TabsTrigger value="production" className="text-[10px] font-bold">PRODUÇÃO</TabsTrigger>
              <TabsTrigger value="hours" className="text-[10px] font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> HORAS</TabsTrigger>
            </TabsList>
          </Tabs>
          <Popover>
              <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-8 text-xs font-bold", !selectedDateFilter && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3 w-3" />{selectedDateFilter ? format(selectedDateFilter, "dd/MM/yyyy") : "Dia"}
                  </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDateFilter} onSelect={(date) => { setSelectedDateFilter(date); if (date) setSelectedWeekFilter('all'); }} initialFocus /></PopoverContent>
          </Popover>
          <Select value={selectedWeekFilter} onValueChange={(val) => { setSelectedWeekFilter(val); if (val !== 'all') setSelectedDateFilter(undefined); }}>
            <SelectTrigger className="w-[100px] h-8 text-xs font-bold"><SelectValue placeholder="Semana" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Array.from({ length: 53 }, (_, i) => i + 1).map(week => (<SelectItem key={week} value={String(week)}>S{week}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanningChart data={chartData.centur} title="Torno Centur 30" isDayView={calculatedIsDayView} metric={viewMetric} />
        <PlanningChart data={chartData.centro} title="Centro D600" isDayView={calculatedIsDayView} metric={viewMetric} />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
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
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ tipo: 'PRODUCAO', tempo: 0 })} className="h-7 text-[10px] font-bold"><PlusCircle className="h-3 w-3 mr-1" /> ADICIONAR ATIVIDADE</Button>
                </div>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-end border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex-1">
                      <FormField control={form.control} name={`atividades.${index}.tipo`} render={({ field }) => (
                        <FormItem>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tipo" /></SelectTrigger></FormControl>
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
                    <div className="w-24">
                      <FormField control={form.control} name={`atividades.${index}.tempo`} render={({ field }) => (
                        <FormItem><FormControl><Input type="number" step="0.1" placeholder="Horas" className="h-8 text-xs" {...field} /></FormControl></FormItem>
                      )} />
                    </div>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeAtividade(index)} className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Acumulado:</span>
                    <span className="text-sm font-black text-primary">{form.getValues('horasPlanejadas').toFixed(1)}h</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="site" render={({ field }) => (<FormItem><FormLabel>Fábrica</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FormItem>)} />
                <FormField control={form.control} name="tecnico" render={({ field }) => (<FormItem><FormLabel>Técnico</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="requisicao" render={({ field }) => (<FormItem><FormLabel>Nº Requisição</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="nomeDaPeca" render={({ field }) => (<FormItem><FormLabel>Peça</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
              </div>
              <div className="grid grid-cols-3 gap-4 bg-muted/10 p-3 rounded-lg border border-dashed">
                <FormField control={form.control} name="quantidade" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold">Peças Plan.</FormLabel><FormControl><Input type="number" className="h-8" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="quantidadeRealizada" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold text-green-500">Peças Fin.</FormLabel><FormControl><Input type="number" className="h-8 border-green-500/30" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="operacoesRealizadas" render={({ field }) => (<FormItem><FormLabel className="text-[10px] uppercase font-bold text-purple-500">Ops. Realizadas</FormLabel><FormControl><Input type="number" className="h-8 border-purple-500/30" {...field} /></FormControl></FormItem>)} />
              </div>
              <FormField control={form.control} name="observacao" render={({ field }) => (<FormItem><FormLabel>Notas</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
              <DialogFooter>
                {editingId && (<Button type="button" variant="destructive" onClick={handleDeleteItem}>Excluir</Button>)}
                <Button type="submit">Salvar</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
