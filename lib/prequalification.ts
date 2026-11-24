export type PrequalificationAnswers = {
  company: string;
  legalName: string;
  taxId: string;
  location: string;
  linkedin: string;
  contact: string;
  email: string;
  whatsapp: string;
  source: string;
  years: string;
  website: string;
  channels: string[];
  revenue: string;
  employees: string;
  payroll: string;
  tools: string[];
  challenge: string[];
  urgency: string;
  leadership: string;
  investment: string;
};

export function scorePrequalification(a:PrequalificationAnswers) {
  const revenue = ["$300M–$499M COP", "$500M–$1.499M COP", "$1.500M COP–USD 999.999", "Más de USD 1 millón"].indexOf(a.revenue)+1;
  const size = ["1–20", "21–50", "51–100", "101–250", "Más de 250"].indexOf(a.employees)+1;
  const years = ["Menos de 2", "2 a 5", "6 a 10", "Más de 10 años"].indexOf(a.years)+1;
  const urgency = ["Estamos explorando", "Sí, este año", "Sí, próximos 3 meses", "Sí, es prioridad inmediata"].indexOf(a.urgency)+1;
  const leadership = {"Sí":4,"Parcialmente":3,"Aún no está definido":1,"No":0}[a.leadership] ?? 0;
  const investment = {"Sí":4,"Depende del proyecto":3,"Debemos estructurar presupuesto":2,"Prefiero conversarlo":2,"Actualmente no":0}[a.investment] ?? 0;
  const maturity = Math.min(4,a.tools.filter(tool=>tool!=="Ninguna").length);
  const total = Math.min(100,Math.round(((Math.max(0,revenue)*2 + Math.max(0,size) + Math.max(0,years) + maturity + Math.max(0,urgency)*2 + leadership*2 + investment*2) / 45) * 100));
  const compatibility = total>=72?"Alta":total>=46?"Potencial":"Todavía no es el momento";
  const companyClass = size>=4 || revenue>=4?"O R-K Enterprise":size>=2 || revenue>=2?"O R-K Scale":"O R-K Growth";
  const positives = [
    urgency>=3?"Existe una decisión cercana y una urgencia clara para avanzar.":"",
    leadership>=3?"La alta dirección muestra disposición para participar.":"",
    investment>=3?"Hay capacidad inicial para implementar cambios.":"",
    maturity>=3?"La empresa ya opera con una base tecnológica relevante.":"",
    size>=3?"La complejidad organizacional justifica una transformación estructurada.":"",
  ].filter(Boolean).slice(0,3);
  const gaps = [
    urgency<3?"Definir una ventana concreta para iniciar la transformación.":"",
    leadership<3?"Alinear la participación de la alta dirección.":"",
    investment<3?"Clarificar la capacidad de inversión e implementación.":"",
    maturity<2?"Comprender mejor la madurez tecnológica y operativa actual.":"",
  ].filter(Boolean).slice(0,3);
  return {total,compatibility,companyClass,positives,gaps};
}

export function isPrequalificationAnswers(value:unknown):value is PrequalificationAnswers {
  if(!value || typeof value!=="object") return false;
  const a=value as Record<string,unknown>;
  const strings=["company","legalName","location","contact","email","whatsapp","source","years","revenue","employees","payroll","urgency","leadership","investment"];
  return strings.every(key=>typeof a[key]==="string"&&a[key]!=="") && /^\+?[\d\s()-]{7,20}$/.test(a.whatsapp as string) && typeof a.taxId==="string" && typeof a.website==="string" && typeof a.linkedin==="string" && Array.isArray(a.channels) && Array.isArray(a.tools) && Array.isArray(a.challenge) && a.challenge.length>0;
}
