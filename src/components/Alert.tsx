/** Message d'information ou d'erreur (lu depuis les paramètres d'URL ?erreur= / ?succes=). */
export function Alert({ type, children }: { type: "error" | "success" | "info"; children: React.ReactNode }) {
  const styles = {
    error: "border-red-200 bg-red-50 text-red-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    info: "border-brand-100 bg-brand-50 text-brand-700",
  }[type];
  return <div className={`mb-4 rounded-md border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

export function FlashMessages({ searchParams }: { searchParams: { erreur?: string; succes?: string } }) {
  return (
    <>
      {searchParams.erreur && <Alert type="error">{searchParams.erreur}</Alert>}
      {searchParams.succes && <Alert type="success">{searchParams.succes}</Alert>}
    </>
  );
}
