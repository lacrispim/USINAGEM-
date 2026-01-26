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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Define a type for a single planning item
interface PlanejamentoItem {
  id: string;
  EQUIPAMENTO: string;
  'NOME DA PEÇA': string;
  OBSERVAÇÃO: string;
  REQUISIÇÃO: string;
  STATUS: string;
  TÉCNICO: string;
}

export default function ProgrammingPage() {
  const database = useDatabase();
  const [planejamentoData, setPlanejamentoData] = useState<PlanejamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      setError('Conexão com o banco de dados não disponível.');
      return;
    }

    const dbRef = ref(database, '/Planejamento S'); // Reference to the "Planejamento S" node
    setLoading(true);

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          // Transform the object of objects into an array of objects
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

  const statusColorMap: { [key: string]: string } = {
    AGUARDANDO: 'bg-yellow-500 hover:bg-yellow-500/80',
    'EM ANDAMENTO': 'bg-blue-500 hover:bg-blue-500/80',
    CONCLUÍDO: 'bg-green-500 hover:bg-green-500/80',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Programação</h1>
        <p className="text-muted-foreground">
          Visualizando os dados do nó "Planejamento S" do seu Realtime Database.
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
          {!loading && !error &&
            (planejamentoData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisição</TableHead>
                    <TableHead>Nome da Peça</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Observação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planejamentoData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item['REQUISIÇÃO']}
                      </TableCell>
                      <TableCell>{item['NOME DA PEÇA']}</TableCell>
                      <TableCell>{item.EQUIPAMENTO}</TableCell>
                      <TableCell>{item['TÉCNICO']}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'text-white',
                            statusColorMap[item.STATUS] || 'bg-gray-500'
                          )}
                        >
                          {item.STATUS}
                        </Badge>
                      </TableCell>
                      <TableCell>{item['OBSERVAÇÃO']}</TableCell>
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
