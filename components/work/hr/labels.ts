import type { HrDocument, HrProfile } from "@/types/work/domain";

export const CONTRACT_LABEL: Record<HrProfile["contractType"], string> = {
  indefinite: "Término indefinido",
  fixed: "Término fijo",
  work: "Obra o labor",
  services: "Prestación de servicios",
  apprentice: "Aprendizaje (SENA)",
  freelance: "Freelance",
};

export const PERIOD_LABEL: Record<HrProfile["salaryPeriod"], string> = {
  monthly: "mensual",
  hourly: "por hora",
  project: "por proyecto",
};

export const DOC_LABEL: Record<HrDocument["category"], string> = {
  contract: "Contrato",
  id: "Documento de identidad",
  certificate: "Certificado",
  social_security: "Seguridad social",
  payroll: "Nómina / pagos",
  other: "Otro",
};

export const money = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
