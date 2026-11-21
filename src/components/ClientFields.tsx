import type { Client } from "@/lib/types";

/** Champs du formulaire client (création et modification). */
export function ClientFields({ client }: { client?: Partial<Client> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="name">Nom / raison sociale *</label>
        <input id="name" name="name" required defaultValue={client?.name} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="email">Email de facturation *</label>
        <input id="email" name="email" type="email" required defaultValue={client?.email} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Téléphone</label>
        <input id="phone" name="phone" type="tel" defaultValue={client?.phone ?? ""} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="address">Adresse postale</label>
        <input id="address" name="address" defaultValue={client?.address ?? ""} className="input" placeholder="Utilisée dans la mise en demeure" />
      </div>
    </div>
  );
}
