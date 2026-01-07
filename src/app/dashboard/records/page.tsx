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
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { MachiningTimeByFactoryChart } from '@/components/charts/machining-time-by-factory-chart';
import { MachiningTimeTrendChart } from '@/components/charts/machining-time-trend-chart';
import { getYear, format, getISOWeek } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { OperatorDailyTimeChart } from '@/components/charts/operator-daily-time-chart';
import { LossReasonChart } from '@/components/charts/loss-reason-chart';

export default function RecordsPage() {
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedFactory, setSelectedFactory] = useState<string | null>(null);


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
    
  const { availableYears, availableWeeks, filteredProductionRecords, filteredLossRecords } = useMemo(() => {
    if (!productionRecords || !lossRecords) {
        return { availableYears: [], availableWeeks: [], filteredProductionRecords: [], filteredLossRecords: [] };
    }

    const recordYears = new Set<number>();
    const allRecords = [...productionRecords, ...lossRecords];

    allRecords.forEach((record) => {
        if (record.date?.toDate) {
            const year = getYear(record.date.toDate());
            if (year > 2000 && year < 3000) {
                 recordYears.add(year);
            }
        }
    });

    const sortedYears = Array.from(recordYears).sort((a, b) => b - a);
    const year = selectedYear === 'all' ? null : parseInt(selectedYear, 10);
    
    let weeks: number[] = [];
    if (year) {
      weeks = Array.from({ length: 52 }, (_, i) => i + 1);
    }


    const filterRecords = (records: any[]) => {
      return records.filter((record) => {
          if (!record.date?.toDate) return false;
          const recordDate = record.date.toDate();
          
          const yearMatch = selectedYear === 'all' || getYear(recordDate) === parseInt(selectedYear, 10);
          if (!yearMatch) return false;
          
          if (selectedYear !== 'all') {
              const weekMatch = selectedWeek === 'all' || getISOWeek(recordDate) === parseInt(selectedWeek, 10);
              if (!weekMatch) return false;
          }

          const factoryMatch = !selectedFactory || record.factory === selectedFactory;
          if (!factoryMatch) return false;

          return true;
      });
    }

    const filteredProd = filterRecords(productionRecords);
    const filteredLoss = filterRecords(lossRecords);

    return { availableYears: sortedYears, availableWeeks: weeks, filteredProductionRecords: filteredProd, filteredLossRecords: filteredLoss };
  }, [productionRecords, lossRecords, selectedYear, selectedWeek, selectedFactory]);


  useEffect(() => {
    setSelectedWeek('all');
  }, [selectedYear]);

  useEffect(() => {
    setSelectedFactory(null);
  }, [selectedYear, selectedWeek]);


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


  const lossReasonData = useMemo(() => {
    if (!filteredLossRecords) {
      return [];
    }
  
    const reasonMap = filteredLossRecords.reduce((acc, record) => {
      let reason = record.lossReason || 'Não especificado';
      const time = Number(record.timeLost) || 0;
  
      // Group all "REUNIÃO" related reasons into a single "REUNIÃO" category
      if (reason.toLowerCase().includes('reunião')) {
        reason = 'REUNIÃO';
      } else if (reason.toLowerCase().includes('setup')) {
        reason = 'SETUP';
      }
  
      if (!acc[reason]) {
        acc[reason] = 0;
      }
      acc[reason] += time;
      return acc;
    }, {} as Record<string, number>);
  
    return Object.entries(reasonMap).map(([name, value]) => ({
      name,
      value,
    })).sort((a,b) => b.value - a.value);
  }, [filteredLossRecords]);

  const totalProductionRecords = filteredProductionRecords
    ? filteredProductionRecords.length
    : 0;
  const totalLossRecords = filteredLossRecords ? filteredLossRecords.length : 0;

  const isLoading = loadingProduction || loadingLoss;
  
  const handleFactorySelect = (factoryName: string | null) => {
    setSelectedFactory(current => current === factoryName ? null : factoryName);
  };

  return (
    <div className="flex flex-col gap-6">
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

       <div className="flex justify-end gap-4">
            <div className="grid w-full sm:w-36 gap-1.5">
                <Label htmlFor="year-filter">Ano</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger id="year-filter">
                    <SelectValue placeholder="Selecione o ano" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todos os Anos</SelectItem>
                    {availableYears.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                        {year}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid w-full sm:w-48 gap-1.5">
                <Label htmlFor="week-filter">Semana</Label>
                <Select value={selectedWeek} onValueChange={setSelectedWeek} disabled={selectedYear === 'all'}>
                    <SelectTrigger id="week-filter">
                    <SelectValue placeholder="Selecione a semana" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">Todas as Semanas</SelectItem>
                    {availableWeeks.map((week) => (
                        <SelectItem key={week} value={String(week)}>
                            {`Semana ${week}`}
                        </SelectItem>
                    ))}
                    </SelectContent>
                </Select>
            </div>
        </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LossReasonChart
          data={lossReasonData}
          loading={loadingLoss}
        />
        <MachiningTimeByFactoryChart
          data={productionRecords || []}
          loading={loadingProduction}
          selectedFactory={selectedFactory}
          onFactorySelect={handleFactorySelect}
        />
      </div>
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
            loading={loadingProduction}
            isWeekView={selectedWeek !== 'all'}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
            <div>
              <CardTitle>Análise diária por Operador</CardTitle>
              <CardDescription>
                Tempo total de atividades (produção e perda) por operador a cada dia.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          <OperatorDailyTimeChart
            productionData={filteredProductionRecords}
            lossData={filteredLossRecords}
            loading={isLoading}
            isWeekView={selectedWeek !== 'all'}
          />
        </CardContent>
      </Card>
    </div>
  );
}
