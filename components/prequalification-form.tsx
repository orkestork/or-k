"use client";

import { useEffect, useMemo, useState } from "react";
import { PrequalificationAnswers as Answers, scorePrequalification } from "@/lib/prequalification";

const initialAnswers: Answers = {
  company:"", legalName:"", taxId:"", location:"", linkedin:"", contact:"", email:"", whatsapp:"", source:"", years:"", website:"", channels:[],
  revenue:"", employees:"", payroll:"", tools:[], challenge:[], urgency:"", leadership:"", investment:"",
};

const steps = ["Tu empresa", "Escala", "Madurez", "Preparación"];

const options = {
  source:["Referido", "Redes sociales", "Google", "Evento", "Cliente o aliado", "Otro"],
  years:["Menos de 2", "2 a 5", "6 a 10", "Más de 10 años"],
  channels:["Instagram", "Facebook", "LinkedIn", "TikTok", "YouTube", "Otras", "Ninguna"],
  revenue:["$300M–$499M COP", "$500M–$1.499M COP", "$1.500M COP–USD 999.999", "Más de USD 1 millón", "Prefiero conversarlo"],
  employees:["1–20", "21–50", "51–100", "101–250", "Más de 250"],
  payroll:["Menos de $50M", "$50M–$99M", "$100M–$199M", "$200M–$399M", "Más de $400M", "Prefiero conversarlo"],
  tools:["ERP", "CRM", "E-commerce", "Marketplace", "Automatizaciones", "IA", "BI / Dashboards", "Desarrollo a la medida", "Ninguna"],
  challenge:["Aumentar ventas", "Organizar procesos", "Automatizar", "Implementar tecnología", "Mejorar marketing", "Integrar áreas", "Reducir dependencia de personas", "Escalar"],
  urgency:["Estamos explorando", "Sí, este año", "Sí, próximos 3 meses", "Sí, es prioridad inmediata"],
  leadership:["Sí", "Parcialmente", "Aún no está definido", "No"],
  investment:["Sí", "Depende del proyecto", "Debemos estructurar presupuesto", "Actualmente no", "Prefiero conversarlo"],
};

function Choice({name, value, selected, onSelect}:{name:string;value:string;selected:boolean;onSelect:()=>void}) {
  return <button className={`prequalChoice${selected?" isSelected":""}`} type="button" role="radio" aria-checked={selected} onClick={onSelect}><i>{selected?"✓":""}</i><span>{value}</span></button>;
}

function ChoiceGroup({name, values, selected, onSelect, multiple=false}:{name:string;values:string[];selected:string|string[];onSelect:(value:string)=>void;multiple?:boolean}) {
  return <div className="prequalChoices" role={multiple?"group":"radiogroup"} aria-label={name}>{values.map(value=><Choice key={value} name={name} value={value} selected={Array.isArray(selected)?selected.includes(value):selected===value} onSelect={()=>onSelect(value)}/>)}</div>;
}

export default function PrequalificationForm({onClose}:{onClose:()=>void}) {
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState<Answers>(initialAnswers);
  const [complete,setComplete]=useState(false);
  const [delivery,setDelivery]=useState<"idle"|"sending"|"sent"|"error">("idle");
  const result=useMemo(()=>scorePrequalification(answers),[answers]);
  useEffect(()=>{document.querySelector<HTMLElement>(".prequalPanel")?.scrollTo({top:0,behavior:"smooth"});},[step,complete]);
  const set=(key:keyof Answers,value:string|string[])=>setAnswers(current=>({...current,[key]:value}));
  const toggle=(key:"channels"|"tools"|"challenge",value:string)=>setAnswers(current=>{
    const clean=value==="Ninguna"?[]:current[key].filter(item=>item!=="Ninguna");
    return {...current,[key]:value==="Ninguna"?[value]:clean.includes(value)?clean.filter(item=>item!==value):[...clean,value]};
  });
  const validWhatsapp=/^\+?[\d\s()-]{7,20}$/.test(answers.whatsapp);
  const valid = step===0?Boolean(answers.company&&answers.legalName&&answers.location&&answers.contact&&answers.email&&validWhatsapp&&answers.source&&answers.years):step===1?Boolean(answers.revenue&&answers.employees&&answers.payroll):step===2?Boolean(answers.tools.length&&answers.challenge.length):Boolean(answers.urgency&&answers.leadership&&answers.investment);
  const next=()=>{if(!valid)return;if(step<steps.length-1)setStep(step+1);else{setComplete(true);setDelivery("sending");void fetch("/api/prequalification",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(answers)}).then(response=>{if(!response.ok)throw new Error();setDelivery("sent");}).catch(()=>setDelivery("error"));}};

  return <div className="contactPanel prequalPanel" role="dialog" aria-modal="true" aria-label="Preclasificación empresarial O R-K">
    <button className="contactClose" type="button" onClick={onClose} aria-label="Cerrar formulario">×</button>
    {!complete?<>
      <header className="prequalHeader"><span>O R-K / Preclasificación empresarial</span><strong>{String(step+1).padStart(2,"0")} / {String(steps.length).padStart(2,"0")}</strong></header>
      <div className="prequalProgress"><i style={{width:`${((step+1)/steps.length)*100}%`}}/></div>
      <div className="prequalBody">
        <p className="prequalEyebrow">{steps[step]}</p>
        {step===0&&<><h3>Empecemos por<br/>conocerte.</h3><div className="prequalFields"><label>Nombre comercial<input value={answers.company} onChange={e=>set("company",e.target.value)} autoFocus/></label><label>Razón social<input value={answers.legalName} onChange={e=>set("legalName",e.target.value)} placeholder="Nombre legal completo"/></label><label>País y ciudad<input value={answers.location} onChange={e=>set("location",e.target.value)} placeholder="Colombia, Bogotá"/></label><label>NIT <small>(opcional)</small><input value={answers.taxId} onChange={e=>set("taxId",e.target.value)} placeholder="900.000.000-0"/></label><label>Tu nombre<input value={answers.contact} onChange={e=>set("contact",e.target.value)}/></label><label>Correo corporativo<input type="email" value={answers.email} onChange={e=>set("email",e.target.value)}/></label><label>Número de WhatsApp<input type="tel" inputMode="tel" autoComplete="tel" value={answers.whatsapp} onChange={e=>set("whatsapp",e.target.value)} placeholder="+57 300 123 4567" aria-describedby="whatsapp-help"/><small id="whatsapp-help">Incluye el indicativo del país</small></label><label>Website <small>(opcional)</small><input type="url" value={answers.website} onChange={e=>set("website",e.target.value)} placeholder="https://"/></label><label>LinkedIn de la empresa <small>(opcional)</small><input type="url" value={answers.linkedin} onChange={e=>set("linkedin",e.target.value)} placeholder="https://linkedin.com/company/..."/></label></div><Question number="01" title="¿Cómo conociste O R-K?"><ChoiceGroup name="Origen" values={options.source} selected={answers.source} onSelect={value=>set("source",value)}/></Question><Question number="02" title="¿Cuántos años lleva operando?"><ChoiceGroup name="Años operando" values={options.years} selected={answers.years} onSelect={value=>set("years",value)}/></Question><Question number="03" title="¿En qué canales tiene presencia?" hint="Puedes elegir varias"><ChoiceGroup multiple name="Canales" values={options.channels} selected={answers.channels} onSelect={value=>toggle("channels",value)}/></Question></>}
        {step===1&&<><h3>Entendamos<br/>tu escala.</h3><Question number="04" title="¿Cuál es la facturación promedio mensual?"><ChoiceGroup name="Facturación" values={options.revenue} selected={answers.revenue} onSelect={value=>set("revenue",value)}/></Question><Question number="05" title="¿Cuántas personas trabajan actualmente en la empresa?"><ChoiceGroup name="Empleados" values={options.employees} selected={answers.employees} onSelect={value=>set("employees",value)}/></Question><Question number="06" title="¿Cuál es el costo mensual total de personal?"><ChoiceGroup name="Nómina" values={options.payroll} selected={answers.payroll} onSelect={value=>set("payroll",value)}/></Question></>}
        {step===2&&<><h3>Veamos cómo<br/>opera hoy.</h3><Question number="07" title="¿Qué herramientas utiliza actualmente?" hint="Puedes elegir varias"><ChoiceGroup multiple name="Herramientas" values={options.tools} selected={answers.tools} onSelect={value=>toggle("tools",value)}/></Question><Question number="08" title="¿Cuáles son hoy los principales retos de la empresa?" hint="Puedes elegir varias"><ChoiceGroup multiple name="Retos principales" values={options.challenge} selected={answers.challenge} onSelect={value=>toggle("challenge",value)}/></Question></>}
        {step===3&&<><h3>¿Es el momento<br/>de avanzar?</h3><Question number="09" title="¿La empresa ya tomó la decisión de transformarse y escalar?"><ChoiceGroup name="Urgencia" values={options.urgency} selected={answers.urgency} onSelect={value=>set("urgency",value)}/></Question><Question number="10" title="¿La alta dirección participará directamente?"><ChoiceGroup name="Liderazgo" values={options.leadership} selected={answers.leadership} onSelect={value=>set("leadership",value)}/></Question><Question number="11" title="¿Existe capacidad de inversión para implementar cambios?"><ChoiceGroup name="Inversión" values={options.investment} selected={answers.investment} onSelect={value=>set("investment",value)}/></Question></>}
      </div>
      <footer className="prequalActions"><button type="button" onClick={()=>setStep(Math.max(0,step-1))} disabled={step===0}>← Atrás</button><span>Tiempo estimado: 3 minutos</span><button className="prequalNext" type="button" onClick={next} disabled={!valid}>{step===steps.length-1?"Ver mi resultado":"Continuar"} <b>→</b></button></footer>
    </>:<Result answers={answers} result={result} delivery={delivery} onRestart={()=>{setAnswers(initialAnswers);setStep(0);setComplete(false);setDelivery("idle");}}/>}
  </div>;
}

function Question({number,title,hint,children}:{number:string;title:string;hint?:string;children:React.ReactNode}) {
  return <section className="prequalQuestion"><div><span>{number}</span><h4>{title}</h4>{hint&&<small>{hint}</small>}</div>{children}</section>;
}

function Result({answers,result,delivery,onRestart}:{answers:Answers;result:ReturnType<typeof scorePrequalification>;delivery:"idle"|"sending"|"sent"|"error";onRestart:()=>void}) {
  const isHigh=result.compatibility==="Alta";
  const isPotential=result.compatibility==="Potencial";
  return <div className="prequalResult">
    <span>Lectura inicial / {answers.company}</span>
    <p className="prequalResultLabel">Compatibilidad O R-K</p>
    <h3>{result.compatibility}</h3>
    <div className="prequalScore"><i style={{width:`${result.total}%`}}/><b>{result.total}/100</b></div>
    <p className="prequalResultLead">{isHigh?"Tu empresa está en un gran momento para transformarse y escalar.":isPotential?"Vemos potencial, pero queremos entender un poco más.":"Tu empresa está construyendo las condiciones para su próxima etapa."}</p>
    <div className="prequalResultGrid"><section><small>Clasificación preliminar</small><strong>{result.companyClass}</strong><p>Esta lectura combina escala, madurez, compromiso y capacidad de implementación. No sustituye el diagnóstico UTS.</p></section><section><small>Señales positivas</small><ul>{(result.positives.length?result.positives:["Existe una intención inicial de comprender la siguiente etapa."]).map(item=><li key={item}>{item}</li>)}</ul></section><section><small>Por comprender</small><ul>{(result.gaps.length?result.gaps:["Profundizar en la operación y sus prioridades estratégicas."]).map(item=><li key={item}>{item}</li>)}</ul></section></div>
    <p className={`prequalDelivery is-${delivery}`}>{delivery==="sending"?"Investigando la empresa y generando el reporte PDF…":delivery==="sent"?"Reporte enriquecido enviado correctamente a O R-K.":delivery==="error"?"Tu resultado se generó correctamente, pero el PDF no pudo enviarse. Intenta nuevamente.":""}</p>
    <div className="prequalResultActions"><a href={`mailto:hola@or-k.co?subject=${encodeURIComponent(`Compatibilidad O R-K · ${answers.company}`)}&body=${encodeURIComponent(`Hola O R-K, completé la preclasificación.\n\nEmpresa: ${answers.company}\nContacto: ${answers.contact}\nWhatsApp: ${answers.whatsapp}\nResultado: ${result.compatibility} (${result.total}/100)\nClasificación: ${result.companyClass}`)}`}>{isHigh?"Agendar conversación":"Compartir con O R-K"} <b>↗</b></a><button type="button" onClick={onRestart}>Volver a empezar</button></div>
  </div>;
}
