'use client';

import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { MachiningRecord } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function RecordsPage() {
  const firestore = useFirestore();
  const productionRecordsQuery = firestore ? query(collection(firestore, 'productionRecords'), orderBy('createdAt', 'desc')) : null;
  const { data: productionRecords, loading } = useCollection(productionRecordsQuery);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Machining Records</h1>
        <p className="text-muted-foreground">
          A complete history of all recorded machining operations.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Records</CardTitle>
          <CardDescription>
            Showing all {productionRecords?.length || 0} records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Operador</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Fábrica</TableHead>
                <TableHead>Atividade</TableHead>
                <TableHead>Máquina</TableHead>
                <TableHead>Nº Forms</TableHead>
                <TableHead>Nº Operações</TableHead>
                <TableHead>Produzido</TableHead>
                <TableHead>Tempo de Usinagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Observações</TableHead>
                <TableHead>Registrado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center h-24">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : productionRecords && productionRecords.length > 0 ? (
                productionRecords.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.operatorId}</TableCell>
                    <TableCell>{record.date?.toDate ? format(record.date.toDate(), 'dd/MM/yyyy') : record.date}</TableCell>
                    <TableCell>{record.factory}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{record.activityType}</Badge>
                    </TableCell>
                    <TableCell>{record.machine}</TableCell>
                    <TableCell>{record.formsNumber}</TableCell>
                    <TableCell>{record.operationsNumber}</TableCell>
                    <TableCell>{record.quantityProduced}</TableCell>
                    <TableCell>{record.machiningTime} min</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{record.status}</Badge>
                    </TableCell>
                    <TableCell>{record.observations}</TableCell>
                    <TableCell>
                      {record.createdAt ? format(record.createdAt.toDate(), 'dd/MM/yyyy, HH:mm:ss') : ''}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="text-center h-24">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
