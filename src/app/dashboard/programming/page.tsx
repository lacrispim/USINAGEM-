'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlanejamentoItem {
  id: string;
  'Data Execução'?: string;
  Site?: string;
  Requisição?: string;
  'Nome da Peça'?: string;
  Quantidade?: number;
  'Horas Máquina'?: number;
  Técnicos?: string;
  Observação?: string;
  EQUIPAMENTO?: string;
}

export default function ProgrammingPage() {
  const database = useDatabase();
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      setError('Conexão com o banco de dados não disponível.');
      return;
    }

    const dbRef = ref(database, '/Planejamento S');
    setLoading(true);

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const dataArray: PlanejamentoItem[] = Object.keys(data).map(
            (key) => ({
              id: key,
              ...data[key],
            })
          );
          setPlanejamentoData(dataArray);
        } else {
          setPlanejamentoData([]);
        }
        setLoading(false);
        setError(null);
      },
      (dbError) => {
        console.error(dbError);
        setError('Falha ao buscar os dados do Realtime Database.');
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [database]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      // First, try to parse the date assuming a 'dd/MM/yyyy' format.
      const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
      if (!isNaN(parsedDate.getTime())) {
        return format(parsedDate, 'dd/MM/yyyy', { locale: ptBR });
      }

      // As a fallback, try letting new Date() parse it, which handles ISO 8601 and other formats.
      const fallbackDate = new Date(dateString);
      if (!isNaN(fallbackDate.getTime())) {
        return format(fallbackDate, 'dd/MM/yyyy', { locale: ptBR });
      }

      // If all parsing fails, return the original string.
      return dateString;
    } catch {
      return dateString; // Return original string if any error occurs during formatting
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Programação</h1>
        <p className="text-muted-foreground">
          Visualizando os dados do seu Realtime Database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planejamento de Produção</CardTitle>
          <CardDescription>
            Abaixo estão os itens de planejamento encontrados em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex h-64 items-center justify-center gap-2">
              <Loader className="h-8 w-8 animate-spin" />
              <span>Carregando dados...</span>
            </div>
          )}
          {error && (
            <p className="flex h-64 items-center justify-center text-destructive">
              {error}
            </p>
          )}
          {!loading &&
            !error &&
            (planejamentoData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Execução</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Requisição</TableHead>
                    <TableHead>Nome da Peça</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Horas Máquina</TableHead>
                    <TableHead>Técnicos</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Equipamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planejamentoData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{formatDate(item['Data Execução'])}</TableCell>
                      <TableCell>{item['Site'] ?? 'N/A'}</TableCell>
                      <TableCell>{item['Requisição'] ?? 'N/A'}</TableCell>
                      <TableCell>{item['Nome da Peça'] ?? 'N/A'}</TableCell>
                      <TableCell>{item['Quantidade'] ?? 'N/A'}</TableCell>
                      <TableCell>{item['Horas Máquina'] ?? 'N/A'}</TableCell>
                      <TableCell>{item['Técnicos'] ?? 'N/A'}</TableCell>
                      <TableCell>{item['Observação'] ?? 'N/A'}</TableCell>
                      <TableCell>{item['EQUIPAMENTO'] ?? 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="flex h-64 items-center justify-center text-center text-muted-foreground">
                Nenhum dado encontrado no nó "Planejamento S".
              </p>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
