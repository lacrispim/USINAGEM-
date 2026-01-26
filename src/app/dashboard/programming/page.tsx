'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ProgrammingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Programação</h1>
        <p className="text-muted-foreground">
          Gerencie e visualize a fila de programação.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Fila de Programação</CardTitle>
          <CardDescription>
            Aqui você pode ver o status das programações pendentes e em andamento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>Em breve: uma visualização completa da fila de programação.</p>
        </CardContent>
      </Card>
    </div>
  );
}
