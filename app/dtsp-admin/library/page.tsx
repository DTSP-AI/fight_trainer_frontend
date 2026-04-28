import { TaxonomyTree } from '@/components/dtsp-admin/taxonomy-tree';

export default function AdminLibraryPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Library taxonomy
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The vocabulary every gym uses. Edits are global.
        </p>
      </div>
      <TaxonomyTree />
    </div>
  );
}
