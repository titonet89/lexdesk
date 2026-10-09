"use server";

import { getMemberSession } from "@/lib/auth/session";
import { practiceAreaLabels } from "@/lib/panel/labels";
import { sanitizeSearch } from "@/lib/panel/schemas";
import { createClient } from "@/lib/supabase/server";

export interface SearchResult {
  id: string;
  title: string;
  detail: string;
  href: string;
}

export interface SearchResults {
  matters: SearchResult[];
  clients: SearchResult[];
}

const EMPTY: SearchResults = { matters: [], clients: [] };

/**
 * Búsqueda global del panel (paleta de comandos).
 * Todas las consultas pasan por RLS: la titular busca en su estudio activo y un
 * colaborador solo encuentra los expedientes que le compartieron.
 */
export async function searchPanelAction(rawQuery: string): Promise<SearchResults> {
  const session = await getMemberSession();
  if (!session) return EMPTY;
  const query = sanitizeSearch(rawQuery);
  if (query.length < 2) return EMPTY;

  const supabase = await createClient();
  const isTitular = session.active.role === "titular";
  const organizationId = session.active.organizationId;

  let mattersRequest = supabase
    .from("matters")
    .select("id, title, file_number, area, organization_id")
    .or(`title.ilike.%${query}%,file_number.ilike.%${query}%`)
    .order("updated_at", { ascending: false })
    .limit(6);
  if (isTitular) mattersRequest = mattersRequest.eq("organization_id", organizationId);

  const [{ data: matters }, clientsResult] = await Promise.all([
    mattersRequest,
    isTitular
      ? supabase
          .from("clients")
          .select("id, full_name, document_type, document_number, locality")
          .eq("organization_id", organizationId)
          .or(`full_name.ilike.%${query}%,document_number.ilike.%${query}%`)
          .order("full_name")
          .limit(6)
      : Promise.resolve({ data: null }),
  ]);

  return {
    matters: (matters ?? []).map((matter) => ({
      id: matter.id,
      title: matter.title,
      detail: [practiceAreaLabels[matter.area], matter.file_number ? `Expte. ${matter.file_number}` : null]
        .filter(Boolean)
        .join(" · "),
      href: `/panel/expedientes/${matter.id}`,
    })),
    clients: (clientsResult.data ?? []).map((client) => ({
      id: client.id,
      title: client.full_name,
      detail: [client.document_number ? `${client.document_type ?? "Doc."} ${client.document_number}` : null, client.locality]
        .filter(Boolean)
        .join(" · "),
      href: `/panel/clientes/${client.id}`,
    })),
  };
}
