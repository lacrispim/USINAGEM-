import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Hourglass } from 'lucide-react';

export default function RecordsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Supervisor</h1>
        <p className="text-muted-foreground">
          Uma visão geral dos dados de produção.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Horas Totais de Usinagem
            </CardTitle>
            <Hourglass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">540h</div>
            <p className="text-xs text-muted-foreground">
              Total de horas registradas
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
