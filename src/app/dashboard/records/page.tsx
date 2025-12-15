'use client';

import { useFirestore, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import React, { useState, useMemo } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ptBR } from 'date-fns/locale';

export default function RecordsPage() {
  const firestore = useFirestore();
  const productionRecordsQuery = firestore
    ? query(collection(firestore, 'productionRecords'), orderBy('createdAt', 'desc'))
    : null;
  const { data: productionRecords, loading } =
    useCollection(productionRecordsQuery);

  const [operatorFilter, setOperatorFilter] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();

  const operators = useMemo(() => {
    if (!productionRecords) return [];
    return [
      ...new Set(productionRecords.map((record: any) => record.operatorId).filter(Boolean)),
    ] as string[];
  }, [productionRecords]);

  const factories = useMemo(() => {
    if (!productionRecords) return [];
    return [
      ...new Set(productionRecords.map((record: any) => record.factory).filter(Boolean)),
    ] as string[];
  }, [productionRecords]);

  const filteredRecords = useMemo(() => {
    if (!productionRecords) return [];
    return productionRecords.filter((record: any) => {
      const operatorMatch =
        !operatorFilter || record.operatorId === operatorFilter;
      const factoryMatch = !factoryFilter || record.factory === factoryFilter;
      const dateMatch =
        !dateFilter ||
        (record.date?.toDate &&
          format(record.date.toDate(), 'yyyy-MM-dd') ===
            format(dateFilter, 'yyyy-MM-dd'));
      return operatorMatch && factoryMatch && dateMatch;
    });
  }, [productionRecords, operatorFilter, factoryFilter, dateFilter]);
    
  const clearFilters = () => {
    setOperatorFilter('');
    setFactoryFilter('');
    setDateFilter(undefined);
  };

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
            Showing {filteredRecords?.length || 0} of {productionRecords?.length || 0} records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <Select value={operatorFilter} onValueChange={setOperatorFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por Operador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos Operadores</SelectItem>
                {operators.map((operator) => (
                  <SelectItem key={operator} value={operator}>
                    {operator}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={factoryFilter} onValueChange={setFactoryFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por Fábrica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas Fábricas</SelectItem>
                {factories.map((factory) => (
                  <SelectItem key={factory} value={factory}>
                    {factory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-full justify-start text-left font-normal md:w-[240px]',
                    !dateFilter && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFilter ? (
                    format(dateFilter, 'PPP', { locale: ptBR })
                  ) : (
                    <span>Filtrar por data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Button variant="ghost" onClick={clearFilters} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Limpar Filtros
            </Button>
          </div>

          <div className="overflow-x-auto">
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
                ) : filteredRecords && filteredRecords.length > 0 ? (
                  filteredRecords.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.operatorId}</TableCell>
                      <TableCell>
                        {record.date?.toDate
                          ? format(record.date.toDate(), 'dd/MM/yyyy')
                          : record.date}
                      </TableCell>
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
                        {record.createdAt
                          ? format(
                              record.createdAt.toDate(),
                              'dd/MM/yyyy, HH:mm:ss'
                            )
                          : ''}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
