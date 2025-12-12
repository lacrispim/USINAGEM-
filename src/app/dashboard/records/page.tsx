import { machiningRecords } from '@/lib/data';
import type { MachiningRecord } from '@/lib/types';
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

export default function RecordsPage() {
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
            Showing all {machiningRecords.length} records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead className="text-right">Speed (m/min)</TableHead>
                <TableHead className="text-right">Feed (mm/rev)</TableHead>
                <TableHead className="text-right">Finish (Ra)</TableHead>
                <TableHead className="text-right">Wear (mm)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machiningRecords
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((record: MachiningRecord) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(new Date(record.timestamp), 'PP')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{record.material}</Badge>
                  </TableCell>
                  <TableCell>{record.tool}</TableCell>
                  <TableCell className="text-right">{record.cuttingSpeed}</TableCell>
                  <TableCell className="text-right">{record.feedRate}</TableCell>
                  <TableCell className="text-right">{record.surfaceFinish}</TableCell>
                  <TableCell className="text-right">{record.toolWear}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
