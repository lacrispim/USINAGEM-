
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
  Calendar as CalendarIcon,
  Factory,
  User,
  Plus,
  Trash2,
  Cpu,
  Settings2,
  CheckCircle2,
  X,
  Layers,
  Clock,
  Filter
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
  LabelList,
  Cell
} from 'recharts';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';

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
  perdaPlanejada?: string;
  'Perdas planejadas'?: string;
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
  { value: 'DDS', label: 'DDS / ADM / Apontamento', color: '#f97316' },
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
  operacoesPorPeca: z.coerce.number().min(1, 'Mínimo 1 operação.'),
  tecnico: z.string().min(1, 'Técnico é obrigatório.'),
  horasPlanejadas: z.coerce.number().min(0.1, 'Horas planejadas deve ser maior que zero.'),
  turno: z.string(),
  site: z.string().min(1, 'Site é obrigatório.'),
  observacao: z.string().optional(),
  perdaPlanejada: z.string().default('PRODUCAO'),
});

type PlanningFormValues = z.infer<typeof planningFormSchema>;

const CustomLegend = (props: any) => {
  const { isDayView, metric, visibleLossTypes } = props;

  const activeOptions = lossOptions.filter(opt => visibleLossTypes.includes(opt.value));

  if (isDayView) {
    return (
      <div className="flex justify-center gap-8 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a855f7' }} />
          <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Planejado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Realizado</span>
        </div>
      </div>
    );
  }

  // Legend for Period View (Stacked)
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 items-center border-b pb-2">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2">Tipos:</span>
        {activeOptions.map((opt) => (
           <div key={opt.value} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: opt.color }} />
            <span className="text-[9px] font-bold uppercase">{opt.label}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-center gap-8">
         <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Barra Esq: Plan | Barra Dir: Real</span>
        </div>
      </div>
    </div>
  );
};

const PlanningChart = ({ 
  data, 
  title, 
  isDayView, 
  metric, 
  visibleLossTypes 
}: { 
  data: any[], 
  title: string, 
  isDayView: boolean, 
  metric: 'pieces' | 'operations' | 'hours',
  visibleLossTypes: string[]
}) => {
  if (!data || data.length === 0) return (
    <Card className="flex h-[300px] items-center justify-center border-dashed">
      <p className="text-muted-foreground text-xs uppercase font-bold tracking-widest">{title}: Sem dados</p>
    </Card>
  );

  const unit = metric === 'pieces' ? 'p' : metric === 'operations' ? 'op' : 'h';
  const activeOptions = lossOptions.filter(opt => visibleLossTypes.includes(opt.value));
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold uppercase tracking-tight">{title}</CardTitle>
        <CardDescription className="text-[10px]">
          {isDayView ? "Visão por Turno" : `Consolidado por ${metric === 'pieces' ? 'Peças' : metric === 'operations' ? 'Operações' : 'Horas'}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={isDayView ? 12 : 6} margin={{ top: 30, right: 30, left: 10, bottom: 10 }}>
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
                tickFormatter={(val) => `${val}${unit}`}
              />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
                formatter={(val: number) => [`${val.toFixed(1)} ${unit}`, '']}
              />
              <Legend content={<CustomLegend isDayView={isDayView} metric={metric} visibleLossTypes={visibleLossTypes} />} verticalAlign="top" />
              
              {isDayView ? (
                <>
                  <Bar dataKey="planejado" name="Planejado" fill="#a855f7" radius={[4, 4, 0, 0]}>
                    <LabelList 
                        dataKey="planejado" 
                        position="top" 
                        className="fill-foreground text-[10px] font-black"
                        formatter={(val: number) => val > 0 ? `${val.toFixed(1)}${unit}` : ''}
                    />
                  </Bar>
                  <Bar dataKey="realizado" name="Realizado" fill="#22c55e" radius={[4, 4, 0, 0]}>
                    <LabelList 
                        dataKey="realizado" 
                        position="top" 
                        className="fill-green-500 text-[10px] font-black"
                        formatter={(val: number) => val > 0 ? `${val.toFixed(1)}${unit}` : ''}
                    />
                  </Bar>
                </>
              ) : (
                <>
                  {/* Categorized Stacks */}
                  {activeOptions.map(opt => (
                    <Bar key={`plan_${opt.value}`} dataKey={`plan_${opt.value}`} stackId="planejado" fill={opt.color} />
                  ))}
                  <Bar dataKey="spacer_plan" stackId="planejado" fill="transparent" radius={[4, 4, 0, 0]}>
                    <LabelList 
                        dataKey="total_plan" 
                        position="top" 
                        className="fill-foreground text-[10px] font-black"
                        formatter={(val: number) => val > 0 ? `${val.toFixed(1)}${unit}` : ''}
                    />
                  </Bar>

                  {activeOptions.map(opt => (
                    <Bar key={`real_${opt.value}`} dataKey={`real_${opt.value}`} stackId="realizado" fill={opt.color} opacity={0.7} />
                  ))}
                  <Bar dataKey="spacer_real" stackId="realizado" fill="transparent" radius={[4, 4, 0, 0]}>
                    <LabelList 
                        dataKey="total_real" 
                        position="top" 
                        className="fill-green-500 text-[10px] font-black"
                        formatter={(val: number) => val > 0 ? `${val.toFixed(1)}${unit}` : ''}
                    />
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
  const { toast } = useToast();
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMetric, setViewMetric] = useState<'pieces' | 'operations' | 'hours'>('pieces');
  const [visibleLossTypes, setVisibleLossTypes] = useState<string[]>(lossOptions.map(o => o.value));
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTurno, setSelectedTurno] = useState<string>('1');

  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<Date | undefined>(undefined);

  const form = useForm<PlanningFormValues>({
    resolver: zodResolver(planningFormSchema),
    defaultValues: {
      dataExecucao: '',
      equipamento: '',
      requisicao: '',
      nomeDaPeca: '',
      quantidade: 0,
      quantidadeRealizada: 0,
      operacoesPorPeca: 1,
      tecnico: '',
      horasPlanejadas: 0,
      turno: '1',
      site: 'VALINHOS DOVE',
      observacao: '',
      perdaPlanejada: 'PRODUCAO',
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

  const toggleLossType = (type: string) => {
    setVisibleLossTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const { chartData, isDayView: calculatedIsDayView } = useMemo(() => {
    const isDayView = !!selectedDateFilter;

    const processItem = (item: PlanejamentoItem) => {
      const qtd = Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0;
      const qtdReal = Number(item.quantidadeRealizada !== undefined ? item.quantidadeRealizada : item['Quantidade Realizada']) || 0;
      const ops = Number(item.operacoesPorPeca !== undefined ? item.operacoesPorPeca : (item['Operações por Peça'] || 1));
      const hours = typeof (item.horasPlanejadas || item['Horas Máquina']) === 'string' 
        ? parseFloat(String(item.horasPlanejadas || item['Horas Máquina']).replace(',', '.')) 
        : (Number(item.horasPlanejadas || item['Horas Máquina']) || 0);

      const typeRaw = (item.perdaPlanejada || item['Perdas planejadas'] || 'PRODUCAO').toUpperCase();
      let type = 'PRODUCAO';
      if (typeRaw.includes('SETUP')) type = 'SETUP';
      else if (typeRaw.includes('DDS') || typeRaw.includes('ADM') || typeRaw.includes('APONTAMENTO')) type = 'DDS';
      else if (typeRaw.includes('CAFÉ') || typeRaw.includes('CAFE')) type = 'CAFE';
      else if (typeRaw.includes('LIMPEZA')) type = 'LIMPEZA';
      else if (typeRaw.includes('INSPEÇÃO') || typeRaw.includes('QUALIDADE')) type = 'QUALIDADE';

      // Check if this type is visible
      if (!visibleLossTypes.includes(type)) {
        return { plan: 0, real: 0, type };
      }

      if (viewMetric === 'operations') {
        return { plan: qtd * ops, real: qtdReal * ops, type };
      }
      if (viewMetric === 'hours') {
        const scale = qtd > 0 ? (qtdReal / qtd) : 1; 
        return { plan: hours, real: hours * Math.min(1, scale), type };
      }
      return { plan: qtd, real: qtdReal, type };
    };

    if (isDayView) {
      const centurTurns = [
        { label: '1º Turno', planejado: 0, realizado: 0 },
        { label: '2º Turno', planejado: 0, realizado: 0 },
        { label: '3º Turno', planejado: 0, realizado: 0 }
      ];
      const centroTurns = [
        { label: '1º Turno', planejado: 0, realizado: 0 },
        { label: '2º Turno', planejado: 0, realizado: 0 },
        { label: '3º Turno', planejado: 0, realizado: 0 }
      ];

      planejamentoData.forEach(item => {
        const dateStr = item.dataExecucao || item['Data Execução'];
        if (!dateStr) return;
        
        let date;
        try { date = parse(dateStr, 'dd/MM/yyyy', new Date()); } catch { date = new Date(dateStr); }
        if (isNaN(date.getTime()) || !isSameDay(date, selectedDateFilter!)) return;

        const { plan, real } = processItem(item);
        const equip = String(item.equipamento || item.EQUIPAMENTO || '').toUpperCase();
        const turnoIndex = (parseInt(String(item.Turno || '1')) || 1) - 1;

        const targetArr = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurTurns : 
                           (equip.includes('CENTRO') || equip.includes('D600')) ? centroTurns : null;

        if (targetArr && turnoIndex >= 0 && turnoIndex < 3) {
          targetArr[turnoIndex].planejado += plan;
          targetArr[turnoIndex].realizado += real;
        }
      });

      return { chartData: { centur: centurTurns, centro: centroTurns }, isDayView: true };
    }

    const centurMap: Record<string, any> = {};
    const centroMap: Record<string, any> = {};

    planejamentoData.forEach(item => {
      const dateStr = item.dataExecucao || item['Data Execução'];
      if (!dateStr) return;
      
      let date;
      try { date = parse(dateStr, 'dd/MM/yyyy', new Date()); } catch { date = new Date(dateStr); }
      if (isNaN(date.getTime())) return;

      if (selectedWeekFilter !== 'all') {
        const itemWeek = getISOWeek(date);
        if (itemWeek !== parseInt(selectedWeekFilter)) return;
      }
      
      let key, label;
      if (selectedWeekFilter !== 'all') {
        key = format(date, 'yyyy-MM-dd');
        label = format(date, 'dd/MM', { locale: ptBR });
      } else {
        key = format(date, 'yyyy-MM');
        label = format(date, 'MMM yy', { locale: ptBR });
      }

      const { plan, real, type } = processItem(item);
      const equip = String(item.equipamento || item.EQUIPAMENTO || '').toUpperCase();

      const targetMap = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurMap : 
                         (equip.includes('CENTRO') || equip.includes('D600')) ? centroMap : null;

      if (targetMap) {
        if (!targetMap[key]) {
          targetMap[key] = { 
            key, label, total_plan: 0, total_real: 0,
            ...lossOptions.reduce((acc, opt) => ({ ...acc, [`plan_${opt.value}`]: 0, [`real_${opt.value}`]: 0 }), {})
          };
        }
        targetMap[key].total_plan += plan;
        targetMap[key].total_real += real;
        targetMap[key][`plan_${type}`] += plan;
        targetMap[key][`real_${type}`] += real;
      }
    });

    const sortFn = (a: any, b: any) => a.key.localeCompare(b.key);

    return {
      chartData: {
        centur: Object.values(centurMap).sort(sortFn),
        centro: Object.values(centroMap).sort(sortFn)
      },
      isDayView: false
    };
  }, [planejamentoData, selectedWeekFilter, selectedDateFilter, viewMetric, visibleLossTypes]);

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
      operacoesPorPeca: 1,
      tecnico: '',
      horasPlanejadas: 0,
      site: 'VALINHOS DOVE',
      observacao: '',
      perdaPlanejada: 'PRODUCAO',
    });
    setIsDialogOpen(true);
  };

  const handleItemClick = (item: PlanejamentoItem) => {
    setEditingId(item.id);
    setSelectedTurno(String(item.Turno || '1'));
    
    let itemDate = new Date();
    const dateStr = item.dataExecucao || item['Data Execução'];
    if (dateStr) {
        try { itemDate = parse(dateStr, 'dd/MM/yyyy', new Date()); } catch { itemDate = new Date(dateStr); }
    }
    setSelectedDay(itemDate);

    const typeRaw = (item.perdaPlanejada || item['Perdas planejadas'] || 'PRODUCAO').toUpperCase();
    let initialType = 'PRODUCAO';
    if (typeRaw.includes('SETUP')) initialType = 'SETUP';
    else if (typeRaw.includes('DDS') || typeRaw.includes('ADM')) initialType = 'DDS';
    else if (typeRaw.includes('CAFÉ') || typeRaw.includes('CAFE')) initialType = 'CAFE';
    else if (typeRaw.includes('LIMPEZA')) initialType = 'LIMPEZA';
    else if (typeRaw.includes('INSPEÇÃO') || typeRaw.includes('QUALIDADE')) initialType = 'QUALIDADE';

    form.reset({
      dataExecucao: dateStr || '',
      turno: item.Turno ? String(item.Turno) : '1',
      equipamento: item.equipamento || item.EQUIPAMENTO || '',
      requisicao: item.requisicao || item['Requisição'] || '',
      nomeDaPeca: item.nomeDaPeca || item['Nome da Peça'] || '',
      quantidade: Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0,
      quantidadeRealizada: Number(item.quantidadeRealizada !== undefined ? item.quantidadeRealizada : item['Quantidade Realizada']) || 0,
      operacoesPorPeca: Number(item.operacoesPorPeca !== undefined ? item.operacoesPorPeca : (item['Operações por Peça'] || 1)),
      tecnico: item.tecnico || item.Técnicos || '',
      horasPlanejadas: typeof (item.horasPlanejadas || item['Horas Máquina']) === 'string' 
        ? parseFloat(String(item.horasPlanejadas || item['Horas Máquina']).replace(',', '.')) 
        : (Number(item.horasPlanejadas || item['Horas Máquina']) || 0),
      site: item.site || item.Site || 'VALINHOS DOVE',
      observacao: item.observacao || item.Observação || '',
      perdaPlanejada: initialType,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteItem = async () => {
    if (!database || !editingId) return;
    try {
      const itemRef = ref(database, `/Planejamento S/${editingId}`);
      await remove(itemRef);
      toast({ title: "Planejamento Excluído", description: "O planejamento foi removido com sucesso." });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro ao Excluir", description: "Não foi possível remover o planejamento.", variant: "destructive" });
    }
  };

  async function onSubmit(values: PlanningFormValues) {
    if (!database) return;
    try {
      const lossLabel = lossOptions.find(o => o.value === values.perdaPlanejada)?.label || '';

      const payload = {
        dataExecucao: values.dataExecucao,
        equipamento: values.equipamento,
        requisicao: values.requisicao,
        nomeDaPeca: values.nomeDaPeca,
        quantidade: values.quantidade,
        quantidadeRealizada: values.quantidadeRealizada,
        operacoesPorPeca: values.operacoesPorPeca,
        tecnico: values.tecnico,
        horasPlanejadas: values.horasPlanejadas,
        turno: values.turno,
        site: values.site,
        observacao: values.observacao || '',
        'Perdas planejadas': values.perdaPlanejada === 'PRODUCAO' ? '' : lossLabel.toUpperCase()
      };

      if (editingId) {
        const itemRef = ref(database, `/Planejamento S/${editingId}`);
        await update(itemRef, payload);
        toast({ title: "Planejamento Atualizado", description: "As alterações foram salvas com sucesso." });
      } else {
        const dbRef = ref(database, '/Planejamento S');
        const newItemRef = push(dbRef);
        await set(newItemRef, payload);
        toast({ title: "Planejamento Salvo", description: "A nova ordem de produção foi adicionada ao plano." });
      }
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro ao Salvar", description: "Não foi possível salvar o planejamento.", variant: "destructive" });
    }
  }

  const renderEvent = (item: PlanejamentoItem) => {
    const requisicao = item.requisicao || item['Requisição'];
    const nomeDaPeca = item.nomeDaPeca || item['Nome da Peça'];
    const site = item.site || item.Site;
    const equipamento = item.equipamento || item.EQUIPAMENTO;
    const tecnico = item.tecnico || item.Técnicos;
    const observacao = item.observacao || item.Observação;
    const qtdPlan = Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0;
    const qtdReal = Number(item.quantidadeRealizada !== undefined ? item.quantidadeRealizada : item['Quantidade Realizada']) || 0;
    const ops = Number(item.operacoesPorPeca !== undefined ? item.operacoesPorPeca : (item['Operações por Peça'] || 1));
    const isCompleted = qtdReal >= qtdPlan && qtdPlan > 0;
    
    const typeRaw = (item.perdaPlanejada || item['Perdas planejadas'] || 'PRODUCAO').toUpperCase();
    let badgeColor = "bg-primary";
    if (typeRaw.includes('SETUP')) badgeColor = "bg-red-500";
    else if (typeRaw.includes('DDS') || typeRaw.includes('ADM')) badgeColor = "bg-orange-500";
    else if (typeRaw.includes('CAFÉ') || typeRaw.includes('CAFE')) badgeColor = "bg-yellow-500 text-black";
    else if (typeRaw.includes('LIMPEZA')) badgeColor = "bg-green-500";
    else if (typeRaw.includes('INSPEÇÃO') || typeRaw.includes('QUALIDADE')) badgeColor = "bg-blue-500";

    return (
      <TooltipProvider key={item.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
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
                <Badge className={cn("text-[10px]", badgeColor)}>
                    {isCompleted ? 'Finalizado' : site}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground"><Factory className="h-3 w-3" /><span>Equip:</span></div>
                <span className="font-medium text-right">{equipamento || 'N/A'}</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><CheckCircle2 className="h-3 w-3" /><span>Produção:</span></div>
                <span className="font-medium text-right">{qtdReal} / {qtdPlan} pçs</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><Layers className="h-3 w-3" /><span>Esforço:</span></div>
                <span className="font-medium text-right">{qtdReal * ops} / {qtdPlan * ops} ops</span>
                <div className="flex items-center gap-1.5 text-muted-foreground"><User className="h-3 w-3" /><span>Técnico:</span></div>
                <span className="font-medium text-right truncate">{tecnico || 'Não definido'}</span>
              </div>
              {observacao && <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground italic">"{observacao}"</div>}
              <div className="mt-2 text-[8px] text-center text-primary font-bold uppercase tracking-widest animate-pulse">Clique para editar</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const clearFilters = () => {
    setSelectedDateFilter(undefined);
    setSelectedWeekFilter('all');
    setVisibleLossTypes(lossOptions.map(o => o.value));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planejamento de Produção</h1>
          <p className="text-muted-foreground">Visualização mensal do plano mestre por turnos.</p>
        </div>
        <div className="flex items-center gap-2 bg-card p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[140px] text-center font-bold capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</div>
          <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
          <div className="w-px h-4 bg-border mx-1" /><Button variant="secondary" size="sm" onClick={goToToday} className="h-8">Hoje</Button>
        </div>
      </div>

      <Card className="border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-[600px] items-center justify-center gap-2 bg-card rounded-lg border">
              <Loader className="h-8 w-8 animate-spin" /><span className="font-medium">Carregando planejamento...</span>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-border overflow-hidden rounded-lg border shadow-lg">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="bg-muted/50 p-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">{day}</div>
              ))}
              {calendarDays.map((day) => {
                const dayItems = getItemsForDay(day);
                const isCurrentMonth = isSameMonth(day, monthStart);
                const isTodayDate = isToday(day);
                return (
                  <div key={day.toString()} className={cn("min-h-[160px] bg-card p-1 flex flex-col gap-1 transition-colors", !isCurrentMonth && "bg-muted/30 opacity-50", isTodayDate && "ring-1 ring-inset ring-primary z-10")}>
                    <div className="flex items-center justify-between p-1">
                      <span className={cn("text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full", isTodayDate ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{format(day, 'd')}</span>
                    </div>
                    <div className="flex-1 space-y-2 overflow-y-auto max-h-[180px] scrollbar-hide pb-2">
                      {turnos.map(turno => {
                        const itemsInTurno = dayItems.filter(item => { if (!item.Turno) return turno.id === '1'; return String(item.Turno) === turno.id; });
                        return (
                          <div key={turno.id} className="group/turno relative">
                            <div onClick={() => handleShiftClick(day, turno.id)} className={cn("text-[8px] px-1 py-0.5 rounded border font-bold uppercase tracking-tighter cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-between", turno.color)}>
                              {turno.label}<Plus className="h-2 w-2 opacity-0 group-hover/turno:opacity-100 transition-opacity" />
                            </div>
                            <div className="min-h-[10px] mt-1 px-1">{itemsInTurno.map(item => renderEvent(item))}</div>
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
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight">Gráficos de Consolidado</h2>
          <p className="text-sm text-muted-foreground">Performance e alocação de tempo por tipo de atividade.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-lg border shadow-sm w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Métrica:</Label>
            <Tabs value={viewMetric} onValueChange={(val: any) => setViewMetric(val)} className="h-8">
              <TabsList className="h-8">
                <TabsTrigger value="pieces" className="text-[10px] font-bold px-2 py-1">PEÇAS</TabsTrigger>
                <TabsTrigger value="operations" className="text-[10px] font-bold px-2 py-1">OPS</TabsTrigger>
                <TabsTrigger value="hours" className="text-[10px] font-bold px-2 py-1 flex items-center gap-1"><Clock className="h-3 w-3" /> HORAS</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categorias:</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2">
                  <Filter className="h-3 w-3" />
                  ({visibleLossTypes.length}/{lossOptions.length})
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3" align="end">
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b pb-1">Filtrar Atividades</p>
                  <div className="grid gap-2">
                    {lossOptions.map((opt) => (
                      <div key={opt.value} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`filter-${opt.value}`} 
                          checked={visibleLossTypes.includes(opt.value)}
                          onCheckedChange={() => toggleLossType(opt.value)}
                        />
                        <label 
                          htmlFor={`filter-${opt.value}`}
                          className="text-[10px] font-bold uppercase leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                          {opt.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t mt-2 flex justify-between">
                      <Button variant="ghost" size="sm" className="h-6 text-[8px] uppercase font-black" onClick={() => setVisibleLossTypes(lossOptions.map(o => o.value))}>Todos</Button>
                      <Button variant="ghost" size="sm" className="h-6 text-[8px] uppercase font-black text-destructive" onClick={() => setVisibleLossTypes(['PRODUCAO'])}>Apenas Prod.</Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Label htmlFor="date-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dia:</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button id="date-filter" variant="outline" size="sm" className={cn("h-8 text-xs font-bold", !selectedDateFilter && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {selectedDateFilter ? format(selectedDateFilter, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={selectedDateFilter} onSelect={(date) => { setSelectedDateFilter(date); if (date) setSelectedWeekFilter('all'); }} initialFocus />
                </PopoverContent>
            </Popover>
          </div>
          <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Label htmlFor="week-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Semana:</Label>
            <Select value={selectedWeekFilter} onValueChange={(val) => { setSelectedWeekFilter(val); if (val !== 'all') setSelectedDateFilter(undefined); }}>
              <SelectTrigger id="week-filter" className="w-[100px] h-8 text-xs font-bold"><SelectValue placeholder="Semana" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Array.from({ length: 53 }, (_, i) => i + 1).map(week => (<SelectItem key={week} value={String(week)}>S{week}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          {(selectedDateFilter || selectedWeekFilter !== 'all' || visibleLossTypes.length !== lossOptions.length) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"><X className="mr-1 h-3 w-3" /> Limpar</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanningChart 
          data={chartData.centur} 
          title="Consolidado Torno Centur 30" 
          isDayView={calculatedIsDayView} 
          metric={viewMetric} 
          visibleLossTypes={visibleLossTypes}
        />
        <PlanningChart 
          data={chartData.centro} 
          title="Consolidado Centro D600" 
          isDayView={calculatedIsDayView} 
          metric={viewMetric} 
          visibleLossTypes={visibleLossTypes}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{editingId ? 'Editar Planejamento' : `Novo Planejamento - ${selectedTurno}º Turno`}</DialogTitle>
            <DialogDescription>{editingId ? 'Atualize as informações e o esforço da produção.' : `Preencha os dados da ordem para ${selectedDay && format(selectedDay, "dd/MM/yyyy")}.`}</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="equipamento" render={({ field }) => (
                  <FormItem className="space-y-4">
                    <FormLabel className="text-base font-bold text-primary uppercase tracking-wider">Selecione o Equipamento</FormLabel>
                    <div className="grid grid-cols-2 gap-4">
                      <Button type="button" variant={field.value === 'TORNO CNC CENTUR 30' ? 'default' : 'outline'} className={cn("h-24 flex flex-col gap-2 transition-all border-2", field.value === 'TORNO CNC CENTUR 30' ? "border-primary ring-2 ring-primary/20" : "border-muted")} onClick={() => field.onChange('TORNO CNC CENTUR 30')}>
                        <Settings2 className={cn("h-8 w-8", field.value === 'TORNO CNC CENTUR 30' ? "text-primary-foreground" : "text-muted-foreground")} /><span className="font-bold text-sm">TORNO CENTUR 30</span>
                      </Button>
                      <Button type="button" variant={field.value === 'CENTRO DE USINAGEM D600' ? 'default' : 'outline'} className={cn("h-24 flex flex-col gap-2 transition-all border-2", field.value === 'CENTRO DE USINAGEM D600' ? "border-primary ring-2 ring-primary/20" : "border-muted")} onClick={() => field.onChange('CENTRO DE USINAGEM D600')}>
                        <Cpu className={cn("h-8 w-8", field.value === 'CENTRO DE USINAGEM D600' ? "text-primary-foreground" : "text-muted-foreground")} /><span className="font-bold text-sm">CENTRO D600</span>
                      </Button>
                    </div><FormMessage />
                  </FormItem>
                )} />

              <FormField control={form.control} name="perdaPlanejada" render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold">Tipo de Atividade / Perda Planejada</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-2">
                        <SelectValue placeholder="Selecione o tipo de atividade" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {lossOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="dataExecucao" render={({ field }) => (<FormItem><FormLabel>Data</FormLabel><FormControl><Input disabled {...field} className="bg-muted" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="site" render={({ field }) => (<FormItem><FormLabel>Site/Fábrica</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl><SelectContent>{factoryList.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="requisicao" render={({ field }) => (<FormItem><FormLabel>Nº Requisição (Forms)</FormLabel><FormControl><Input placeholder="Ex: F-1024" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="nomeDaPeca" render={({ field }) => (<FormItem><FormLabel>Nome da Peça</FormLabel><FormControl><Input placeholder="Ex: Eixo do Motor" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg border border-primary/20">
                <FormField control={form.control} name="quantidade" render={({ field }) => (<FormItem><FormLabel className="text-primary font-bold">Qtd. Plan.</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="quantidadeRealizada" render={({ field }) => (<FormItem><FormLabel className="text-green-500 font-bold">Qtd. Real.</FormLabel><FormControl><Input type="number" className="border-green-500/50" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="operacoesPorPeca" render={({ field }) => (<FormItem><FormLabel className="text-amber-500 font-bold">Ops/Peça</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="horasPlanejadas" render={({ field }) => (<FormItem><FormLabel>Horas Planejadas</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="tecnico" render={({ field }) => (<FormItem><FormLabel>Técnico Responsável</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger></FormControl><SelectContent>{operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
              </div>
              <FormField control={form.control} name="observacao" render={({ field }) => (<FormItem><FormLabel>Observações</FormLabel><FormControl><Textarea placeholder="Notas adicionais..." {...field} /></FormControl><FormMessage /></FormItem>)} />
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {editingId && (<AlertDialog><AlertDialogTrigger asChild><Button type="button" variant="destructive" className="sm:mr-auto"><Trash2 className="h-4 w-4 mr-2" />Excluir</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteItem} className="bg-destructive text-destructive-foreground">Confirmar Exclusão</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>)}
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button type="submit">{editingId ? 'Salvar Alterações' : 'Salvar Planejamento'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
