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
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface PlanoSemanal {
  id: string;
  dataExecucao: any; // Firestore timestamp
  site: string;
  requisicao: string;
  nomeDaPeca: string;
  quantidade: number;
  tecnico: string;
  observacao: string;
  equipamento: string;
}


export default function ProgrammingPage() {
  const firestore = useFirestore();

  const planosQuery = useMemoFirebase(
    () =>
      firestore
        ? query(collection(firestore, 'planoSemanal'), orderBy('dataExecucao', 'asc'))
        : null,
    [firestore]
  );

  const { data: planos, isLoading } = useCollection<PlanoSemanal>(planosQuery);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Plano Semanal</h1>
            <p className="text-muted-foreground">
            Visualize e gerencie o planejamento de produção.
            </p>
        </div>
        <Button disabled>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Item (Em breve)
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Planejamento de Produção</CardTitle>
          <CardDescription>
            Lista de todas as tarefas de produção agendadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Execução</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead># Requisição</TableHead>
                  <TableHead>Nome da Peça</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Técnicos</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead>Equipamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex justify-center items-center">
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                        Carregando planejamento...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !planos || planos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Nenhum item de planejamento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  planos.map((plano) => (
                    <TableRow key={plano.id}>
                      <TableCell>
                        {plano.dataExecucao?.toDate ? format(plano.dataExecucao.toDate(), 'dd/MM/yyyy') : ''}
                      </TableCell>
                      <TableCell>{plano.site}</TableCell>
                      <TableCell>{plano.requisicao}</TableCell>
                      <TableCell className="font-medium">{plano.nomeDaPeca}</TableCell>
                      <TableCell>{plano.quantidade}</TableCell>
                      <TableCell>{plano.tecnico}</TableCell>
                      <TableCell>{plano.observacao}</TableCell>
                      <TableCell>{plano.equipamento}</TableCell>
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
