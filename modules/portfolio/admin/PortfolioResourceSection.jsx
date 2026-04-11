'use client';

import DataTable from '@/components/DataTable';
import FormDialog from '@/components/FormDialog';
import { useAdminData } from '@/hooks/useAdminData';
import AdminSectionHeader from '@/components/admin/shared/AdminSectionHeader';

const cardStyles = 'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

export default function PortfolioResourceSection({ resource }) {
  const { title, key, fields, listColumns } = resource;
  const {
    items,
    loading,
    saving,
    deletingId,
    editingId,
    editingItem,
    dialogOpen,
    formState,
    setFormState,
    loadItems,
    setDialogOpen,
    openCreate,
    openEdit,
    resetForm,
    handleSubmit,
    handleDelete,
    error,
  } = useAdminData({
    endpoint: resource.endpoint,
    title,
    fields,
  });

  const updateField = (fieldName, value) => {
    setFormState((previous) => ({ ...previous, [fieldName]: value }));
  };

  return (
    <section className={cardStyles}>
      <AdminSectionHeader
        title={title}
        description={`Manage ${title.toLowerCase()} entries, publish state, and metadata.`}
        actions={(
          <>
            <button
              type="button"
              className="h-8 rounded-md px-3 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={loadItems}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              className="h-8 rounded-md bg-slate-900 px-3 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
              onClick={openCreate}
            >
              Add {title}
            </button>
            <FormDialog
              title={title}
              resourceKey={key}
              fields={fields}
              formState={formState}
              editingId={editingId}
              editingItem={editingItem}
              saving={saving}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
              onChange={updateField}
              onSubmit={handleSubmit}
              onReset={resetForm}
            />
          </>
        )}
      />
      <div className="p-6">
        {error ? <div className="mb-4 rounded bg-red-100 p-3 text-red-700">{error}</div> : null}
        <DataTable
          title={title}
          listColumns={listColumns}
          items={items}
          loading={loading}
          deletingId={deletingId}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      </div>
    </section>
  );
}
