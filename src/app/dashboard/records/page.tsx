'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Hourglass,
  Loader,
  Package,
  TriangleAlert,
  PlusCircle,
  CalendarIcon,
  User,
  Filter,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { collection, query, where, limit } from 'firebase/firestore';
import { getYear, getMonth, format, startOfDay, endOfDay, getISOWeek, endOfMonth, startOfISOWeek, endOfISOWeek, setISOWeek } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// Importações diretas para garantir estabilidade e evitar ChunkLoadError
import { MachiningTimeTrendChart } from '@/components/charts/machining-time-trend-chart';
import { OperatorPerformanceChart } from '@/components/charts/operator-performance-chart';
import { PlannedVsMachinedChart } from '@/components/charts/planned-vs-machined-chart';
import { MonthlyOeeEvolutionChart } from '@/components/charts/monthly-oee-evolution-chart';
import { OeeLossWaterfallChart } from '@/components/charts/oee-loss-waterfall-chart';
import { DailyPdlMplLossChart } from '@/components/charts/daily-pdl-mpl-loss-chart';
import { AvailableVsActualChart } from '@/components/charts/available-vs-actual-chart';

const months = [
    { value: '0', label: 'Janeiro' },
    { value: '1', label: 'Fevereiro' },
    { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Maio' },
    { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' },
    { value: '10', label: 'Novembro' },
    { value: '11', label: 'Dezembro' },
];

const lossCategories = [
  { value: 'PRODUCAO', label: 'Produção' },
  { value: 'PROGRAMACAO', label: 'Programação' },
  { value: 'MANUTENÇÃO PLANEJADA', label: 'Manutenção Planejada' },
  { value: 'TEMPO DE CAFÉ', label: 'Tempo de Café' },
  { value: 'LIMPEZA PLANEJADA', label: 'Limpeza Planejada' },
  { value: 'SETUP', label: 'Setup' },
  { value: 'DDS, APONTAMENTO HORAS, ATIVIDADE ADM', label: 'Atividades ADM' },
  { value: 'INSPEÇÃO & VALIDAÇÃO DAS PEÇAS', label: 'Qualidade / Inspeção' },
  { value: 'QUEBRA', label: 'Quebra' },
  { value: 'FALHA DE PROCESSO', label: 'Falha de Processo' },
  { value: 'ABSENTEÍSMO', label: 'Absenteísmo' },
  { value: 'FALTA DE MATERIAL & FERRAMENTA', label: 'Falta Material/Ferr.' },
  { value: 'MOVIMENTAÇÃO DE PEÇAS E EQUIPAMENTOS', label: 'Movimentação' },
  { value: 'PEQUENAS PARADAS', label: 'Pequenas Paradas' },
  { value: 'AJUSTES CORRETIVOS DE PROCESSOS', label: 'Ajustes Corretivos' },
  { value: 'VELOCIDADE REDUZIDA (PROBLEMA DE MÁQUINA)', label: 'Velocidade Reduzida' },
  { value: 'RETRABALHO', label: 'Retrabalho' },
  { value: 'SERVIÇOS DE BANCADA/SERRA', label: 'Serviços de Bancada/Serra' },
  { value: 'AUXÍLIO EM MAQUINA', label: 'Auxílio em Máquina' },
  { value: 'AUXÍLIO AS FÁBRICAS', label: 'Auxílio as Fábricas' },
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

const availableHoursJune: Record<string, number> = {
  'AGUAÍ': 285,
  'INDAIATUBA': 68,
  'IGARASSU': 107,
  'GARANHUNS': 94,
  'SUAPE': 113,
  'VINHEDO': 112,
  'VALINHOS (DOVE/SABONETE)': 166,
  'POUSO ALEGRE': 124,
};

const normalizeOperatorName = (name: any) => {
  if (!name) return '';
  const n = String(name).toLowerCase().trim();
  if (n.includes('alisson')) return 'Alisson Franca';
  if (n.includes('gustavo')) return 'Gustavo Gozzi';
  if (n.includes('daniel')) return 'Daniel Solivo';
  if (n.includes('rodrigo')) return 'Rodrigo Cantano';
  if (n.includes('william')) return 'William Martinucci';
  if (n.includes('nathan')) return 'Nathan Xavier';
  if (n.includes('jair')) return 'Jair Melo';
  if (n.includes('marcos')) return 'Marcos Barbosa';
  return String(name).trim();
};

const normalizeFactoryName = (name: any): string => {
  if (!name) return 'N/A';
  const n = String(name).toUpperCase().trim();
  if (n.includes('VINHEDO')) return 'VINHEDO';
  if (n.includes('AGUAI') || n.includes('AGUAÍ')) return 'AGUAÍ';
  if (n.includes('GARANHUNS') || n.includes('GARANHUS')) return 'GARANHUNS';
  if (n.includes('VALINHOS DOVE') || n.includes('VALINHOS SABONETE') || n.includes('VALINHOS (DOVE/SABONETE)')) return 'VALINHOS (DOVE/SABONETE)';
  if (n.includes('POUSO ALEGRE')) return 'POUSO ALEGRE';
  if (n.includes('INDAIATUBA')) return 'INDAIATUBA';
  if (n.includes('SUAPE')) return 'SUAPE';
  if (n.includes('IGARASSU')) return 'IGARASSU';
  if (n.includes('TORRE')) return 'TORRE';
  return n;
};

const getCategoryKey = (reason: string): string => {
  const r = String(reason || '').toUpperCase().trim();
  if (r === '' || r === 'USINAGEM' || r === 'PRODUCAO' || r === 'PRODUÇÃO') return 'PRODUCAO';
  if (r.includes('PROGRAMACAO') || r.includes('PROGRAMAÇÃO')) return 'PROGRAMACAO';
  if (r.includes('SETUP')) return 'SETUP';
  if (r.includes('CAFÉ') || r.includes('CAFE')) return 'TEMPO DE CAFÉ';
  if (r.includes('LIMPEZA')) return 'LIMPEZA PLANEJADA';
  if (r.includes('DDS') || r.includes('ADM') || r.includes('APONTAMENTO')) return 'DDS, APONTAMENTO HORAS, ATIVIDADE ADM';
  if (r.includes('INSPEÇÃO') || r.includes('INSPECAO') || r.includes('QUALIDADE') || r.includes('VALIDAÇÃO')) return 'INSPEÇÃO & VALIDAÇÃO DAS PEÇAS';
  if (r.includes('MANUTENÇÃO') || r.includes('MANUTENCAO')) return 'MANUTENÇÃO PLANEJADA';
  return r;
};

export default function RecordsPage() {
  const firestore = useFirestore();
  const database = useDatabase();
  const [isClient, setIsClient] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [selectedLossReason, setSelectedLossReason] = useState<string>('all');

  const [planejamentoData, setPlanejamentoData] = useState<any[]>([]);
  const [loadingPlanejamento, setLoadingPlanejamento] = useState(true);

  useEffect(() => {
    setIsClient(true);
    setSelectedYear(String(new Date().getFullYear()));
  }, []);

  useEffect(() => {
    if (!database) {
      setLoadingPlanejamento(false);
      return;
    }

    const dbRef = ref(database, '/Planejamento S');
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const dataArray = Object.keys(data).map(
            (key) => ({
              id: key,
              ...data[key],
            })
          );
          setPlanejamentoData(dataArray);
        } else {
          setPlanejamentoData([]);
        }
        setLoadingPlanejamento(false);
      },
      (dbError) => {
        console.error('Error fetching Realtime DB data:', dbError);
        setLoadingPlanejamento(false);
      }
    );

    return () => unsubscribe();
  }, [database]);

  const { startDate, endDate } = useMemo(() => {
    if (!selectedYear || !isClient) return { startDate: undefined, endDate: undefined };
    
    let start, end;
    if (selectedDate) {
      start = startOfDay(selectedDate);
      end = endOfDay(selectedDate);
    } else if (selectedYear && selectedYear !== 'all') {
      const year = parseInt(selectedYear, 10);
      if (selectedWeek && selectedWeek !== 'all') {
        const week = parseInt(selectedWeek, 10);
        const midYearDate = new Date(year, 6, 1); 
        const dateInWeek = setISOWeek(midYearDate, week);
        start = startOfISOWeek(dateInWeek);
        end = endOfISOWeek(dateInWeek);
      } else if (selectedMonth && selectedMonth !== 'all') {
        const month = parseInt(selectedMonth, 10);
        start = new Date(year, month, 1);
        end = endOfMonth(start);
      } else {
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31, 23, 59, 59);
      }
    }
    return { startDate: start, endDate: end };
  }, [selectedDate, selectedYear, selectedMonth, selectedWeek, isClient]);

  const productionRecordsQuery = useMemoFirebase(() => {
    if (!firestore || !startDate || !endDate) return null;
    const constraints = [
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      limit(500)
    ];
    return query(collection(firestore, 'productionRecords'), ...constraints);
  }, [firestore, startDate, endDate]);

  const { data: productionRecords, isLoading: loadingProduction } = useCollection(productionRecordsQuery);

  const lossRecordsQuery = useMemoFirebase(() => {
    if (!firestore || !startDate || !endDate) return null;
    const constraints = [
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      limit(500)
    ];
    return query(collection(firestore, 'lossRecords'), ...constraints);
  }, [firestore, startDate, endDate]);

  const { data: lossRecords, isLoading: loadingLoss } = useCollection(lossRecordsQuery);
    
  const { availableYears, availableWeeks } = useMemo(() => {
      const allRecords = [...(productionRecords || []), ...(lossRecords || [])];
      const recordYears = new Set<number>();
      allRecords.forEach((record) => {
          if (record.date?.toDate) {
              const year = getYear(record.date.toDate());
              if (year > 2000 && year < 3000) recordYears.add(year);
          }
      });
      const sortedYears = Array.from(recordYears).sort((a, b) => b - a);
      let weeks: number[] = [];
      if (selectedYear && selectedYear !== 'all') weeks = Array.from({ length: 53 }, (_, i) => i + 1);
      return { availableYears: sortedYears, availableWeeks: weeks };
  }, [productionRecords, lossRecords, selectedYear]);

  const operatorFilter = (record: any) => {
    if (!selectedOperator || selectedOperator === 'all') return true;
    const rawOp = record.operatorId || record.tecnico || record['Técnicos'] || record['Técnico'];
    if (!rawOp) return false;
    
    const normalizedOp = normalizeOperatorName(rawOp);
    return normalizedOp === selectedOperator || normalizedOp.includes(selectedOperator);
  };

  const lossCategoryFilter = (record: any, isPlanning: boolean) => {
    if (selectedLossReason === 'all') return true;
    
    if (isPlanning && record.atividades && Array.isArray(record.atividades)) {
        return record.atividades.some((a: any) => getCategoryKey(a.tipo) === selectedLossReason);
    }

    const rawReason = (isPlanning ? (record['Perdas planejadas'] || record.perdaPlanejada || '') : (record.lossReason || '')).toUpperCase();
    const category = getCategoryKey(rawReason);

    return category === selectedLossReason;
  };
  
  const handleOperatorToggle = (op: string | null) => {
    if (selectedOperator === op) {
      setSelectedOperator('all');
    } else {
      setSelectedOperator(op);
    }
  };

  const basePlanejamentoData = useMemo(() => {
      return planejamentoData.filter(record => {
          const dateStr = record.dataExecucao || record['Data Execução'] || record['Data'];
          if (!dateStr) return false;
          let recordDate;
          try {
              recordDate = parse(dateStr, 'dd/MM/yyyy', new Date());
              if (isNaN(recordDate.getTime())) recordDate = new Date(dateStr);
              if (isNaN(recordDate.getTime())) return false;
          } catch { return false; }
          
          const dateMatches = selectedDate ? (recordDate >= startOfDay(selectedDate) && recordDate <= endOfDay(selectedDate)) : true;
          if (!dateMatches) return false;

          const yearMatches = (selectedYear && selectedYear !== 'all') ? getYear(recordDate) === parseInt(selectedYear) : true;
          if (!yearMatches) return false;

          if (selectedYear && selectedYear !== 'all') {
              if (selectedWeek !== 'all' && getISOWeek(recordDate) !== parseInt(selectedWeek)) return false;
              if (selectedMonth !== 'all' && getMonth(recordDate) !== parseInt(selectedMonth)) return false;
          }
          
          return lossCategoryFilter(record, true);
      });
  }, [planejamentoData, selectedDate, selectedYear, selectedMonth, selectedWeek, selectedLossReason]);

  const baseProductionRecords = useMemo(() => {
    if (!productionRecords) return [];
    if (selectedLossReason !== 'all' && selectedLossReason !== 'PRODUCAO' && selectedLossReason !== 'PROGRAMACAO') return [];
    return productionRecords;
  }, [productionRecords, selectedLossReason]);

  const baseLossRecords = useMemo(() => {
    if (!lossRecords) return [];
    return lossRecords.filter(record => lossCategoryFilter(record, false));
  }, [lossRecords, selectedLossReason]);

  const operatorFilteredProductionRecords = useMemo(() => {
    return baseProductionRecords.filter(operatorFilter);
  }, [baseProductionRecords, selectedOperator]);

  const operatorFilteredLossRecords = useMemo(() => {
    return baseLossRecords.filter(operatorFilter);
  }, [baseLossRecords, selectedOperator]);

  const filteredPlanejamentoData = useMemo(() => {
    return basePlanejamentoData.filter(operatorFilter);
  }, [basePlanejamentoData, selectedOperator]);

  const plannedVsMachinedData = useMemo(() => {
    const dataMap: { [factory: string]: any } = {};

    const getOrCreate = (factory: string) => {
      if (!dataMap[factory]) {
        dataMap[factory] = { 
          totalPlanejado: 0,
          totalRealizado: 0,
        };
      }
      return dataMap[factory];
    };

    filteredPlanejamentoData.forEach(record => {
      if (record.atividades && Array.isArray(record.atividades)) {
        record.atividades.forEach((ativ: any) => {
          const factory = normalizeFactoryName(ativ.site || record.site || record['Site']);
          const catKey = getCategoryKey(ativ.tipo);
          
          if (selectedLossReason === 'all' || catKey === selectedLossReason) {
            const d = getOrCreate(factory);
            const time = Number(ativ.tempo) || 0;
            const key = `plan_${catKey}`;
            d[key] = (d[key] || 0) + time;
            d.totalPlanejado += time;
          }
        });
      } else {
        const factory = normalizeFactoryName(record.site || record['Site']);
        const rawHours = record.horasPlanejadas || record['Horas Máquina'];
        const machineHours = typeof rawHours === 'string' 
          ? parseFloat(rawHours.replace(',', '.')) 
          : (Number(rawHours) || 0);
        
        if (!isNaN(machineHours)) {
          const rawReason = String(record.perdaPlanejada || record['Perdas planejadas'] || '').toUpperCase().trim();
          const catKey = getCategoryKey(rawReason);
          if (selectedLossReason === 'all' || catKey === selectedLossReason) {
            const d = getOrCreate(factory);
            const key = `plan_${catKey}`;
            d[key] = (d[key] || 0) + machineHours;
            d.totalPlanejado += machineHours;
          }
        }
      }
    });
    
    operatorFilteredProductionRecords.forEach(record => {
        const factory = normalizeFactoryName(record.factory);
        const hours = (Number(record.machiningTime) || 0) / 60;
        if (hours > 0) {
            const d = getOrCreate(factory);
            const rawActivity = String(record.activityType || 'PRODUCAO').toUpperCase().trim();
            const catKey = getCategoryKey(rawActivity);
            
            const key = `real_${catKey}`;
            d[key] = (d[key] || 0) + hours;
            d.totalRealizado += hours;
        }
    });

    operatorFilteredLossRecords.forEach(record => {
        const factory = normalizeFactoryName(record.factory);
        const hours = (Number(record.timeLost) || 0) / 60;
        if (hours > 0) {
            const d = getOrCreate(factory);
            const reason = record.lossReason?.toUpperCase() || '';
            const catKey = getCategoryKey(reason);
            const key = `real_${catKey}`;
            d[key] = (d[key] || 0) + hours;
            d.totalRealizado += hours;
        }
    });

    return Object.keys(dataMap).map(factory => {
      const isJune = selectedMonth === '5' || selectedMonth === 'all';
      return {
          name: factory,
          ...dataMap[factory],
          totalDisponivel: isJune ? (availableHoursJune[factory] || 0) : 0
      }
  }).sort((a, b) => b.totalPlanejado - a.totalPlanejado);

  }, [filteredPlanejamentoData, operatorFilteredProductionRecords, operatorFilteredLossRecords, selectedLossReason, selectedMonth]);

  useEffect(() => {
    setSelectedMonth('all');
    setSelectedWeek('all');
    setSelectedDate(undefined);
  }, [selectedYear]);

  const isLoading = loadingProduction || loadingLoss || !isClient;

  if (!isClient) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Supervisor</h1>
          <p className="text-muted-foreground">Análise de produtividade, OEE e eficiência por técnico/fábrica.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/production-registry">
            <PlusCircle className="mr-2 h-4 w-4" />
            Novo Registro
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Totais Utilizadas</CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader className="animate-spin" /> : <div className="text-2xl font-bold">{((operatorFilteredProductionRecords.reduce((s,r) => s + (Number(r.machiningTime)||0), 0) + operatorFilteredLossRecords.reduce((s,r) => s + (Number(r.timeLost)||0), 0))/60).toFixed(1)}h</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros de Produção</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader className="animate-spin" /> : <div className="text-2xl font-bold">{operatorFilteredProductionRecords.length}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros de Perda</CardTitle>
            <TriangleAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader className="animate-spin" /> : <div className="text-2xl font-bold">{operatorFilteredLossRecords.length}</div>}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-start gap-2 bg-card p-3 rounded-lg border shadow-sm">
          <div className="grid w-full sm:max-w-[100px] gap-1.5">
              <Label htmlFor="year-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ano</Label>
              <Select value={selectedYear || 'all'} onValueChange={setSelectedYear}>
                  <SelectTrigger id="year-filter" className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[110px] gap-1.5">
              <Label htmlFor="month-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedYear || selectedYear === 'all' || !!selectedDate || selectedWeek !== 'all'}>
                  <SelectTrigger id="month-filter" className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[120px] gap-1.5">
              <Label htmlFor="week-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Semana</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek} disabled={!selectedYear || selectedYear === 'all' || !!selectedDate || selectedMonth !== 'all'}>
                  <SelectTrigger id="week-filter" className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableWeeks.map(week => <SelectItem key={week} value={String(week)}>Semana {week}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[140px] gap-1.5">
              <Label htmlFor="date-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dia</Label>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("h-8 text-xs font-bold justify-start text-left", !selectedDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Selecionar</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus /></PopoverContent>
              </Popover>
          </div>
          <div className="grid w-full sm:max-w-[160px] gap-1.5">
              <Label htmlFor="operator-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Técnico</Label>
              <Select value={selectedOperator || 'all'} onValueChange={setSelectedOperator}>
                  <SelectTrigger id="operator-filter" className="h-8 text-xs font-bold">
                    <div className="flex items-center gap-2 truncate">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[160px] gap-1.5">
              <Label htmlFor="loss-filter" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Motivo / Categoria</Label>
              <Select value={selectedLossReason} onValueChange={setSelectedLossReason}>
                  <SelectTrigger id="loss-filter" className="h-8 text-xs font-bold">
                    <div className="flex items-center gap-2 truncate">
                      <Filter className="h-3 w-3 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      {lossCategories.map(cat => <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="flex items-end pb-0.5">
               <Button variant="ghost" size="sm" onClick={() => {
                  setSelectedYear(String(new Date().getFullYear()));
                  setSelectedMonth('all');
                  setSelectedWeek('all');
                  setSelectedDate(undefined);
                  setSelectedOperator('all');
                  setSelectedLossReason('all');
               }} className="h-8 text-[10px] font-black uppercase tracking-widest text-destructive">Limpar</Button>
          </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planejado vs Realizado por Técnico</CardTitle>
          <CardDescription>Comparativo de horas planejadas (Plan) e realizadas (Real) por operador.</CardDescription>
        </CardHeader>
        <CardContent>
          <OperatorPerformanceChart 
            productionData={baseProductionRecords}
            lossData={baseLossRecords}
            plannedData={basePlanejamentoData}
            loading={isLoading}
            selectedOperator={selectedOperator}
            onOperatorSelect={handleOperatorToggle}
          />
        </CardContent>
      </Card>

      <PlannedVsMachinedChart data={plannedVsMachinedData} loading={isLoading || loadingPlanejamento} />
      <AvailableVsActualChart data={plannedVsMachinedData} loading={isLoading || loadingPlanejamento} />
      
      <OeeLossWaterfallChart productionData={operatorFilteredProductionRecords} lossData={operatorFilteredLossRecords} loading={isLoading} />
      <DailyPdlMplLossChart lossData={operatorFilteredLossRecords} loading={isLoading} />
      <MonthlyOeeEvolutionChart loading={isLoading} />
      
      <Card>
        <CardHeader>
          <CardTitle>Análise de Tempo de Usinagem</CardTitle>
          <CardDescription>Tempo de usinagem real segmentado por fábrica.</CardDescription>
        </CardHeader>
        <CardContent>
          <MachiningTimeTrendChart 
            data={operatorFilteredProductionRecords} 
            setupData={operatorFilteredLossRecords.filter(r => r.lossReason?.toUpperCase().includes('SETUP'))}
            ddsData={operatorFilteredLossRecords.filter(r => r.lossReason?.toUpperCase().includes('DDS'))}
            loading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
