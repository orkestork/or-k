export const CRM_STAGES = { nuevo: "Nuevo lead", contactado: "Contactado", propuesta: "Propuesta", negociacion: "Negociación", ganado: "Ganado", perdido: "Desierto" } as const;
export type CrmStage = keyof typeof CRM_STAGES;
export type CrmRecord = {
  id: string; company: string; contact: string; email: string; phone: string;
  stage: CrmStage; owner_id: string | null;
  value: number; follow_up: string | null; notes: string; updated_at: string;
};
