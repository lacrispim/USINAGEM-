
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
  PlusCircle,
  CalendarIcon,
  User,
  Filter,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { doc } from 'firebase/firestore';
import { collection, query, where, limit } from 'firebase/firestore';
import { format, startOfDay, endOfDay, endOfMonth, parse } from 'date-fns';
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

import { OperatorPerformanceChart } from '@/components/charts/operator-performance-chart';
import { PlannedVsMachinedChart } from '@/components/charts/planned-vs-machined-chart';
import { OeeLossWaterfallChart } from '@/components/charts/oee-loss-waterfall-chart';
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

export default function RecordsPage() {
  const firestore = useFirestore();
  const [isClient, setIsClient] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);

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

  const prodQuery = useMemoFirebase(() => firestore && startDate && endDate ? query(collection(firestore, 'productionRecords'), where('date', '>=', startDate), where('date', '<=', endDate), limit(1000)) : null, [firestore, startDate, endDate]);
  const lossQuery = useMemoFirebase(() => firestore && startDate && endDate ? query(collection(firestore, 'lossRecords'), where('date', '>=', startDate), where('date', '<=', endDate), limit(1000)) : null, [firestore, startDate, endDate]);

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
      
      const type = record.tipoAtividade === 'PROGRAMACAO' ? 'PROGRAMACAO' : 'PRODUCAO';
      const key = `plan_${type}`;
      d[key] = (d[key] || 0) + time;
    });
    
    operatorFilteredProductionRecords.forEach(record => {
        const factory = normalizeFactoryName(record.factory);
        const d = getOrCreate(factory);
        const hours = (Number(record.machiningTime) || 0) / 60;
        d.totalRealizado += hours;
        
        const type = String(record.activityType || 'PRODUCAO').toUpperCase().includes('PROGRAMACAO') ? 'PROGRAMACAO' : 'PRODUCAO';
        const key = `real_${type}`;
        d[key] = (d[key] || 0) + hours;
    });

    operatorFilteredLossRecords.forEach(record => {
        const factory = normalizeFactoryName(record.factory);
        const d = getOrCreate(factory);
        const hours = (Number(record.timeLost) || 0) / 60;
        const reason = String(record.lossReason || 'PERDA').toUpperCase();
        const key = `real_${reason}`;
        d[key] = (d[key] || 0) + hours;
        d.totalRealizado += hours;
    });

    return Object.keys(dataMap).map(factory => ({
        name: factory,
        ...dataMap[factory],
        totalDisponivel: availableHoursJune[factory] || 0
    })).sort((a, b) => b.totalPlanejado - a.totalPlanejado);
  }, [filteredPlanejamentoData, operatorFilteredProductionRecords, operatorFilteredLossRecords]);

  if (!isClient) return null;

  const isLoading = loadingProduction || loadingLoss || !isClient;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão Supervisor</h1>
          <p className="text-muted-foreground">Análise consolidada de produtividade e eficiência industrial.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" asChild><Link href="/dashboard/programming">Ver Cronograma</Link></Button>
            <Button asChild><Link href="/dashboard/production-registry"><PlusCircle className="mr-2 h-4 w-4" />Novo Registro</Link></Button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 bg-card p-4 rounded-lg border shadow-sm">
          <div className="grid w-full sm:max-w-[100px] gap-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 text-xs font-bold"><SelectValue /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[140px] gap-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Mês Referência</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Ano Inteiro</SelectItem>
                      {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          <div className="grid w-full sm:max-w-[160px] gap-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Filtrar por Dia</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 text-xs font-bold justify-start", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecionar Dia"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
                </PopoverContent>
              </Popover>
          </div>
          <div className="grid w-full sm:max-w-[200px] gap-1.5">
              <Label className="text-[10px] font-black uppercase text-muted-foreground">Técnico Responsável</Label>
              <Select value={selectedOperator || 'all'} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="h-9 text-xs font-bold">
                    <div className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        <SelectValue placeholder="Todos os Técnicos" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">Todos os Técnicos</SelectItem>
                      {operatorList.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                  </SelectContent>
              </Select>
          </div>
          {(selectedDate || selectedOperator !== 'all' || selectedMonth !== String(new Date().getMonth())) && (
              <Button variant="ghost" size="sm" onClick={() => { setSelectedDate(undefined); setSelectedOperator('all'); setSelectedMonth(String(new Date().getMonth())); }} className="h-9 text-xs text-destructive hover:bg-destructive/10">Limpar Filtros</Button>
          )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
            <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" /> Performance: Planejado vs Realizado</CardTitle>
            <CardDescription>Comparativo de horas baseado nos registros de produção e perdas do Firestore.</CardDescription>
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

        {/* Gráfico Planejado vs Realizado em destaque (largura total) */}
        <PlannedVsMachinedChart data={plannedVsMachinedData} loading={isLoading || loadingPlanejamento} />

        {/* Gráfico OEE em destaque (largura total) */}
        <OeeLossWaterfallChart productionData={operatorFilteredProductionRecords} lossData={operatorFilteredLossRecords} loading={isLoading} />

        <div className="grid grid-cols-1 gap-6">
            <AvailableVsActualChart data={plannedVsMachinedData} loading={isLoading || loadingPlanejamento} />
        </div>
      </div>
    </div>
  );
}
