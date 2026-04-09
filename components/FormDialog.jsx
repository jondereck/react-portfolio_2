import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function FormDialog({ resource, formState, setFormState, editingId, saving, onSubmit, onReset }) {
  const { fields, key, title } = resource;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>{editingId ? `Edit ${title}` : `Add ${title}`}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editingId ? `Update ${title}` : `Create ${title}`}</DialogTitle>
          <DialogDescription>Fill the form and save. Required fields are validated by API schema.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            if (field.type === 'checkbox') {
              return (
                <div
                  key={field.name}
                  className="md:col-span-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{field.label}</p>
                    {field.helper ? <p className="text-xs text-slate-500 dark:text-slate-400">{field.helper}</p> : null}
                  </div>
                  <Switch
                    id={`${key}-${field.name}`}
                    checked={Boolean(formState[field.name])}
                    onCheckedChange={(checked) => setFormState((prev) => ({ ...prev, [field.name]: checked }))}
                  />
                </div>
              );
            }

            const isTextArea = field.type === 'textarea';
            return (
              <label
                key={field.name}
                className={`flex flex-col space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 ${isTextArea ? 'md:col-span-2' : ''}`}
              >
                {field.label}
                {isTextArea ? (
                  <Textarea
                    name={field.name}
                    value={formState[field.name] ?? ''}
                    onChange={(event) => setFormState((prev) => ({ ...prev, [field.name]: event.target.value }))}
                    placeholder={field.placeholder}
                    rows={field.rows || 3}
                    required={field.required !== false}
                  />
                ) : (
                  <Input
                    type={field.type}
                    name={field.name}
                    value={formState[field.name] ?? ''}
                    onChange={(event) => setFormState((prev) => ({ ...prev, [field.name]: event.target.value }))}
                    placeholder={field.placeholder}
                    required={field.required !== false}
                  />
                )}
              </label>
            );
          })}

          <div className="md:col-span-2 flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Create Entry'}
            </Button>
            {editingId ? (
              <Button type="button" variant="ghost" onClick={onReset} disabled={saving}>
                Cancel
              </Button>
            ) : null}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
