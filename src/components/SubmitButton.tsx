"use client";
import { useFormStatus } from "react-dom";

/** Bouton d'envoi de formulaire qui se désactive pendant le traitement. */
export function SubmitButton({
  children,
  pendingText = "Enregistrement…",
  className = "btn-primary",
  confirm,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingText : children}
    </button>
  );
}
