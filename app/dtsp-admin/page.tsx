import Link from 'next/link';
import { Library, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminOverviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">DTSP Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-tenant operations. The library is shared infrastructure —
          handle with care.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Library className="h-5 w-5 text-primary" />
              Library taxonomy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The technique tree the pipeline matches against. Edit with
              intent — every change ripples to every gym.
            </p>
            <Button asChild>
              <Link href="/dtsp-admin/library">Open library</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-primary" />
              CSV import
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Bulk-import techniques and fight studies. Validation runs
              before insert; errors surface line-by-line.
            </p>
            <Button asChild variant="outline">
              <Link href="/dtsp-admin/import">Import CSV</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
