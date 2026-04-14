export default function FieldErrorText({ error }) {
  if (!error) {
    return null;
  }

  return <p className="mt-1 text-sm text-rose-500">{error}</p>;
}
