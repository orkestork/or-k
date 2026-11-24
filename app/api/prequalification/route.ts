import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createPrequalificationPdf } from "@/lib/prequalification-pdf";
import { isPrequalificationAnswers } from "@/lib/prequalification";
import { researchCompany } from "@/lib/company-research";

export const runtime="nodejs";
export const maxDuration=60;

export async function POST(request:Request) {
  try {
    const answers:unknown=await request.json();
    if(!isPrequalificationAnswers(answers)) return NextResponse.json({error:"Datos incompletos"},{status:400});
    let research=null;
    try { research=await researchCompany(answers); } catch(error) { console.error("Company research failed",error); }
    const {bytes,result}=await createPrequalificationPdf(answers,research);
    const isPreview=process.env.NODE_ENV!=="production"&&new URL(request.url).searchParams.get("preview")==="1";
    if(isPreview) return new Response(Buffer.from(bytes),{headers:{"Content-Type":"application/pdf","Content-Disposition":`inline; filename="or-k-${slug(answers.company)}.pdf"`}});
    const apiKey=process.env.RESEND_API_KEY;
    if(!apiKey) return NextResponse.json({error:"El servicio de correo aún no está configurado"},{status:503});
    const resend=new Resend(apiKey);
    const recipient=process.env.ORCA_LEADS_EMAIL??"or-kk@outlook.com";
    const sendingDomain=process.env.RESEND_EMAIL_DOMAIN??"or-k.co";
    const from=process.env.RESEND_FROM_EMAIL??`O R-K <formularios@${sendingDomain}>`;
    const {data,error}=await resend.emails.send({
      from,
      to:[recipient],
      replyTo:answers.email,
      subject:`Preclasificación O R-K: ${answers.company} - ${result.compatibility}`,
      html:`<div style="font-family:Arial,sans-serif;color:#0B0710;max-width:620px"><p style="color:#4B1F8C;font-size:12px;letter-spacing:.12em">NUEVA PRECLASIFICACIÓN O R-K</p><h1>${escapeHtml(answers.company)}</h1><p><strong>Razón social:</strong> ${escapeHtml(answers.legalName)}</p><p><strong>Ubicación:</strong> ${escapeHtml(answers.location)}</p><p><strong>Compatibilidad:</strong> ${result.compatibility} (${result.total}/100)</p><p><strong>Clasificación:</strong> ${result.companyClass}</p><p><strong>Contacto:</strong> ${escapeHtml(answers.contact)} · ${escapeHtml(answers.email)}</p><p><strong>WhatsApp:</strong> ${escapeHtml(answers.whatsapp)}</p>${research?`<p><strong>Investigación pública:</strong> incluida en el PDF con ${research.sources.length} fuente(s).</p><p><strong>Ingresos anuales estimados:</strong> ${escapeHtml(research.estimatedAnnualRevenue)} <em>(estimación no confirmada)</em></p>`:`<p><strong>Investigación pública:</strong> no disponible; se adjunta el reporte de preclasificación.</p>`}<p>El reporte completo está adjunto en PDF.</p></div>`,
      attachments:[{filename:`or-k-preclasificacion-${slug(answers.company)}.pdf`,content:Buffer.from(bytes)}],
    });
    if(error) return NextResponse.json({error:"No fue posible enviar el reporte"},{status:502});
    return NextResponse.json({ok:true,id:data?.id});
  } catch {
    return NextResponse.json({error:"No fue posible procesar el formulario"},{status:500});
  }
}

function slug(value:string){return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60)||"empresa";}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]??char));}
