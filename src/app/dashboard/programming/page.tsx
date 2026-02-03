'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CalendarIcon, Loader, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format, parse, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

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
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

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
  
  const filteredData = useMemo(() => {
    if (!planejamentoData) return [];
    if (!selectedDate) {
      return planejamentoData;
    }
    
    return planejamentoData.filter(item => {
      const dateString = item['Data Execução'];
      if (!dateString) return false;

      let recordDate;
      try {
        recordDate = parse(dateString, 'dd/MM/yyyy', new Date());
        if (isNaN(recordDate.getTime())) {
          recordDate = new Date(dateString);
        }
      } catch (e) {
        return false;
      }

      if (isNaN(recordDate.getTime())) {
        return false;
      }

      return recordDate >= startOfDay(selectedDate) && recordDate <= endOfDay(selectedDate);
    });
  }, [planejamentoData, selectedDate]);


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

       <div className="flex flex-col sm:flex-row justify-start gap-4">
        <div className="grid w-full sm:max-w-xs gap-1.5 relative">
          <Label htmlFor="date-filter">Filtrar por Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date-filter"
                variant={"outline"}
                className={cn(
                  "justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd/MM/yyyy") : <span>Selecione uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
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
            (filteredData.length > 0 ? (
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
                  {filteredData.map((item) => (
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
                {selectedDate ? "Nenhum dado encontrado para a data selecionada." : 'Nenhum dado encontrado no nó "Planejamento S".'}
              </p>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
