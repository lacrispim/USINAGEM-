'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Based on the PlanoSemanal entity
interface PlanoSemanalItem {
  id: string; // The key from Realtime Database
  dataExecucao?: string;
  site?: string;
  requisicao?: string;
  nomeDaPeca?: string;
  quantidade?: number;
  tecnico?: string;
  observacao?: string;
  equipamento?: string;
}

export default function ProgrammingPage() {
  const database = useDatabase();
  const [data, setData] = useState<PlanoSemanalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      setError("Conexão com o banco de dados não disponível.");
      return;
    }

    const planningRef = ref(database, 'Planejamento S');
    setLoading(true);

    const unsubscribe = onValue(planningRef, (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        const formattedData: PlanoSemanalItem[] = Object.keys(rawData).map(key => ({
          id: key,
          ...rawData[key],
        }));
        setData(formattedData);
      } else {
        setData([]);
      }
      setLoading(false);
      setError(null);
    }, (error) => {
      console.error(error);
      setError("Falha ao buscar os dados do Realtime Database.");
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [database]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Programação</h1>
        <p className="text-muted-foreground">
          Visualizando o planejamento de produção diretamente do Realtime Database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planejamento de Produção</CardTitle>
          <CardDescription>
            Dados carregados do nó &quot;Planejamento S&quot;.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p>Carregando dados...</p>}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requisição</TableHead>
                  <TableHead>Nome da Peça</TableHead>
                  <TableHead>Data de Execução</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length > 0 ? (
                  data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.requisicao || '-'}</TableCell>
                      <TableCell>{item.nomeDaPeca || '-'}</TableCell>
                      <TableCell>{item.dataExecucao ? new Date(item.dataExecucao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}</TableCell>
                      <TableCell>{item.site || '-'}</TableCell>
                      <TableCell>{item.tecnico || '-'}</TableCell>
                      <TableCell>{item.equipamento || '-'}</TableCell>
                      <TableCell>{item.quantidade || '-'}</TableCell>
                      <TableCell>{item.observacao || '-'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Nenhum dado encontrado no nó &quot;Planejamento S&quot;.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
