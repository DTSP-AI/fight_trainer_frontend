'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin';
import { describeApiError } from '@/lib/api';
import type { CSVImportResult } from '@/lib/types';

export function CSVImportForm() {
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CSVImportResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error('Pick a CSV file first.');
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const res = await adminApi.importCSV(file);
      setResult(res);
      toast.success(
        `Imported ${res.fights_created} fights, ${res.techniques_created} annotations.`,
      );
    } catch (err) {
      toast.error(describeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import library CSV</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0">
          <p className="text-sm text-muted-foreground">
            CSV columns:{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              youtube_id, title, event, fighter_a, fighter_b, fight_year, sport,
              duration_seconds, technique_name, timestamp_seconds, fighter,
              confidence, notes
            </code>
          </p>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="csv">CSV file</Label>
              <Input
                id="csv"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Button type="submit" disabled={submitting || !file}>
                <Upload className="h-4 w-4" />
                {submitting ? 'Importing…' : 'Import'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-6 pt-0 text-sm">
            <div>Fights created: {result.fights_created}</div>
            <div>Annotations created: {result.techniques_created}</div>
            {result.errors.length > 0 ? (
              <div>
                <div className="mt-2 font-medium text-destructive">Errors</div>
                <ul className="list-disc pl-5 text-xs text-muted-foreground">
                  {result.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-emerald-400">No row errors.</div>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
