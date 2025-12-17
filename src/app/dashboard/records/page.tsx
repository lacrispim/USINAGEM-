'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hourglass, Loader, Package, TriangleAlert, PlusCircle } from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { LossReasonPieChart } from '@/components/charts/loss-reason-pie-chart';
import { MachiningTimeByFactoryChart } from '@/components/charts/machining-time-by-factory-chart';
import { MachiningTimeTrendChart } from '@/components/charts/machining-time-trend-chart';


export default function RecordsPage() {
  const firestore = useFirestore();

  const productionRecordsQuery = firestore ? query(collection(firestore, 'productionRecords')) : null;
  const { data: productionRecords, loading: loadingProduction } = useCollection(productionRecordsQuery);

  const lossRecordsQuery = firestore ? query(collection(firestore, 'lossRecords')) : null;
  const { data: lossRecords, loading: loadingLoss } = useCollection(lossRecordsQuery);

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
      isLoading: false
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

  const totalProductionRecords = productionRecords ? productionRecords.length : 0;
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
                <div className="text-2xl font-bold">{totalHoursData.remainingHours}h</div>
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
        <LossReasonPieChart data={lossReasonData} loading={loadingLoss} totalMinutes={totalLostMinutes} />
        <MachiningTimeByFactoryChart data={productionRecords || []} loading={loadingProduction} />
      </div>
       <div className="grid grid-cols-1 gap-6">
        <MachiningTimeTrendChart data={productionRecords || []} loading={loadingProduction} />
      </div>
    </div>
  );
}
