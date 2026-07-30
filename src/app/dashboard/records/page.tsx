
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
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { collection, query, where, limit } from 'firebase/firestore';
import { getYear, getMonth, format, startOfDay, endOfDay, getISOWeek, endOfMonth, startOfISOWeek, endOfISOWeek, setISOWeek, parse } from 'date-fns';
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

import { MachiningTimeTrendChart } from '@/components/charts/machining-time-trend-chart';
import { OperatorPerformanceChart } from '@/components/charts/operator-performance-chart';
import { PlannedVsMachinedChart } from '@/components/charts/planned-vs-machined-chart';
import { MonthlyOeeEvolutionChart } from '@/components/charts/monthly-oee-evolution-chart';
import { OeeLossWaterfallChart } from '@/components/charts/oee-loss-waterfall-chart';
import { DailyPdlMplLossChart } from '@/components/charts/daily-pdl-mpl-loss-chart';
import { AvailableVsActualChart } from '@/components/charts/available-vs-actual-chart';

const months = [
    { value: '0', label: 'Janeiro' }, { value: '1', label: 'Fevereiro' }, { value: '2', label: 'Março' },
    { value: '3', label: 'Abril' }, { value: '4', label: 'Maio' }, { value: '5', label: 'Junho' },
    { value: '6', label: 'Julho' }, { value: '7', label: 'Agosto' }, { value: '8', label: 'Setembro' },
    { value: '9', label: 'Outubro' }, { value: '10', label: 'Novembro' }, { value: '11', label: 'Dezembro' },
];

const operatorList = [
    "Alisson França", "Daniel Solivo", "Rodrigo Cantano", "Gustavo Gozzi",
    "William Martinucci", "Nathan Xavier", "Jair Melo", "Marcos Barbosa"
];

const availableHoursJune: Record<string, number> = {
  'AGUAÍ': 285, 'INDAIATUBA': 68, 'IGARASSU': 107, 'GARANHUNS': 94,
  'SUAPE': 113, 'VINHEDO': 112, 'VALINHOS (DOVE/SABONETE)': 166, 'POUSO ALEGRE': 124,
};

const normalizeOperatorName = (name: any) => {
  if (!name) return '';
  const n = String(name).toLowerCase().trim();
  if (n.includes('alisson')) return 'Alisson França';
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
  if (n.includes('VALINHOS DOVE') || n.includes('VALINHOS SABONETE')) return 'VALINHOS (DOVE/SABONETE)';
  if (n.includes('VINHEDO')) return 'VINHEDO';
  if (n.includes('AGUAI')) return 'AGUAÍ';
  return n;
};

const getCategoryKey = (reason: string): string => {
  const r = String(reason || '').toUpperCase().trim();
  if (r === '' || r === 'USINAGEM' || r === 'PRODUCAO') return 'PRODUCAO';
  if (r.includes('PROGRAMACAO')) return 'PROGRAMACAO';
  if (r.includes('SETUP')) return 'SETUP';
  return r;
};

export default function RecordsPage() {
  const firestore = useFirestore();
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

  const planoRef = useMemo(() => firestore ? doc(firestore, 'programacaoState', 'plano') : null, [firestore]);
  const { data: planoDoc } = useDoc(planoRef);

  useEffect(() => {
    if (planoDoc) {
      setPlanejamentoData(planoDoc.data || []);
    } else if (planoDoc === null) {
      setPlanejamentoData([]);
    }
    setLoadingPlanejamento(false);
  }, [planoDoc]);

  const { startDate, endDate } = useMemo(() => {
    if (!selectedYear || !isClient) return { startDate: undefined, endDate: undefined };
    let start, end;
    const year = parseInt(selectedYear, 10);
    if (selectedDate) {
      start = startOfDay(selectedDate); end = endOfDay(selectedDate);
    } else if (selectedMonth && selectedMonth !== 'all') {
      start = new Date(year, parseInt(selectedMonth), 1); end = endOfMonth(start);
    } else {
      start = new Date(year, 0, 1); end = new Date(year, 11, 31, 23, 59, 59);
    }
    return { startDate: start, endDate: end };
  }, [selectedDate, selectedYear, selectedMonth, isClient]);

  const prodQuery = useMemoFirebase(() => firestore && startDate && endDate ? query(collection(firestore, 'productionRecords'), where('date', '>=', startDate), where('date', '<=', endDate), limit(500)) : null, [firestore, startDate, endDate]);
  const lossQuery = useMemoFirebase(() => firestore && startDate && endDate ? query(collection(firestore, 'lossRecords'), where('date', '>=', startDate), where('date', '<=', endDate), limit(500)) : null, [firestore, startDate, endDate]);

  const { data: productionRecords, isLoading: loadingProduction } = useCollection(prodQuery);
  const { data: lossRecords, isLoading: loadingLoss } = useCollection(lossQuery);

  const filteredPlanejamentoData = useMemo(() => {
    return planejamentoData.filter(record => {
      const name = normalizeOperatorName(record.tecnico);
      return (!selectedOperator || selectedOperator === 'all' || name === selectedOperator);
    });
  }, [planejamentoData, selectedOperator]);

  const operatorFilteredProductionRecords = useMemo(() => {
    if (!productionRecords) return [];
    return productionRecords.filter(r => !selectedOperator || selectedOperator === 'all' || normalizeOperatorName(r.operatorId) === selectedOperator);
  }, [productionRecords, selectedOperator]);

  const operatorFilteredLossRecords = useMemo(() => {
    if (!lossRecords) return [];
    return lossRecords.filter(r => !selectedOperator || selectedOperator === 'all' || normalizeOperatorName(r.operatorId) === selectedOperator);
  }, [lossRecords, selectedOperator]);

  const plannedVsMachinedData = useMemo(() => {
    const dataMap: { [factory: string]: any } = {};
    const getOrCreate = (factory: string) => {
      if (!dataMap[factory]) dataMap[factory] = { totalPlanejado: 0, totalRealizado: 0 };
      return dataMap[factory];
    };

    filteredPlanejamentoData.forEach(record => {
      const factory = normalizeFactoryName(record.site || 'VALINHOS');
      const d = getOrCreate(factory);
      const time = (record.tempoMinutos || 0) / 60;
      d.totalPlanejado += time;
    });
    
    operatorFilteredProductionRecords.forEach(record => {
        const factory = normalizeFactoryName(record.factory);
        const d = getOrCreate(factory);
        d.totalRealizado += (Number(record.machiningTime) || 0) / 60;
    });

    return Object.keys(dataMap).map(factory => ({
        name: factory,
        ...dataMap[factory],
        totalDisponivel: availableHoursJune[factory] || 0
    })).sort((a, b) => b.totalPlanejado - a.totalPlanejado);
  }, [filteredPlanejamentoData, operatorFilteredProductionRecords]);

  if (!isClient) return null;

  const isLoading = loadingProduction || loadingLoss || !isClient;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Supervisor</h1>
          <p className="text-muted-foreground">Análise de produtividade e eficiência baseada no Cloud Firestore.</p>
        </div>
        <Button asChild><Link href="/dashboard/production-registry"><PlusCircle className="mr-2 h-4 w-4" />Novo Registro</Link></Button>
      </div>

      <div className="flex flex-col sm:flex-row justify-start gap-2 bg-card p-3 rounded-lg border shadow-sm">
          <div className="grid w-full sm:max-w-[120px] gap-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[200px] gap-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Técnico</Label>
              <Select value={selectedOperator || 'all'} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="h-8 text-xs font-bold"><SelectValue /></SelectTrigger>
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
          <CardDescription>Comparativo de horas baseado no novo motor Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
          <OperatorPerformanceChart 
            productionData={operatorFilteredProductionRecords}
            lossData={operatorFilteredLossRecords}
            plannedData={filteredPlanejamentoData}
            loading={isLoading}
            selectedOperator={selectedOperator}
            onOperatorSelect={setSelectedOperator}
          />
        </CardContent>
      </Card>

      <PlannedVsMachinedChart data={plannedVsMachinedData} loading={isLoading || loadingPlanejamento} />
      <AvailableVsActualChart data={plannedVsMachinedData} loading={isLoading || loadingPlanejamento} />
      
      <OeeLossWaterfallChart productionData={operatorFilteredProductionRecords} lossData={operatorFilteredLossRecords} loading={isLoading} />
    </div>
  );
}
