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
  X,
  User,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { collection, query } from 'firebase/firestore';
import { LossReasonChart } from '@/components/charts/loss-reason-chart';
import { MachiningTimeTrendChart } from '@/components/charts/machining-time-trend-chart';
import { getYear, getMonth, format, startOfDay, endOfDay, getISOWeek, parse } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { OperatorDailyTimeChart } from '@/components/charts/operator-daily-time-chart';
import { OperatorDailyLossChart } from '@/components/charts/operator-daily-loss-chart';
import { OperatorPerformanceChart } from '@/components/charts/operator-performance-chart';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Confetti } from '@/components/ui/confetti';
import { PlannedVsMachinedChart } from '@/components/charts/planned-vs-machined-chart';
import { OeeLossWaterfallChart } from '@/components/charts/oee-loss-waterfall-chart';


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


export default function RecordsPage() {
  const firestore = useFirestore();
  const database = useDatabase();
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);

  const [planejamentoData, setPlanejamentoData] = useState<any[]>([]);
  const [loadingPlanejamento, setLoadingPlanejamento] = useState(true);

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

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [database]);


  const productionRecordsQuery = useMemoFirebase(() => firestore
    ? query(collection(firestore, 'productionRecords'))
    : null, [firestore]);
  const { data: productionRecords, loading: loadingProduction } =
    useCollection(productionRecordsQuery);

  const lossRecordsQuery = useMemoFirebase(() => firestore
    ? query(collection(firestore, 'lossRecords'))
    : null, [firestore]);
  const { data: lossRecords, loading: loadingLoss } =
    useCollection(lossRecordsQuery);
    
  const {
    availableYears,
    availableWeeks,
    filteredProductionRecords,
    filteredLossRecords,
    filteredPlanejamentoData,
    performanceProductionRecords,
    performanceLossRecords,
    setupDataForChart,
    ddsDataForChart,
    otherLossesDataForChart,
  } = useMemo(() => {
    if (!productionRecords || !lossRecords || !planejamentoData) {
        return { 
          availableYears: [], 
          availableWeeks: [], 
          filteredProductionRecords: [], 
          filteredLossRecords: [], 
          filteredPlanejamentoData: [],
          performanceProductionRecords: [],
          performanceLossRecords: [],
          setupDataForChart: [],
          ddsDataForChart: [],
          otherLossesDataForChart: [],
        };
    }

    const recordYears = new Set<number>();
    [...productionRecords, ...lossRecords].forEach((record) => {
        if (record.date?.toDate) {
            const year = getYear(record.date.toDate());
            if (year > 2000 && year < 3000) {
                 recordYears.add(year);
            }
        }
    });

    const sortedYears = Array.from(recordYears).sort((a, b) => b - a);
    let weeks: number[] = [];
    if (selectedYear !== 'all') {
      weeks = Array.from({ length: 53 }, (_, i) => i + 1);
    }

    // A generic filter function for any record with a date
    const dateFilter = (recordDate: Date) => {
      if (selectedDate) {
        return recordDate >= startOfDay(selectedDate) && recordDate <= endOfDay(selectedDate);
      }
      
      const yearMatch = selectedYear === 'all' || getYear(recordDate) === parseInt(selectedYear, 10);
      if (!yearMatch) return false;
      
      if (selectedYear !== 'all') {
          if (selectedWeek !== 'all') {
              return getISOWeek(recordDate) === parseInt(selectedWeek, 10);
          }
          if (selectedMonth !== 'all') {
              return getMonth(recordDate) === parseInt(selectedMonth, 10);
          }
      }
      return true;
    }

    // Filter Firestore records (production/loss)
    const baseFilterFirestore = (record: any) => {
        if (!record.date?.toDate) return false;
        const recordDate = record.date.toDate();
        if (!dateFilter(recordDate)) return false;

        const factoryMatch = !selectedFactory || record.factory === selectedFactory;
        if (!factoryMatch) return false;

        return true;
    };
    
    // Unfiltered by operator for performance chart
    const perfProdRecords = productionRecords.filter(baseFilterFirestore);
    const perfLossRecords = lossRecords.filter(baseFilterFirestore);

    // Filtered by operator for other charts
    const operatorFilterFirestore = (record: any) => {
        if (!selectedOperator) return true;
        const recordOp = record.operatorId || record['Técnicos'];
        if (!recordOp) return false;
        
        const operatorName = String(selectedOperator);
        const recordOperatorName = String(recordOp);

        // Handles both direct match and partial match (e.g., "William" in "William Martinucci")
        return recordOperatorName.includes(operatorName) || operatorName.includes(recordOperatorName);
    };

    const filteredProd = perfProdRecords.filter(operatorFilterFirestore);
    
    const filteredLoss = perfLossRecords.filter(operatorFilterFirestore).filter(record => {
      const reasonMatch = !selectedReason || record.lossReason === selectedReason;
      return reasonMatch;
    });
    
    // Data for MachiningTimeByFactoryChart
    const setupData = perfLossRecords
      .filter(operatorFilterFirestore)
      .filter(record => record.lossReason?.toUpperCase().includes('SETUP'));
      
    const ddsData = perfLossRecords
      .filter(operatorFilterFirestore)
      .filter(record => record.lossReason?.toUpperCase() === 'DDS' || record.lossReason?.toUpperCase() === 'DDSHE');

    const otherLossesData = perfLossRecords
      .filter(operatorFilterFirestore)
      .filter(record => {
          if (!record.lossReason) return true;
          const upperCaseReason = record.lossReason.toUpperCase();
          return !upperCaseReason.includes('SETUP') && upperCaseReason !== 'DDS' && upperCaseReason !== 'DDSHE';
      });


    // Filter Realtime DB records (planning)
    const planningFilter = (record: any) => {
      if (!record['Data Execução']) return false;
      let recordDate;
      try {
        recordDate = parse(record['Data Execução'], 'dd/MM/yyyy', new Date());
        if (isNaN(recordDate.getTime())) {
          recordDate = new Date(record['Data Execução']);
        }
        if (isNaN(recordDate.getTime())) return false;
      } catch { return false; }
      
      if (!dateFilter(recordDate)) return false;

      const factoryMatch = !selectedFactory || record['Site'] === selectedFactory;
      if (!factoryMatch) return false;
      
      return operatorFilterFirestore(record);
    };

    const filteredPlanData = planejamentoData.filter(planningFilter);

    return { 
        availableYears: sortedYears, 
        availableWeeks: weeks, 
        filteredProductionRecords: filteredProd, 
        filteredLossRecords: filteredLoss, 
        filteredPlanejamentoData: filteredPlanData,
        performanceProductionRecords: perfProdRecords,
        performanceLossRecords: perfLossRecords,
        setupDataForChart: setupData,
        ddsDataForChart: ddsData,
        otherLossesDataForChart: otherLossesData,
    };
  }, [productionRecords, lossRecords, planejamentoData, selectedYear, selectedMonth, selectedWeek, selectedDate, selectedFactory, selectedReason, selectedOperator]);

    const plannedVsMachinedData = useMemo(() => {
        const dataMap: { [factory: string]: { planejado: number; usinagem: number; setup: number; dds: number; outrasPerdas: number } } = {};

        const normalizeFactoryName = (name: string | undefined): string | undefined => {
            if (!name) return undefined;
            const upperName = name.toUpperCase().trim();
            if (upperName === 'AGUAI' || upperName === 'AGUAÍ') {
                return 'AGUAÍ';
            }
            return name;
        };

        // 1. Aggregate planned hours from filtered Realtime DB data
        filteredPlanejamentoData.forEach(record => {
          const factory = normalizeFactoryName(record['Site']);
          const hours = Number(record['Horas Máquina']) || 0;
          if (factory) {
              if (!dataMap[factory]) {
                dataMap[factory] = { planejado: 0, usinagem: 0, setup: 0, dds: 0, outrasPerdas: 0 };
              }
              dataMap[factory].planejado += hours;
          }
        });
        
        // 2. Aggregate production time
        filteredProductionRecords.forEach(record => {
            const factory = normalizeFactoryName(record.factory);
            const hours = (Number(record.machiningTime) || 0) / 60;
            if (factory && hours > 0) {
                if (!dataMap[factory]) {
                    dataMap[factory] = { planejado: 0, usinagem: 0, setup: 0, dds: 0, outrasPerdas: 0 };
                }
                dataMap[factory].usinagem += hours;
            }
        });

        // 3. Aggregate setup time
        setupDataForChart.forEach(record => {
            const factory = normalizeFactoryName(record.factory);
            const hours = (Number(record.timeLost) || 0) / 60;
            if (factory && hours > 0) {
                if (!dataMap[factory]) {
                    dataMap[factory] = { planejado: 0, usinagem: 0, setup: 0, dds: 0, outrasPerdas: 0 };
                }
                dataMap[factory].setup += hours;
            }
        });

        // 4. Aggregate DDS time
        ddsDataForChart.forEach(record => {
            const factory = normalizeFactoryName(record.factory);
            const hours = (Number(record.timeLost) || 0) / 60;
            if (factory && hours > 0) {
                if (!dataMap[factory]) {
                    dataMap[factory] = { planejado: 0, usinagem: 0, setup: 0, dds: 0, outrasPerdas: 0 };
                }
                dataMap[factory].dds += hours;
            }
        });

        // 5. Aggregate other losses
        otherLossesDataForChart.forEach(record => {
            const factory = normalizeFactoryName(record.factory);
            const hours = (Number(record.timeLost) || 0) / 60;
            if (factory && hours > 0) {
                if (!dataMap[factory]) {
                    dataMap[factory] = { planejado: 0, usinagem: 0, setup: 0, dds: 0, outrasPerdas: 0 };
                }
                dataMap[factory].outrasPerdas += hours;
            }
        });


        // 6. Format for chart
        return Object.keys(dataMap).map(factory => {
          const usinagem = dataMap[factory].usinagem;
          const setup = dataMap[factory].setup;
          const dds = dataMap[factory].dds;
          const outrasPerdas = dataMap[factory].outrasPerdas;
          return {
              name: factory,
              planejado: dataMap[factory].planejado,
              usinado: usinagem + setup + dds + outrasPerdas, // Total for the label
              usinagem: usinagem,
              setup: setup,
              dds: dds,
              outrasPerdas: outrasPerdas,
          }
      }).sort((a, b) => (b.planejado + b.usinado) - (a.planejado + a.usinado));

  }, [filteredPlanejamentoData, filteredProductionRecords, setupDataForChart, ddsDataForChart, otherLossesDataForChart]);


  useEffect(() => {
    // Let's celebrate the successful deployment!
    setShowConfetti(true);
  }, []);

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
      if (String(year) !== selectedYear) {
        setSelectedYear(String(year));
      }
    }
  }, [selectedDate, selectedYear]);

  useEffect(() => {
    setSelectedFactory(null);
    setSelectedReason(null);
    setSelectedOperator(null);
  }, [selectedYear, selectedMonth, selectedWeek, selectedDate]);


  const totalHoursData = useMemo(() => {
    if (loadingProduction || loadingLoss) {
      return { totalHours: '0.0', isLoading: true };
    }

    const totalMachiningMinutes = filteredProductionRecords.reduce(
      (sum, record) => sum + (Number(record.machiningTime) || 0),
      0
    );
    const totalLostMinutes = filteredLossRecords.reduce(
      (sum, record) => sum + (Number(record.timeLost) || 0),
      0
    );

    const totalMinutes = totalMachiningMinutes + totalLostMinutes;
    const totalHours = totalMinutes / 60;

    return {
      totalHours: totalHours.toFixed(1),
      isLoading: false,
    };
  }, [filteredProductionRecords, filteredLossRecords, loadingProduction, loadingLoss]);

  const totalProductionRecords = filteredProductionRecords
    ? filteredProductionRecords.length
    : 0;
  const totalLossRecords = filteredLossRecords ? filteredLossRecords.length : 0;

  const isLoading = loadingProduction || loadingLoss;
  
  const handleFactorySelect = (factoryName: string | null) => {
    setSelectedFactory(current => current === factoryName ? null : factoryName);
  };
  
  const handleReasonSelect = (reasonName: string | null) => {
    setSelectedReason(current => current === reasonName ? null : reasonName);
  };

  const handleOperatorSelect = (operatorName: string | null) => {
    setSelectedOperator(current => current === operatorName ? null : operatorName);
  };

  return (
    <div className="flex flex-col gap-6">
      {showConfetti && <Confetti onComplete={() => setShowConfetti(false)} />}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Supervisor</h1>
          <p className="text-muted-foreground">
            Uma visão geral dos dados de produção.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/production-registry">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add New Record
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Horas Totais de Usinagem Utilizadas
            </CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-10">
                <Loader className="animate-spin" />
              </div>
            ) : (
              <div className="text-2xl font-bold">
                {totalHoursData.totalHours}h
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Soma de tempo de usinagem e tempo perdido.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Registros de Produção
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-10">
                <Loader className="animate-spin" />
              </div>
            ) : (
              <div className="text-2xl font-bold">{totalProductionRecords}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total de registros no período selecionado.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Registros de Perda
            </CardTitle>
            <TriangleAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-10">
                <Loader className="animate-spin" />
              </div>
            ) : (
              <div className="text-2xl font-bold">{totalLossRecords}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Total de perdas registradas no período.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-start gap-2">
          <div className="grid w-full sm:max-w-[120px] gap-1.5">
              <Label htmlFor="year-filter">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="year-filter">
                  <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {availableYears.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                      {year}
                      </SelectItem>
                  ))}
                  </SelectContent>
              </Select>
          </div>
            <div className="grid w-full sm:max-w-[120px] gap-1.5">
              <Label htmlFor="month-filter">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === 'all' || !!selectedDate || selectedWeek !== 'all'}>
                  <SelectTrigger id="month-filter">
                      <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {months.map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                              {month.label}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[150px] gap-1.5">
              <Label htmlFor="week-filter">Semana</Label>
              <Select value={selectedWeek} onValueChange={setSelectedWeek} disabled={selectedYear === 'all' || !!selectedDate || selectedMonth !== 'all'}>
                  <SelectTrigger id="week-filter">
                  <SelectValue placeholder="Selecione a semana" />
                  </SelectTrigger>
                  <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {availableWeeks.map((week) => (
                      <SelectItem key={week} value={String(week)}>
                          {`Semana ${week}`}
                      </SelectItem>
                  ))}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[180px] gap-1.5 relative">
              <Label htmlFor="date-filter">Dia</Label>
                  <Popover>
                  <PopoverTrigger asChild>
                  <Button
                      id="date-filter"
                      variant={"outline"}
                      className={cn(
                      "justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                      )}
                  >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Selecione um dia</span>}
                  </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                  <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                  />
                  </PopoverContent>
              </Popover>
          </div>
      </div>
       <Card>
        <CardHeader>
          <CardTitle>Horas Trabalhadas por Técnico</CardTitle>
          <CardDescription>
            Progresso da jornada de trabalho de cada operador até a meta de 7 horas. Clique em um técnico para filtrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OperatorPerformanceChart 
            productionData={performanceProductionRecords}
            lossData={performanceLossRecords}
            loading={isLoading}
            selectedOperator={selectedOperator}
            onOperatorSelect={handleOperatorSelect}
          />
        </CardContent>
      </Card>
       
      <PlannedVsMachinedChart data={plannedVsMachinedData} loading={isLoading || loadingPlanejamento} />
      
      <OeeLossWaterfallChart 
        productionData={filteredProductionRecords}
        lossData={filteredLossRecords}
        loading={isLoading}
      />
       
      <LossReasonChart
        data={filteredLossRecords}
        loading={loadingLoss}
        selectedReason={selectedReason}
        onReasonSelect={handleReasonSelect}
      />
      
      <Card>
        <CardHeader>
            <div>
              <CardTitle>Análise diária do Tempo de Usinagem</CardTitle>
              <CardDescription>
                Análise diária do tempo de usinagem (em minutos) por fábrica.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <MachiningTimeTrendChart
            data={filteredProductionRecords}
            setupData={setupDataForChart}
            ddsData={ddsDataForChart}
            loading={loadingProduction}
            isWeekView={selectedWeek !== 'all'}
            isDayView={!!selectedDate}
          />
        </CardContent>
      </Card>
      <Card>
        <OperatorDailyTimeChart
          productionData={filteredProductionRecords}
          loading={isLoading}
          isWeekView={selectedWeek !== 'all'}
          isDayView={!!selectedDate}
        />
      </Card>
      <Card>
        <CardHeader>
            <div>
              <CardTitle>Análise de Perda por Operador</CardTitle>
              <CardDescription>
                Tempo total de perda por operador a cada dia.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <OperatorDailyLossChart
            lossData={filteredLossRecords}
            loading={isLoading}
            isWeekView={selectedWeek !== 'all'}
            isDayView={!!selectedDate}
          />
        </CardContent>
      </Card>
    </div>
  );
}
    

    

    
