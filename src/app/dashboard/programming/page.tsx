'use client';

import React from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';

// This is a type based on the new backend.json entity
interface MachineSchedule {
  id: string;
  machineName: string;
  monday: string[];
  tuesday: string[];
  wednesday: string[];
  thursday: string[];
  friday: string[];
  saturday: string[];
  sunday: string[];
}

const daysOfWeek = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
] as const;


export default function ProgrammingPage() {
  const firestore = useFirestore();

  const schedulesQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'machineSchedules'), orderBy('machineName'))
        : null,
    [firestore]
  );

  const { data: schedules, isLoading } = useCollection<MachineSchedule>(schedulesQuery);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Programação de Máquinas</h1>
            <p className="text-muted-foreground">
            Visualize a programação semanal das máquinas.
            </p>
        </div>
        <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Programação (Em breve)
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Programação Semanal</CardTitle>
          <CardDescription>
            Requisições de peças agendadas para cada máquina durante a semana.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Máquina</TableHead>
                  {daysOfWeek.map(day => (
                    <TableHead key={day.key} className="min-w-[150px]">{day.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={daysOfWeek.length + 1} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Carregando programação...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !schedules || schedules.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={daysOfWeek.length + 1} className="h-24 text-center">
                      Nenhuma programação encontrada. Clique em "Adicionar Programação" para começar.
                    </TableCell>
                  </TableRow>
                ) : (
                  schedules.map((schedule) => (
                    <TableRow key={schedule.id}>
                      <TableCell className="font-medium">{schedule.machineName}</TableCell>
                      {daysOfWeek.map(day => (
                        <TableCell key={day.key}>
                            <div className="flex flex-wrap gap-1">
                                {(schedule[day.key] || []).map((reqNumber) => (
                                <Badge key={reqNumber} variant="secondary">
                                    {reqNumber}
                                </Badge>
                                ))}
                            </div>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
