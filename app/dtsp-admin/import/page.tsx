import { CSVImportForm } from '@/components/dtsp-admin/csv-import-form';

export default function AdminImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">CSV import</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Bulk operations on the library. Dry-run first.
        </p>
      </div>
      <CSVImportForm />
    </div>
  );
}
