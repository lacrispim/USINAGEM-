'use client';

import { useMemo, useState } from 'react';
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
import { useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LossReasonPieChart } from '@/components/charts/loss-reason-pie-chart';
import { MachiningTimeByFactoryChart } from '@/components/charts/machining-time-by-factory-chart';
import { MachiningTimeTrendChart } from '@/components/charts/machining-time-trend-chart';
import { getYear, format, getISOWeek, eachWeekOfInterval, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function RecordsPage() {
  const firestore = useFirestore();
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedWeek, setSelectedWeek] = useState<string>('all');


  const productionRecordsQuery = firestore
    ? query(collection(firestore, 'productionRecords'))
    : null;
  const { data: productionRecords, loading: loadingProduction } =
    useCollection(productionRecordsQuery);

  const lossRecordsQuery = firestore
    ? query(collection(firestore, 'lossRecords'))
    : null;
  const { data: lossRecords, loading: loadingLoss } =
    useCollection(lossRecordsQuery);
    
  const { availableYears, availableWeeks, filteredProductionRecords } = useMemo(() => {
    if (!productionRecords) {
        return { availableYears: [], availableWeeks: [], filteredProductionRecords: [] };
    }

    const recordYears = new Set<number>();
    productionRecords.forEach((record) => {
        if (record.date?.toDate) {
            recordYears.add(getYear(record.date.toDate()));
        }
    });

    // Add future years up to 2026
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y <= 2026; y++) {
        recordYears.add(y);
    }

    const sortedYears = Array.from(recordYears).sort((a, b) => b - a);
    const year = selectedYear === 'all' ? null : parseInt(selectedYear, 10);
    
    let weeks: number[] = [];
    if (year) {
        const weeksSet = new Set<number>();
        productionRecords.forEach((record) => {
            const recordDate = record.date?.toDate;
            if (recordDate && getYear(recordDate) === year) {
                weeksSet.add(getISOWeek(recordDate));
            }
        });
        
        // If the selected year is a future year or the current year, add all weeks
        if (year >= new Date().getFullYear()) {
             // There are 52 or 53 weeks in a year. Let's stick to 52 for consistency.
            for (let i = 1; i <= 52; i++) {
                weeksSet.add(i);
            }
        }

        weeks = Array.from(weeksSet).sort((a, b) => a - b);
    }


    const filtered = productionRecords.filter((record) => {
        if (!record.date?.toDate) return false;
        const recordDate = record.date.toDate();
        
        const yearMatch = selectedYear === 'all' || getYear(recordDate) === parseInt(selectedYear, 10);
        if (!yearMatch) return false;
        
        if (selectedYear !== 'all') {
            const weekMatch = selectedWeek === 'all' || getISOWeek(recordDate) === parseInt(selectedWeek, 10);
            if (!weekMatch) return false;
        }

        return true;
    });

    return { availableYears: sortedYears, availableWeeks: weeks, filteredProductionRecords: filtered };
  }, [productionRecords, selectedYear, selectedWeek]);


  // Reset week when year changes
  useState(() => {
    setSelectedWeek('all');
  }, [selectedYear]);


  const totalHoursData = useMemo(() => {
    const initialHours = 540;
    if (!productionRecords || !lossRecords) {
      return { remainingHours: initialHours, isLoading: true };
    }

    const totalMachiningMinutes = productionRecords.reduce(
      (sum, record) => sum + (record.machiningTime || 0),
      0
    );
    const totalLostMinutes = lossRecords.reduce(
      (sum, record) => sum + (record.timeLost || 0),
      0
    );

    const totalMinutesToDeduct = totalMachiningMinutes + totalLostMinutes;
    const hoursToDeduct = totalMinutesToDeduct / 60;
    const remainingHours = initialHours - hoursToDeduct;

    return {
      remainingHours: remainingHours.toFixed(1), // Using one decimal place for precision
      isLoading: false,
    };
  }, [productionRecords, lossRecords]);

  const lossReasonData = useMemo(() => {
    if (!lossRecords) {
      return [];
    }

    const reasonMap = lossRecords.reduce((acc, record) => {
      const reason = record.lossReason || 'Não especificado';
      const time = record.timeLost || 0;
      if (!acc[reason]) {
        acc[reason] = 0;
      }
      acc[reason] += time;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(reasonMap).map(([name, value]) => ({
      name,
      value,
    }));
  }, [lossRecords]);

  const totalLostMinutes = useMemo(() => {
    if (!lossRecords) {
      return 0;
    }
    return lossRecords.reduce((sum, record) => sum + (record.timeLost || 0), 0);
  }, [lossRecords]);

  const totalProductionRecords = productionRecords
    ? productionRecords.length
    : 0;
  const totalLossRecords = lossRecords ? lossRecords.length : 0;

  const isLoading = loadingProduction || loadingLoss || totalHoursData.isLoading;

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
              Horas Totais de Usinagem Restantes
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
                {totalHoursData.remainingHours}h
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Restante de um total de 540 horas.
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
              Total de registros na base de dados.
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
              Total de perdas registradas na base de dados.
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LossReasonPieChart
          data={lossReasonData}
          loading={loadingLoss}
          totalMinutes={totalLostMinutes}
        />
        <MachiningTimeByFactoryChart
          data={productionRecords || []}
          loading={loadingProduction}
        />
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto self-end">
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
    </div>
  );
}
