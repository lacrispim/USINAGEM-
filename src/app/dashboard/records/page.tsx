
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
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { collection, query, where } from 'firebase/firestore';
import { MachiningTimeTrendChart } from '@/components/charts/machining-time-trend-chart';
import { getYear, getMonth, format, startOfDay, endOfDay, getISOWeek, parse, endOfMonth, startOfISOWeek, endOfISOWeek, setISOWeek } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { OperatorPerformanceChart } from '@/components/charts/operator-performance-chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/ui/confetti';
import { PlannedVsMachinedChart } from '@/components/charts/planned-vs-machined-chart';
import { MonthlyOeeEvolutionChart } from '@/components/charts/monthly-oee-evolution-chart';
import { OeeLossWaterfallChart } from '@/components/charts/oee-loss-waterfall-chart';
import { StatusByFormChart } from '@/components/charts/status-by-form-chart';
import { DailyPdlMplLossChart } from '@/components/charts/daily-pdl-mpl-loss-chart';

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

const operatorList = [
    "Daniel Solivo",
    "Rodrigo Cantano",
    "Gustavo Gozzi",
    "William Martinucci",
    "Nathan Xavier"
];

const normalizeOperatorName = (name: any) => {
  if (!name) return '';
  const n = String(name).toLowerCase().trim();
  if (n.includes('gustavo')) return 'Gustavo Gozzi';
  if (n.includes('daniel')) return 'Daniel Solivo';
  if (n.includes('rodrigo')) return 'Rodrigo Cantano';
  if (n.includes('william')) return 'William Martinucci';
  if (n.includes('nathan')) return 'Nathan Xavier';
  return String(name).trim();
};

const normalizeFactoryName = (name: any): string => {
  if (!name) return 'N/A';
  const n = String(name).toUpperCase().trim();
  if (n.includes('VINHEDO')) return 'VINHEDO';
  if (n.includes('AGUAI') || n.includes('AGUAÍ')) return 'AGUAÍ';
  if (n.includes('GARANHUNS') || n.includes('GARANHUS')) return 'GARANHUNS';
  if (n.includes('VALINHOS DOVE')) return 'VALINHOS DOVE';
  if (n.includes('VALINHOS SABONETE')) return 'VALINHOS SABONETE';
  if (n.includes('POUSO ALEGRE')) return 'POUSO ALEGRE';
  if (n.includes('INDAIATUBA')) return 'INDAIATUBA';
  if (n.includes('SUAPE')) return 'SUAPE';
  if (n.includes('IGARASSU')) return 'IGARASSU';
  if (n.includes('TORRE')) return 'TORRE';
  return n;
};

export default function RecordsPage() {
  const firestore = useFirestore();
  const database = useDatabase();
  const [showConfetti, setShowConfetti] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);

  const [planejamentoData, setPlanejamentoData] = useState<any[]>([]);
  const [loadingPlanejamento, setLoadingPlanejamento] = useState(true);

  useEffect(() => {
    setIsClient(true);
    setSelectedYear(String(new Date().getFullYear()));
    setShowConfetti(true);
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
      where('date', '<=', endDate)
    ];
    if (selectedFactory) constraints.push(where('factory', '==', selectedFactory));
    return query(collection(firestore, 'productionRecords'), ...constraints);
  }, [firestore, startDate, endDate, selectedFactory]);

  const { data: productionRecords, isLoading: loadingProduction } = useCollection(productionRecordsQuery);

  const lossRecordsQuery = useMemoFirebase(() => {
    if (!firestore || !startDate || !endDate) return null;
    const constraints = [
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    ];
    if (selectedFactory) constraints.push(where('factory', '==', selectedFactory));
    return query(collection(firestore, 'lossRecords'), ...constraints);
  }, [firestore, startDate, endDate, selectedFactory]);

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
    const rawOp = record.operatorId || record['Técnicos'] || record['Técnico'];
    if (!rawOp) return false;
    
    const normalizedOp = normalizeOperatorName(rawOp);
    return normalizedOp === selectedOperator || normalizedOp.includes(selectedOperator);
  };
  
  const handleOperatorToggle = (op: string | null) => {
    if (selectedOperator === op) {
      setSelectedOperator('all');
    } else {
      setSelectedOperator(op);
    }
  };

  const filteredPlanejamentoData = useMemo(() => {
      const dateFilter = (recordDate: Date) => {
        if (selectedDate) return recordDate >= startOfDay(selectedDate) && recordDate <= endOfDay(selectedDate);
        if (!selectedYear) return true;
        const yearMatch = selectedYear === 'all' || getYear(recordDate) === parseInt(selectedYear, 10);
        if (!yearMatch) return false;
        if (selectedYear !== 'all') {
            if (selectedWeek !== 'all') return getISOWeek(recordDate) === parseInt(selectedWeek, 10);
            if (selectedMonth !== 'all') return getMonth(recordDate) === parseInt(selectedMonth, 10);
        }
        return true;
      };

      return planejamentoData.filter(record => {
          const dateStr = record['Data Execução'] || record['Data'];
          if (!dateStr) return false;
          let recordDate;
          try {
              recordDate = parse(dateStr, 'dd/MM/yyyy', new Date());
              if (isNaN(recordDate.getTime())) recordDate = new Date(dateStr);
              if (isNaN(recordDate.getTime())) return false;
          } catch { return false; }
          if (!dateFilter(recordDate)) return false;
          const normalizedSite = normalizeFactoryName(record['Site']);
          const factoryMatch = !selectedFactory || normalizedSite === selectedFactory;
          if (!factoryMatch) return false;
          return operatorFilter(record);
      });
  }, [planejamentoData, selectedDate, selectedYear, selectedMonth, selectedWeek, selectedFactory, selectedOperator]);

  const operatorFilteredProductionRecords = useMemo(() => {
    if (!productionRecords) return [];
    return productionRecords.filter(operatorFilter);
  }, [productionRecords, selectedOperator]);

  const operatorFilteredLossRecords = useMemo(() => {
    if (!lossRecords) return [];
    return lossRecords.filter(operatorFilter);
  }, [lossRecords, selectedOperator]);

  const plannedVsMachinedData = useMemo(() => {
    const dataMap: { [factory: string]: any } = {};

    const getOrCreate = (factory: string) => {
      if (!dataMap[factory]) {
        dataMap[factory] = { 
          usinagemPlanejada: 0, 
          paradaCafePlanejada: 0,
          limpezaPlanejada: 0,
          apontamentoPlanejado: 0,
          inspecaoPlanejada: 0,
          setupPlanejado: 0,
          usinagem: 0, 
          setup: 0, 
          dds: 0, 
          outrasPerdas: 0 
        };
      }
      return dataMap[factory];
    };

    filteredPlanejamentoData.forEach(record => {
      const factory = normalizeFactoryName(record['Site']);
      const machineHours = typeof record['Horas Máquina'] === 'string' 
        ? parseFloat(record['Horas Máquina'].replace(',', '.')) 
        : (Number(record['Horas Máquina']) || 0);
      
      if (isNaN(machineHours)) return;

      const d = getOrCreate(factory);
      const lossReason = String(record['Perdas planejadas'] || '').toUpperCase().trim();

      if (lossReason === '') {
        d.usinagemPlanejada += machineHours;
      } else if (lossReason.includes('CAFÉ') || lossReason.includes('CAFE')) {
        d.paradaCafePlanejada += machineHours;
      } else if (lossReason.includes('LIMPEZA')) {
        d.limpezaPlanejada += machineHours;
      } else if (lossReason.includes('APONTAMENTO') || n.includes('TURNO') || n.includes('DDS')) {
        d.apontamentoPlanejado += machineHours;
      } else if (lossReason.includes('INSPEÇÃO') || lossReason.includes('INSPECAO') || lossReason.includes('QUALIDADE')) {
        d.inspecaoPlanejada += machineHours;
      } else if (lossReason.includes('SETUP')) {
        d.setupPlanejado += machineHours;
      } else {
        d.usinagemPlanejada += machineHours;
      }
    });
    
    operatorFilteredProductionRecords.forEach(record => {
        const factory = normalizeFactoryName(record.factory);
        const hours = (Number(record.machiningTime) || 0) / 60;
        if (hours > 0) {
            const d = getOrCreate(factory);
            d.usinagem += hours;
        }
    });

    operatorFilteredLossRecords.forEach(record => {
        const factory = normalizeFactoryName(record.factory);
        const hours = (Number(record.timeLost) || 0) / 60;
        if (hours > 0) {
            const d = getOrCreate(factory);
            const reason = record.lossReason?.toUpperCase() || '';
            if (reason.includes('SETUP')) d.setup += hours;
            else if (reason.includes('DDS')) d.dds += hours;
            else d.outrasPerdas += hours;
        }
    });

    return Object.keys(dataMap).map(factory => {
      const d = dataMap[factory];
      const totalPlanejado = d.usinagemPlanejada + d.paradaCafePlanejada + d.limpezaPlanejada + d.apontamentoPlanejado + d.inspecaoPlanejada + d.setupPlanejado;
      const totalRealizado = d.usinagem + d.setup + d.dds + d.outrasPerdas;
      
      return {
          name: factory,
          ...d,
          totalPlanejado,
          totalRealizado,
      }
  }).sort((a, b) => b.totalPlanejado - a.totalPlanejado);

  }, [filteredPlanejamentoData, operatorFilteredProductionRecords, operatorFilteredLossRecords]);


  useEffect(() => {
    setSelectedMonth('all');
    setSelectedWeek('all');
    setSelectedDate(undefined);
  }, [selectedYear]);

   useEffect(() => {
    if (selectedMonth !== 'all') {
      setSelectedWeek('all');
      setSelectedDate(undefined);
    }
  }, [selectedMonth]);

  useEffect(() => {
    if (selectedWeek !== 'all') {
      setSelectedMonth('all');
      setSelectedDate(undefined);
    }
  }, [selectedWeek]);
  
  useEffect(() => {
    if (selectedDate) {
      setSelectedMonth('all');
      setSelectedWeek('all');
      const year = getYear(selectedDate);
      if (selectedYear && String(year) !== selectedYear) setSelectedYear(String(year));
    }
  }, [selectedDate, selectedYear]);

  const totalHoursData = useMemo(() => {
    const totalMachiningMinutes = (operatorFilteredProductionRecords || []).reduce(
      (sum, record) => sum + (Number(record.machiningTime) || 0),
      0
    );
    const totalLostMinutes = (operatorFilteredLossRecords || []).reduce(
      (sum, record) => sum + (Number(record.timeLost) || 0),
      0
    );
    const totalMinutes = totalMachiningMinutes + totalLostMinutes;
    const totalHours = totalMinutes / 60;
    return { totalHours: totalHours.toFixed(1) };
  }, [operatorFilteredProductionRecords, operatorFilteredLossRecords]);

  const isLoading = loadingProduction || loadingLoss || !isClient;

  if (!isClient) return null;

  return (
    <div className="flex flex-col gap-6">
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Supervisor</h1>
          <p className="text-muted-foreground">Monitoramento de produtividade e análise de dados.</p>
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
            {isLoading ? <Loader className="animate-spin" /> : <div className="text-2xl font-bold">{totalHoursData.totalHours}h</div>}
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

      <div className="flex flex-col sm:flex-row justify-start gap-2">
          <div className="grid w-full sm:max-[120px] gap-1.5">
              <Label htmlFor="year-filter">Ano</Label>
              <Select value={selectedYear || 'all'} onValueChange={setSelectedYear}>
                  <SelectTrigger id="year-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-[120px] gap-1.5">
              <Label htmlFor="month-filter">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!selectedYear || selectedYear === 'all' || !!selectedDate || selectedWeek !== 'all'}>
                  <SelectTrigger id="month-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {months.map(month => <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-[150px] gap-1.5">
              <Label htmlFor="week-filter">Semana</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek} disabled={!selectedYear || selectedYear === 'all' || !!selectedDate || selectedMonth !== 'all'}>
                  <SelectTrigger id="week-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {availableWeeks.map(week => <SelectItem key={week} value={String(week)}>Semana {week}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-[180px] gap-1.5">
              <Label htmlFor="date-filter">Dia</Label>
              <Popover>
                  <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Selecione um dia</span>}
                      </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus /></PopoverContent>
              </Popover>
          </div>
          <div className="grid w-full sm:max-[200px] gap-1.5">
              <Label htmlFor="operator-filter">Técnico</Label>
              <Select value={selectedOperator || 'all'} onValueChange={setSelectedOperator}>
                  <SelectTrigger id="operator-filter"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planejado vs Realizado por Técnico</CardTitle>
          <CardDescription>Comparativo de horas planejadas (Plan) e realizadas (Real) por operador. Clique na barra para filtrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <OperatorPerformanceChart 
            productionData={productionRecords || []}
            lossData={lossRecords || []}
            plannedData={filteredPlanejamentoData || []}
            loading={isLoading}
            selectedOperator={selectedOperator}
            onOperatorSelect={handleOperatorToggle}
          />
        </CardContent>
      </Card>

      <PlannedVsMachinedChart data={plannedVsMachinedData} loading={isLoading || loadingPlanejamento} />
      
      <OeeLossWaterfallChart 
        productionData={operatorFilteredProductionRecords}
        lossData={operatorFilteredLossRecords}
        loading={isLoading}
      />

      <DailyPdlMplLossChart lossData={operatorFilteredLossRecords} loading={isLoading} />

      <MonthlyOeeEvolutionChart loading={isLoading} />
      
      <StatusByFormChart data={operatorFilteredProductionRecords} loading={isLoading} />
      
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
