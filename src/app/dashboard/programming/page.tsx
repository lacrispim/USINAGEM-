'use client';

import { useEffect, useState } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from 'lucide-react';

export default function ProgrammingPage() {
  const database = useDatabase();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!database) {
      setLoading(false);
      setError("Conexão com o banco de dados não disponível.");
      return;
    }

    const dbRef = ref(database, '/'); // Reference to the root of the database
    setLoading(true);

    const unsubscribe = onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.val());
      } else {
        setData(null);
      }
      setLoading(false);
      setError(null);
    }, (dbError) => {
      console.error(dbError);
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
          Visualizando todos os nós do seu Realtime Database.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visualizador de Nós do Realtime Database</CardTitle>
          <CardDescription>
            Abaixo estão todos os dados encontrados na raiz do seu projeto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center gap-2">
              <Loader className="animate-spin h-5 w-5" />
              <span>Carregando dados...</span>
            </div>
          )}
          {error && <p className="text-destructive">{error}</p>}
          {!loading && !error && (
            data ? (
              <pre className="p-4 bg-muted rounded-md overflow-x-auto text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            ) : (
               <p>Nenhum dado encontrado na raiz do banco de dados.</p>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
