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
import { getWeek, getYear, getMonth, format } from 'date-fns';
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
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

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

  const { availableYears, availableMonths, filteredProductionRecords } = useMemo(() => {
    if (!productionRecords) {
      return { availableYears: [], availableMonths: [], filteredProductionRecords: [] };
    }

    const years = new Set<number>();
    const months = new Set<number>();

    productionRecords.forEach((record) => {
      if (record.date?.toDate) {
        const recordDate = record.date.toDate();
        years.add(getYear(recordDate));
        if (selectedYear === 'all' || getYear(recordDate) === parseInt(selectedYear, 10)) {
            months.add(getMonth(recordDate));
        }
      }
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    const sortedMonths = Array.from(months).sort((a, b) => a - b);
    
    const filtered = productionRecords.filter((record) => {
        if (!record.date?.toDate) return false;
        const recordDate = record.date.toDate();
        const yearMatch = selectedYear === 'all' || getYear(recordDate) === parseInt(selectedYear, 10);
        const monthMatch = selectedMonth === 'all' || getMonth(recordDate) === parseInt(selectedMonth, 10);
        return yearMatch && monthMatch;
    });

    return { availableYears: sortedYears, availableMonths: sortedMonths, filteredProductionRecords: filtered };
  }, [productionRecords, selectedYear, selectedMonth]);

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
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>
                Tendência do Tempo de Usinagem por Fábrica
              </CardTitle>
              <CardDescription>
                Tempo de usinagem (em minutos) por dia para cada fábrica.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
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
                    <Label htmlFor="month-filter">Mês</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === 'all'}>
                        <SelectTrigger id="month-filter">
                        <SelectValue placeholder="Selecione o mês" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="all">Todos os Meses</SelectItem>
                        {availableMonths.map((month) => (
                            <SelectItem key={month} value={String(month)}>
                                {format(new Date(2000, month), 'MMMM', { locale: ptBR })}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MachiningTimeTrendChart
            data={filteredProductionRecords}
            loading={loadingProduction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
