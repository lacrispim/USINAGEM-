
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
  Filter,
  PlusCircle
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
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
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
  operacoesPorPeca: z.coerce.number().min(1, 'Mínimo 1 operação.'),
  tecnico: z.string().min(1, 'Técnico é obrigatório.'),
  horasPlanejadas: z.coerce.number().default(0),
  turno: z.string(),
  site: z.string().min(1, 'Site é obrigatório.'),
  observacao: z.string().optional(),
  atividades: z.array(z.object({
    tipo: z.string().min(1, 'Tipo é obrigatório'),
    tempo: z.coerce.number().min(0.01, 'Tempo deve ser maior que zero')
  })).min(1, 'Adicione pelo menos uma atividade'),
});

type PlanningFormValues = z.infer<typeof planningFormSchema>;

const CustomLegend = (props: any) => {
  const { isDayView, metric, visibleLossTypes } = props;

  const activeOptions = lossOptions.filter(opt => visibleLossTypes.includes(opt.value));

  return (
    <div className="flex flex-col gap-4 mt-6">
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 items-center border-t pt-4">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mr-2">Categorias:</span>
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
        <div className="h-[500px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={isDayView ? 12 : 6} margin={{ top: 30, right: 30, left: 10, bottom: 80 }}>
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
              <Legend content={<CustomLegend isDayView={isDayView} metric={metric} visibleLossTypes={visibleLossTypes} />} verticalAlign="bottom" />
              
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

  const toggleLossType = (type: string) => {
    setVisibleLossTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const { chartData, isDayView: calculatedIsDayView } = useMemo(() => {
    const isDayView = !!selectedDateFilter;

    const processItemToActivities = (item: PlanejamentoItem) => {
      const results: { plan: number, real: number, type: string }[] = [];
      const qtd = Number(item.quantidade !== undefined ? item.quantidade : item.Quantidade) || 0;
      const qtdReal = Number(item.quantidadeRealizada !== undefined ? item.quantidadeRealizada : item['Quantidade Realizada']) || 0;
      const ops = Number(item.operacoesPorPeca !== undefined ? item.operacoesPorPeca : (item['Operações por Peça'] || 1));
      const scale = qtd > 0 ? (qtdReal / qtd) : (qtdReal > 0 ? 1 : 0);

      if (item.atividades && Array.isArray(item.atividades)) {
        item.atividades.forEach(ativ => {
          const type = ativ.tipo.toUpperCase().includes('SETUP') ? 'SETUP' :
                       ativ.tipo.toUpperCase().includes('DDS') || ativ.tipo.toUpperCase().includes('ADM') ? 'DDS' :
                       ativ.tipo.toUpperCase().includes('CAFÉ') || ativ.tipo.toUpperCase().includes('CAFE') ? 'CAFE' :
                       ativ.tipo.toUpperCase().includes('LIMPEZA') ? 'LIMPEZA' :
                       ativ.tipo.toUpperCase().includes('QUALIDADE') || ativ.tipo.toUpperCase().includes('INSPEÇÃO') ? 'QUALIDADE' : 'PRODUCAO';

          if (!visibleLossTypes.includes(type)) return;

          let planVal = 0, realVal = 0;
          if (viewMetric === 'pieces') {
            planVal = type === 'PRODUCAO' ? qtd : 0;
            realVal = type === 'PRODUCAO' ? qtdReal : 0;
          } else if (viewMetric === 'operations') {
            planVal = type === 'PRODUCAO' ? qtd * ops : 0;
            realVal = type === 'PRODUCAO' ? qtdReal * ops : 0;
          } else { // hours
            planVal = Number(ativ.tempo) || 0;
            realVal = planVal * Math.min(1, scale);
          }
          results.push({ plan: planVal, real: realVal, type });
        });
      } else {
        // Fallback for legacy data
        const typeRaw = (item.perdaPlanejada || item['Perdas planejadas'] || 'PRODUCAO').toUpperCase();
        let type = 'PRODUCAO';
        if (typeRaw.includes('SETUP')) type = 'SETUP';
        else if (typeRaw.includes('DDS') || typeRaw.includes('ADM')) type = 'DDS';
        else if (typeRaw.includes('CAFÉ') || typeRaw.includes('CAFE')) type = 'CAFE';
        else if (typeRaw.includes('LIMPEZA')) type = 'LIMPEZA';
        else if (typeRaw.includes('QUALIDADE')) type = 'QUALIDADE';

        if (visibleLossTypes.includes(type)) {
          let planVal = 0, realVal = 0;
          const machineHours = typeof (item.horasPlanejadas || item['Horas Máquina']) === 'string' 
            ? parseFloat(String(item.horasPlanejadas || item['Horas Máquina']).replace(',', '.')) 
            : (Number(item.horasPlanejadas || item['Horas Máquina']) || 0);

          if (viewMetric === 'pieces') {
            planVal = type === 'PRODUCAO' ? qtd : 0;
            realVal = type === 'PRODUCAO' ? qtdReal : 0;
          } else if (viewMetric === 'operations') {
            planVal = type === 'PRODUCAO' ? qtd * ops : 0;
            realVal = type === 'PRODUCAO' ? qtdReal * ops : 0;
          } else {
            planVal = machineHours;
            realVal = planVal * Math.min(1, scale);
          }
          results.push({ plan: planVal, real: realVal, type });
        }
      }
      return results;
    };

    if (isDayView) {
      const centurTurns = [
        { label: '1º Turno', total_plan: 0, total_real: 0, ...lossOptions.reduce((acc, opt) => ({ ...acc, [`plan_${opt.value}`]: 0, [`real_${opt.value}`]: 0 }), {}) },
        { label: '2º Turno', total_plan: 0, total_real: 0, ...lossOptions.reduce((acc, opt) => ({ ...acc, [`plan_${opt.value}`]: 0, [`real_${opt.value}`]: 0 }), {}) },
        { label: '3º Turno', total_plan: 0, total_real: 0, ...lossOptions.reduce((acc, opt) => ({ ...acc, [`plan_${opt.value}`]: 0, [`real_${opt.value}`]: 0 }), {}) }
      ];
      const centroTurns = [
        { label: '1º Turno', total_plan: 0, total_real: 0, ...lossOptions.reduce((acc, opt) => ({ ...acc, [`plan_${opt.value}`]: 0, [`real_${opt.value}`]: 0 }), {}) },
        { label: '2º Turno', total_plan: 0, total_real: 0, ...lossOptions.reduce((acc, opt) => ({ ...acc, [`plan_${opt.value}`]: 0, [`real_${opt.value}`]: 0 }), {}) },
        { label: '3º Turno', total_plan: 0, total_real: 0, ...lossOptions.reduce((acc, opt) => ({ ...acc, [`plan_${opt.value}`]: 0, [`real_${opt.value}`]: 0 }), {}) }
      ];

      planejamentoData.forEach(item => {
        const dateStr = item.dataExecucao || item['Data Execução'];
        if (!dateStr) return;
        let date;
        try { date = parse(dateStr, 'dd/MM/yyyy', new Date()); } catch { date = new Date(dateStr); }
        if (isNaN(date.getTime()) || !isSameDay(date, selectedDateFilter!)) return;

        const activities = processItemToActivities(item);
        const equip = String(item.equipamento || item.EQUIPAMENTO || '').toUpperCase();
        const turnoIndex = (parseInt(String(item.Turno || '1')) || 1) - 1;
        const targetArr = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurTurns : 
                           (equip.includes('CENTRO') || equip.includes('D600')) ? centroTurns : null;

        if (targetArr && turnoIndex >= 0 && turnoIndex < 3) {
          activities.forEach(ativ => {
            targetArr[turnoIndex][`plan_${ativ.type}`] += ativ.plan;
            targetArr[turnoIndex][`real_${ativ.type}`] += ativ.real;
            targetArr[turnoIndex].total_plan += ativ.plan;
            targetArr[turnoIndex].total_real += ativ.real;
          });
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
      if (selectedWeekFilter !== 'all' && getISOWeek(date) !== parseInt(selectedWeekFilter)) return;
      
      let key = selectedWeekFilter !== 'all' ? format(date, 'yyyy-MM-dd') : format(date, 'yyyy-MM');
      let label = selectedWeekFilter !== 'all' ? format(date, 'dd/MM', { locale: ptBR }) : format(date, 'MMM yy', { locale: ptBR });

      const activities = processItemToActivities(item);
      const equip = String(item.equipamento || item.EQUIPAMENTO || '').toUpperCase();
      const targetMap = (equip.includes('CENTUR') || equip.includes('TORNO')) ? centurMap : 
                         (equip.includes('CENTRO') || equip.includes('D600')) ? centroMap : null;

      if (targetMap) {
        if (!targetMap[key]) {
          targetMap[key] = { key, label, total_plan: 0, total_real: 0, ...lossOptions.reduce((acc, opt) => ({ ...acc, [`plan_${opt.value}`]: 0, [`real_${opt.value}`]: 0 }), {}) };
        }
        activities.forEach(ativ => {
          targetMap[key][`plan_${ativ.type}`] += ativ.plan;
          targetMap[key][`real_${ativ.type}`] += ativ.real;
          targetMap[key].total_plan += ativ.plan;
          targetMap[key].total_real += ativ.real;
        });
      }
    });

    const sortFn = (a: any, b: any) => a.key.localeCompare(b.key);
    return { chartData: { centur: Object.values(centurMap).sort(sortFn), centro: Object.values(centroMap).sort(sortFn) }, isDayView: false };
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
      atividades: [{ tipo: 'PRODUCAO', tempo: 0 }],
    });
    setIsDialogOpen(true);
  };

  const handleItemClick = (item: PlanejamentoItem) => {
    setEditingId(item.id);
    setSelectedTurno(String(item.Turno || '1'));
    
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
        operacoesPorPeca: values.operacoesPorPeca,
        tecnico: values.tecnico,
        horasPlanejadas: values.horasPlanejadas,
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
              onClick={(e) => { e.stopPropagation(); handleItemClick(item); }}
              className={cn(
                "mb-1 cursor-pointer truncate rounded border p-1 text-[10px] leading-tight shadow-sm transition-all flex items-center gap-1",
                isCompleted ? "border-green-500/50 bg-green-500/5" : "border-border bg-card hover:border-primary"
              )}
            >
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
                        const itemsInTurno = dayItems.filter(item => { if (!item.Turno) return turno.id === '1'; return String(item.Turno) === turno.id; });
                        return (
                          <div key={turno.id} className="group/turno relative">
                            <div onClick={() => handleShiftClick(day, turno.id)} className={cn("text-[8px] px-1 py-0.5 rounded border font-bold uppercase cursor-pointer hover:opacity-80 flex items-center justify-between", turno.color)}>
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
              <TabsTrigger value="pieces" className="text-[10px] font-bold">PEÇAS</TabsTrigger>
              <TabsTrigger value="operations" className="text-[10px] font-bold">OPS</TabsTrigger>
              <TabsTrigger value="hours" className="text-[10px] font-bold flex items-center gap-1"><Clock className="h-3 w-3" /> HORAS</TabsTrigger>
            </TabsList>
          </Tabs>
          <Popover>
            <PopoverTrigger asChild><Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-2"><Filter className="h-3 w-3" />({visibleLossTypes.length})</Button></PopoverTrigger>
            <PopoverContent className="w-56 p-3">
                {lossOptions.map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2 py-1">
                    <Checkbox id={`f-${opt.value}`} checked={visibleLossTypes.includes(opt.value)} onCheckedChange={() => toggleLossType(opt.value)} />
                    <label htmlFor={`f-${opt.value}`} className="text-[10px] font-bold uppercase cursor-pointer flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />{opt.label}
                    </label>
                  </div>
                ))}
            </PopoverContent>
          </Popover>
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
        <PlanningChart data={chartData.centur} title="Torno Centur 30" isDayView={calculatedIsDayView} metric={viewMetric} visibleLossTypes={visibleLossTypes} />
        <PlanningChart data={chartData.centro} title="Centro D600" isDayView={calculatedIsDayView} metric={viewMetric} visibleLossTypes={visibleLossTypes} />
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
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ tipo: 'PRODUCAO', tempo: 0 })} className="h-7 text-[10px] font-bold"><PlusCircle className="h-3 w-3 mr-1" /> ADICIONAR PERDA</Button>
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
              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="quantidade" render={({ field }) => (<FormItem><FormLabel>Qtd. Plan.</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="quantidadeRealizada" render={({ field }) => (<FormItem><FormLabel>Qtd. Real.</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
                <FormField control={form.control} name="operacoesPorPeca" render={({ field }) => (<FormItem><FormLabel>Ops/Peça</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>)} />
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
