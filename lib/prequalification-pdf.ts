import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { PrequalificationAnswers, scorePrequalification } from "@/lib/prequalification";
import type { CompanyResearch } from "@/lib/company-research";

// Paleta del Manual de identidad O R-K 2026: tinta, violeta O R-K, violeta noche.
const ink=rgb(.043,.027,.063), pink=rgb(.294,.122,.549), purple=rgb(.165,.078,.314);
const muted=rgb(.35,.33,.39), line=rgb(.812,.773,.722), paper=rgb(.953,.937,.973);
const white=rgb(1,1,1), softPink=rgb(.925,.898,1), softPurple=rgb(.92,.87,.97), softGray=rgb(.91,.9,.88);
type Fonts={regular:PDFFont;bold:PDFFont};
type Metric={label:string;value:number;detail:string;color:ReturnType<typeof rgb>};

export async function createPrequalificationPdf(answers:PrequalificationAnswers,research:CompanyResearch|null=null) {
  const result=scorePrequalification(answers), pdf=await PDFDocument.create();
  pdf.setTitle(`Preclasificación O R-K - ${answers.company}`);pdf.setAuthor("O R-K");pdf.setSubject("Reporte ejecutivo de compatibilidad empresarial");
  const fonts:Fonts={regular:await pdf.embedFont(StandardFonts.Helvetica),bold:await pdf.embedFont(StandardFonts.HelveticaBold)};
  const metrics=buildMetrics(answers,result.total);
  drawExecutivePage(pdf.addPage([595.28,841.89]),fonts,answers,result,metrics);
  drawAnswersPage(pdf.addPage([595.28,841.89]),fonts,answers,metrics);
  if(research) drawResearchPages(pdf,fonts,answers,research);
  const pages=pdf.getPages();pages.forEach((page,index)=>drawFooter(page,fonts,index+1,pages.length));
  return {bytes:await pdf.save(),result};
}

function drawExecutivePage(page:PDFPage,fonts:Fonts,answers:PrequalificationAnswers,result:ReturnType<typeof scorePrequalification>,metrics:Metric[]) {
  background(page);header(page,fonts,"REPORTE EJECUTIVO",answers.company);
  text(page,fonts,"COMPATIBILIDAD EMPRESARIAL",52,748,8,pink,fonts.bold);
  wrapped(page,fonts,answers.company,52,705,490,29,31,ink,fonts.bold,2);
  page.drawRectangle({x:52,y:563,width:491,height:108,color:ink});
  text(page,fonts,"COMPATIBILIDAD O R-K",72,642,7,paper,fonts.bold);text(page,fonts,result.compatibility.toUpperCase(),72,591,29,pink,fonts.bold);
  text(page,fonts,String(result.total),414,584,47,white,fonts.bold);text(page,fonts,"/ 100",483,591,13,paper,fonts.bold);progress(page,52,545,491,8,result.total,pink,softGray);
  text(page,fonts,"LECTURA RAPIDA",52,512,8,pink,fonts.bold);
  const intro=result.compatibility==="Alta"?"La empresa muestra una combinación sólida de escala, liderazgo y capacidad de implementación. El siguiente paso recomendado es profundizar en la operación y priorizar una hoja de ruta.":result.compatibility==="Potencial"?"Hay condiciones interesantes para avanzar, aunque conviene alinear algunas variables antes de iniciar una transformación integral.":"La empresa está construyendo las condiciones para una siguiente etapa. El foco inicial debe estar en preparar liderazgo, inversión y madurez operativa.";
  wrapped(page,fonts,intro,52,488,491,11.5,16,ink,fonts.regular,4);
  const cardY=350,gap=9,cardW=(491-gap*3)/4;metrics.forEach((metric,index)=>metricCard(page,fonts,52+index*(cardW+gap),cardY,cardW,92,metric));
  text(page,fonts,"QUE VEMOS",52,317,8,pink,fonts.bold);
  insightBox(page,fonts,52,168,239,126,"FORTALEZAS",result.positives.length?result.positives:["Existe una intención clara de comprender la siguiente etapa."],pink);
  insightBox(page,fonts,304,168,239,126,"POR COMPRENDER",result.gaps.length?result.gaps:["Profundizar en la operación y sus prioridades estratégicas."],purple);
  page.drawRectangle({x:52,y:71,width:491,height:72,color:softPink});text(page,fonts,"SIGUIENTE PASO",70,117,7,pink,fonts.bold);
  wrapped(page,fonts,"Sesión Understand: validar prioridades, responsables, restricciones y oportunidades antes de diseñar la transformación.",70,98,447,10.5,14,ink,fonts.bold,3);
}

function drawAnswersPage(page:PDFPage,fonts:Fonts,answers:PrequalificationAnswers,metrics:Metric[]) {
  background(page);header(page,fonts,"MAPA DE LA EMPRESA","RESPUESTAS DECLARADAS");
  text(page,fonts,"La información se organiza por bloques para identificar rápidamente escala, operación y preparación.",52,724,10,muted,fonts.regular);
  const left=52,right=304,width=239;
  sectionTable(page,fonts,left,656,width,"IDENTIFICACION",[["Nombre comercial",answers.company],["Razón social",answers.legalName],["NIT",answers.taxId||"No informado"],["Ubicación",answers.location],["Años operando",answers.years]]);
  sectionTable(page,fonts,right,656,width,"CONTACTO",[["Contacto",answers.contact],["Correo",answers.email],["WhatsApp",answers.whatsapp],["Website",answers.website||"No informado"],["LinkedIn",answers.linkedin||"No informado"]]);
  sectionTable(page,fonts,left,432,width,"ESCALA EMPRESARIAL",[["Facturación mensual",answers.revenue],["Personas",answers.employees],["Costo de personal",answers.payroll],["Clasificación",companyClassLabel(answers)]]);
  sectionTable(page,fonts,right,432,width,"ECOSISTEMA ACTUAL",[["Canales",join(answers.channels)],["Herramientas",join(answers.tools)],["Origen del contacto",answers.source]]);
  sectionTable(page,fonts,left,251,width,"PRIORIDADES",[["Retos seleccionados",join(answers.challenge)]]);
  sectionTable(page,fonts,right,251,width,"PREPARACION",[["Urgencia",answers.urgency],["Liderazgo",answers.leadership],["Inversión",answers.investment]]);
  text(page,fonts,"PERFIL EN PORCENTAJES",52,125,8,pink,fonts.bold);
  metrics.slice(1).forEach((metric,index)=>{const y=100-index*20;text(page,fonts,metric.label,52,y,8,muted,fonts.bold);progress(page,155,y+1,330,7,metric.value,metric.color,softGray);text(page,fonts,`${metric.value}%`,500,y-1,9,ink,fonts.bold);});
}

function drawResearchPages(pdf:PDFDocument,fonts:Fonts,answers:PrequalificationAnswers,research:CompanyResearch) {
  const page=pdf.addPage([595.28,841.89]);background(page);header(page,fonts,"INTELIGENCIA PUBLICA",answers.company);
  notice(page,fonts,"INFORMACION ASISTIDA POR IA","Los hechos provienen de fuentes públicas; las estimaciones e inferencias deben validarse antes de tomar decisiones.",52,685);
  contentBlock(page,fonts,"RESUMEN EJECUTIVO",research.summary,52,625,491,82);contentBlock(page,fonts,"INDUSTRIA Y ACTIVIDAD",research.industry,52,510,239,84);
  contentBlock(page,fonts,"PRESENCIA DIGITAL",research.digitalPresence,304,510,239,84);contentBlock(page,fonts,"IDENTIFICACION",research.identityAssessment,52,392,491,86);
  contentBlock(page,fonts,"TAMAÑO EMPRESARIAL",research.companySize,52,278,239,82);contentBlock(page,fonts,"INGRESOS ANUALES ESTIMADOS",research.estimatedAnnualRevenue,304,278,239,82,true);
  contentBlock(page,fonts,"BASE DE LA ESTIMACION",research.estimateBasis,52,156,491,88);
  const page2=pdf.addPage([595.28,841.89]);background(page2);header(page2,fonts,"OPORTUNIDADES Y RIESGOS",answers.company);
  bulletPanel(page2,fonts,52,564,239,136,"OPORTUNIDADES",research.opportunities,pink);bulletPanel(page2,fonts,304,564,239,136,"RIESGOS POR VALIDAR",research.risks,purple);
  bulletPanel(page2,fonts,52,386,491,145,"RECOMENDACIONES O R-K",research.recommendations,ink);
  bulletPanel(page2,fonts,52,178,239,176,"SEÑALES FINANCIERAS",research.financialSignals,pink,3);
  bulletPanel(page2,fonts,304,178,239,176,"COMERCIO EXTERIOR",research.tradeSignals,purple,3);

  const sourcesPage=pdf.addPage([595.28,841.89]);background(sourcesPage);header(sourcesPage,fonts,"FUENTES PUBLICAS",answers.company);
  text(sourcesPage,fonts,"TRAZABILIDAD DE LA INVESTIGACION",52,724,8,pink,fonts.bold);
  wrapped(sourcesPage,fonts,"Fuentes consultadas para complementar la lectura empresarial. La información debe validarse antes de tomar decisiones.",52,701,491,10,14,muted,fonts.regular,3);
  let sourceY=650;
  research.sources.slice(0,8).forEach((source,index)=>{
    sourceY=sourceCard(sourcesPage,fonts,52,sourceY,491,index+1,source.title,source.url)-13;
  });
}

function buildMetrics(a:PrequalificationAnswers,total:number):Metric[] {
  const revenue=Math.max(0,["$300M–$499M COP","$500M–$1.499M COP","$1.500M COP–USD 999.999","Más de USD 1 millón"].indexOf(a.revenue)+1);
  const size=Math.max(0,["1–20","21–50","51–100","101–250","Más de 250"].indexOf(a.employees)+1),years=Math.max(0,["Menos de 2","2 a 5","6 a 10","Más de 10 años"].indexOf(a.years)+1);
  const urgency=Math.max(0,["Estamos explorando","Sí, este año","Sí, próximos 3 meses","Sí, es prioridad inmediata"].indexOf(a.urgency)+1);
  const leadership=({"Sí":4,"Parcialmente":3,"Aún no está definido":1,"No":0} as Record<string,number>)[a.leadership]??0;
  const investment=({"Sí":4,"Depende del proyecto":3,"Debemos estructurar presupuesto":2,"Prefiero conversarlo":2,"Actualmente no":0} as Record<string,number>)[a.investment]??0;
  const maturity=Math.min(4,a.tools.filter(item=>item!=="Ninguna").length);
  return [{label:"Compatibilidad",value:total,detail:"Puntaje integral",color:pink},{label:"Escala",value:Math.round(((revenue+size+years)/13)*100),detail:"Tamaño y trayectoria",color:purple},{label:"Madurez digital",value:Math.round((maturity/4)*100),detail:"Herramientas actuales",color:pink},{label:"Preparación",value:Math.round(((urgency+leadership+investment)/12)*100),detail:"Urgencia y capacidad",color:ink}];
}

function background(page:PDFPage){const {width,height}=page.getSize();page.drawRectangle({x:0,y:0,width,height,color:paper});}
function header(page:PDFPage,fonts:Fonts,leftTitle:string,rightTitle:string){text(page,fonts,"O R-K",52,793,22,pink,fonts.bold);text(page,fonts,leftTitle,52,775,6.5,muted,fonts.bold);const rt=safe(rightTitle.toUpperCase());text(page,fonts,rt,543-fonts.bold.widthOfTextAtSize(rt,7),792,7,muted,fonts.bold);page.drawLine({start:{x:52,y:762},end:{x:543,y:762},thickness:1,color:ink});}
function drawFooter(page:PDFPage,fonts:Fonts,current:number,total:number){page.drawLine({start:{x:52,y:48},end:{x:543,y:48},thickness:.45,color:line});text(page,fonts,"O R-K / CONFIDENCIAL",52,30,6.5,muted,fonts.bold);text(page,fonts,`${current} / ${total}`,520,30,6.5,muted,fonts.bold);}
function text(page:PDFPage,_fonts:Fonts,value:string,x:number,y:number,size:number,color:ReturnType<typeof rgb>,font:PDFFont){page.drawText(safe(value),{x,y,size,font,color});}
function wrapped(page:PDFPage,fonts:Fonts,value:string,x:number,y:number,maxWidth:number,size:number,lineHeight:number,color:ReturnType<typeof rgb>,font=fonts.regular,maxLines=99){const rows=wrap(font,safe(value),size,maxWidth).slice(0,maxLines);rows.forEach((row,index)=>text(page,fonts,row,x,y-index*lineHeight,size,color,font));return y-rows.length*lineHeight;}
function wrap(font:PDFFont,value:string,size:number,maxWidth:number){const words=value.split(/\s+/),rows:string[]=[];let row="";for(const word of words){const candidate=row?`${row} ${word}`:word;if(font.widthOfTextAtSize(candidate,size)<=maxWidth)row=candidate;else{if(row)rows.push(row);row=word;}}if(row)rows.push(row);return rows;}
function safe(value:string){return String(value).replace(/[→↗↘]/g,"-").replace(/[–—‑]/g,"-").replace(/[‘’]/g,"'").replace(/[“”]/g,'"');}
function progress(page:PDFPage,x:number,y:number,width:number,height:number,value:number,color:ReturnType<typeof rgb>,track:ReturnType<typeof rgb>){page.drawRectangle({x,y,width,height,color:track});page.drawRectangle({x,y,width:Math.max(2,width*Math.min(100,Math.max(0,value))/100),height,color});}
function metricCard(page:PDFPage,fonts:Fonts,x:number,y:number,width:number,height:number,metric:Metric){page.drawRectangle({x,y,width,height,color:white,borderColor:line,borderWidth:.5});text(page,fonts,metric.label.toUpperCase(),x+11,y+height-20,6.2,muted,fonts.bold);text(page,fonts,`${metric.value}%`,x+11,y+38,22,ink,fonts.bold);progress(page,x+11,y+24,width-22,5,metric.value,metric.color,softGray);wrapped(page,fonts,metric.detail,x+11,y+10,width-22,6.5,8,muted,fonts.regular,1);}
function insightBox(page:PDFPage,fonts:Fonts,x:number,y:number,width:number,height:number,title:string,items:string[],accent:ReturnType<typeof rgb>){page.drawRectangle({x,y,width,height,color:white,borderColor:line,borderWidth:.5});page.drawRectangle({x,y:y+height-5,width,height:5,color:accent});text(page,fonts,title,x+15,y+height-24,7,accent,fonts.bold);let cursor=y+height-44;items.slice(0,3).forEach(item=>{page.drawCircle({x:x+18,y:cursor+2,size:2.5,color:accent});cursor=wrapped(page,fonts,item,x+29,cursor,width-43,8.2,11,ink,fonts.regular,2)-8;});}
function sectionTable(page:PDFPage,fonts:Fonts,x:number,top:number,width:number,title:string,rows:[string,string][]) {text(page,fonts,title,x,top,7,pink,fonts.bold);let y=top-18;rows.forEach(([label,value],index)=>{const h=Math.max(29,wrap(fonts.regular,safe(value),8.3,width-90).slice(0,2).length*11+12);page.drawRectangle({x,y:y-h+7,width,height:h,color:index%2?white:rgb(.94,.93,.91)});text(page,fonts,label,x+9,y-8,6.5,muted,fonts.bold);wrapped(page,fonts,value||"No informado",x+89,y-8,width-98,8.3,11,ink,fonts.regular,2);y-=h;});return y;}
function notice(page:PDFPage,fonts:Fonts,title:string,value:string,x:number,y:number){page.drawRectangle({x,y,width:491,height:55,color:softPink});text(page,fonts,title,x+16,y+34,7,pink,fonts.bold);wrapped(page,fonts,value,x+16,y+18,459,8.5,11,ink,fonts.regular,2);}
function contentBlock(page:PDFPage,fonts:Fonts,title:string,value:string,x:number,y:number,width:number,height:number,highlight=false){page.drawRectangle({x,y,width,height,color:highlight?softPurple:white,borderColor:line,borderWidth:.5});text(page,fonts,title,x+14,y+height-20,7,highlight?purple:pink,fonts.bold);wrapped(page,fonts,value,x+14,y+height-39,width-28,9.1,12,ink,highlight?fonts.bold:fonts.regular,Math.floor((height-47)/12)+1);}
function bulletPanel(page:PDFPage,fonts:Fonts,x:number,y:number,width:number,height:number,title:string,items:string[],accent:ReturnType<typeof rgb>,maxLines=2){page.drawRectangle({x,y,width,height,color:white,borderColor:line,borderWidth:.5});text(page,fonts,title,x+15,y+height-23,7,accent,fonts.bold);let cursor=y+height-43;(items.length?items:["No encontrado en fuentes públicas"]).slice(0,4).forEach(item=>{page.drawCircle({x:x+18,y:cursor+2,size:2,color:accent});cursor=wrapped(page,fonts,item,x+29,cursor,width-44,8.2,10.5,ink,fonts.regular,maxLines)-7;});}
function sourceCard(page:PDFPage,fonts:Fonts,x:number,top:number,width:number,index:number,title:string,url:string){const titleRows=wrap(fonts.bold,safe(title),9.2,width-62).slice(0,2),urlRows=wrap(fonts.regular,safe(url),7.2,width-62).slice(0,3);const height=24+titleRows.length*12+urlRows.length*9;page.drawRectangle({x,y:top-height,width,height,color:white,borderColor:line,borderWidth:.5});text(page,fonts,String(index).padStart(2,"0"),x+14,top-23,8,pink,fonts.bold);wrapped(page,fonts,title,x+48,top-20,width-62,9.2,12,ink,fonts.bold,2);wrapped(page,fonts,url,x+48,top-20-titleRows.length*12,width-62,7.2,9,muted,fonts.regular,3);return top-height;}
function join(values:string[]){return values.length?values.join(", "):"No informado";}
function companyClassLabel(a:PrequalificationAnswers){const size=["1–20","21–50","51–100","101–250","Más de 250"].indexOf(a.employees)+1,revenue=["$300M–$499M COP","$500M–$1.499M COP","$1.500M COP–USD 999.999","Más de USD 1 millón"].indexOf(a.revenue)+1;return size>=4||revenue>=4?"O R-K Enterprise":size>=2||revenue>=2?"O R-K Scale":"O R-K Growth";}
