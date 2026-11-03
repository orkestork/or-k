"use client";

import { useEffect, useRef, useState } from "react";
import { Clapperboard, Globe, PenTool, Play, Smartphone, Sparkles, Square } from "lucide-react";
import "./project-wheel.css";

export type ProjectClip = {src:string;duration:number;kind?:"image"|"video";startAt?:number;position?:string;fit?:"contain";bg?:string};
export type WheelProject = {title:string;url:string;meta:string;year:string;media:string;motion?:ProjectClip[]};
type Tag = "branding"|"web"|"app"|"motion"|"ia";
type Piece = {id:string;label:string;tags:Tag[]};

// Piezas por proyecto (miniaturas en /assets/pieces); la primera es la marca.
const catalog:Record<string,{desc:string;pieces:Piece[]}> = {
  "4U Studio":{desc:"Academia de música y producción en Bogotá. Marca, sitio web y piezas audiovisuales para comunicar «Play your talent».",pieces:[
    {id:"4u-logo",label:"Identidad",tags:["branding"]},{id:"4u-web",label:"Web academia",tags:["web"]},{id:"4u-clip",label:"Clases en vivo",tags:["motion","ia"]},{id:"4u-clip2",label:"Play your talent",tags:["motion","ia"]}]},
  "L'Origine":{desc:"Fórmula capilar tricoactivadora. Dirección visual de producto, tienda web y films para redes.",pieces:[
    {id:"lor-logo",label:"Identidad",tags:["branding"]},{id:"lor-film2",label:"Producto",tags:["motion"]},{id:"lor-film",label:"Tienda web",tags:["web"]}]},
  "Kliniu":{desc:"Dispensadores y soluciones de limpieza. Naming, identidad, mascota y una tienda con catálogo y puntos de venta.",pieces:[
    {id:"kli-logo",label:"Naming e identidad",tags:["branding"]},{id:"kli-prod",label:"Línea de producto",tags:["branding","ia"]},{id:"kli-masc",label:"Mascota",tags:["ia"]},{id:"kli-puntos",label:"Puntos Kliniu",tags:["ia"]},{id:"kli-serv",label:"Servicio",tags:["web"]}]},
  "GEU":{desc:"Seis unidades de negocio bajo una sola marca: sistema visual, ecosistema web multimarca y Gus, su mascota.",pieces:[
    {id:"geu-logo",label:"Identidad corporativa",tags:["branding"]},{id:"geu-web",label:"Ecosistema web",tags:["web"]},{id:"geu-marca",label:"Sistema de marca",tags:["branding"]},{id:"geu-energy",label:"GEU Energy",tags:["motion","ia"]},{id:"geu-cfd",label:"Simulación de viento",tags:["motion"]},{id:"geu-gus",label:"Gus",tags:["ia"]},{id:"geu-plastic",label:"Doypack",tags:["motion","ia"]}]},
  "Totalpars":{desc:"Repuestos para transporte masivo, de carga y maquinaria. Identidad, búsqueda por sistema del bus y tienda web y móvil.",pieces:[
    {id:"tp-logo",label:"Identidad",tags:["branding"]},{id:"tp-xray",label:"Bus rayos X",tags:["motion","web"]},{id:"tp-cat",label:"Categorías",tags:["web"]},{id:"tp-movil",label:"App móvil",tags:["app"]}]},
  "Drokex":{desc:"Catálogo digital para que las empresas de LATAM vendan al mundo. Marca, plataforma con globo interactivo y agente 3D.",pieces:[
    {id:"dx-logo",label:"Identidad",tags:["branding"]},{id:"dx-site",label:"Catálogo global",tags:["web","app"]},{id:"dx-world",label:"Drokex World",tags:["web"]},{id:"dx-robot",label:"Agente Drokex",tags:["ia"]}]},
};
const filters:{id:Tag;label:string;Icon:typeof Globe}[] = [
  {id:"branding",label:"Branding",Icon:PenTool},
  {id:"web",label:"Web",Icon:Globe},
  {id:"app",label:"App",Icon:Smartphone},
  {id:"motion",label:"Motion",Icon:Clapperboard},
  {id:"ia",label:"IA",Icon:Sparkles},
];
// Con pocas piezas la rueda se ve hueca: se repite la secuencia hasta llenarla.
const MIN_TILES = 36, AUTO_MS = 4200;

export function ProjectMotion({poster,title,clips,autoPlay=false}:{poster:string;title:string;clips:ProjectClip[];autoPlay?:boolean}){
  const [activeClip,setActiveClip]=useState(-1);
  const videoRefs=useRef<(HTMLVideoElement|null)[]>([]);
  useEffect(()=>{if(autoPlay) setActiveClip(0);},[autoPlay]);
  useEffect(()=>{
    if(activeClip<0){videoRefs.current.forEach((video)=>{if(video){video.pause();video.currentTime=0;}});return;}
    const video=videoRefs.current[activeClip];
    if(video){video.currentTime=clips[activeClip].startAt??0;void video.play().catch(()=>{});}
    const timer=window.setTimeout(()=>setActiveClip((activeClip+1)%clips.length),clips[activeClip].duration);
    return ()=>{window.clearTimeout(timer);if(video){video.pause();video.currentTime=0;}};
  },[activeClip,clips]);
  return <div className="visual projectImage projectMotion" onPointerEnter={autoPlay?undefined:()=>setActiveClip(0)} onPointerLeave={autoPlay?undefined:()=>setActiveClip(-1)}>
    <img src={poster} alt={`Proyecto ${title}`} draggable="false" loading="lazy" decoding="async"/>
    {clips.map((clip,index)=>clip.kind==="image"
      ? <img className={`projectMotionStill ${activeClip===index?"isActive":""}`} src={clip.src} style={{objectPosition:clip.position,objectFit:clip.fit,background:clip.bg}} alt="" aria-hidden="true" draggable="false" key={`${clip.src}-${index}`}/>
      : <video ref={(node)=>{videoRefs.current[index]=node;}} className={activeClip===index?"isActive":""} style={{objectPosition:clip.position,objectFit:clip.fit,background:clip.bg}} muted playsInline preload="metadata" key={`${clip.src}-${index}`}><source src={clip.src} type="video/mp4"/></video>)}
  </div>;
}

export default function ProjectWheel({projects}:{projects:WheelProject[]}){
  const base=projects.flatMap((project)=>(catalog[project.title]?.pieces??[{id:"",label:project.title,tags:["branding" as Tag]}]).map((piece)=>({...piece,project:project.title})));
  const tiles=Array.from({length:Math.max(MIN_TILES,base.length)},(_,index)=>base[index%base.length]);
  const count=tiles.length, step=360/count;
  const byTitle=Object.fromEntries(projects.map((project)=>[project.title,project]));

  const root=useRef<HTMLDivElement>(null);
  const ring=useRef<HTMLDivElement>(null);
  const [rot,setRot]=useState(0);
  const [dragging,setDragging]=useState(false);
  const [film,setFilm]=useState(true);
  const [inView,setInView]=useState(false);
  const [idle,setIdle]=useState(true);
  const [hovered,setHovered]=useState(false);
  const drag=useRef({active:false,startX:0,startY:0,startRot:0,moved:false});

  const current=((Math.round(rot)%count)+count)%count;
  const piece=tiles[current];
  const project=byTitle[piece.project];
  const desc=catalog[piece.project]?.desc??project.meta;
  const siblings=base.filter((item)=>item.project===piece.project);

  // Al girar se muestra el film del proyecto; al elegir una miniatura, la pieza fija.
  const settle=(next:number,showFilm=true)=>{setRot(Math.round(next));setFilm(showFilm);};
  const goTo=(index:number,showFilm=true)=>{
    const delta=((index-current)%count+count+count/2)%count-count/2; // camino más corto
    setIdle(false);settle(Math.round(rot)+delta,showFilm);
  };
  const nudge=(delta:number)=>{setIdle(false);settle(Math.round(rot)+delta);};
  const jumpTo=(tag:Tag)=>{
    for(let offset=1;offset<=count;offset++){
      if(tiles[(current+offset)%count].tags.includes(tag)){nudge(offset);return;}
    }
  };
  const showSibling=(id:string)=>{
    for(let offset=-count/2;offset<=count/2;offset++){
      const index=((current+offset)%count+count)%count;
      if(tiles[index].id===id&&tiles[index].project===piece.project){goTo(index,false);return;}
    }
  };

  useEffect(()=>{
    const node=root.current;
    if(!node) return;
    const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{threshold:.35});
    observer.observe(node);
    return ()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if(!inView||!idle||hovered) return;
    // En reposo salta al siguiente proyecto cuando termina su film.
    let offset=1;
    while(offset<count&&tiles[(current+offset)%count].project===piece.project) offset++;
    const wait=project.motion?project.motion.reduce((total,clip)=>total+clip.duration,0):AUTO_MS;
    const timer=window.setTimeout(()=>settle(Math.round(rot)+offset),wait);
    return ()=>window.clearTimeout(timer);
  });
  // La rueda del mouse gira la rueda solo cuando el puntero está sobre ella.
  useEffect(()=>{
    const node=ring.current?.parentElement;
    if(!node) return;
    let timer=0;
    const onWheel=(event:WheelEvent)=>{
      event.preventDefault();
      setIdle(false);
      setDragging(true);
      setRot((value)=>value+event.deltaY/90);
      window.clearTimeout(timer);
      timer=window.setTimeout(()=>{setDragging(false);setRot((value)=>Math.round(value));setFilm(true);},140);
    };
    node.addEventListener("wheel",onWheel,{passive:false});
    return ()=>{node.removeEventListener("wheel",onWheel);window.clearTimeout(timer);};
  },[]);

  const onPointerDown=(event:React.PointerEvent<HTMLDivElement>)=>{
    drag.current={active:true,startX:event.clientX,startY:event.clientY,startRot:rot,moved:false};
  };
  const onPointerMove=(event:React.PointerEvent<HTMLDivElement>)=>{
    const state=drag.current;
    if(!state.active) return;
    // En táctil se gira deslizando en horizontal para no bloquear el scroll de la página.
    const distance=event.pointerType==="touch"?state.startX-event.clientX:event.clientY-state.startY;
    if(!state.moved){
      if(Math.abs(distance)<6) return;
      state.moved=true;setDragging(true);setIdle(false);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const chord=event.currentTarget.getBoundingClientRect().height*.16;
    setRot(state.startRot-distance/chord);
  };
  const onPointerUp=(event:React.PointerEvent<HTMLDivElement>)=>{
    const state=drag.current;
    state.active=false;
    if(event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if(state.moved){setDragging(false);settle(rot);window.setTimeout(()=>{state.moved=false;},0);}
  };

  return <div className={`wheel${inView?" isIn":""}`} ref={root} tabIndex={0} role="region" aria-label="Proyectos. Usa las flechas arriba y abajo para girar la rueda"
    style={{"--step":`${step}deg`,"--chord":(2*Math.sin(step*Math.PI/360)).toFixed(4)} as React.CSSProperties}
    onPointerEnter={()=>setHovered(true)} onPointerLeave={()=>setHovered(false)}
    onKeyDown={(event)=>{if(event.key==="ArrowDown"||event.key==="ArrowRight"){event.preventDefault();nudge(1);}else if(event.key==="ArrowUp"||event.key==="ArrowLeft"){event.preventDefault();nudge(-1);}}}>
    <div className="wheelZone" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
      <div className={`wheelRing${dragging?" isDragging":""}`} ref={ring} style={{"--rot":`${-rot*step}deg`} as React.CSSProperties}>
        {tiles.map((tile,index)=><button key={index} type="button" tabIndex={-1} className={`wheelTile${index===current?" isActive":""}`} style={{"--i":index} as React.CSSProperties}
          onClick={()=>{if(!drag.current.moved) goTo(index);}} aria-label={`${tile.project}: ${tile.label}`}>
          <img src={`/assets/pieces/${tile.id}.jpg`} alt="" draggable="false" loading="lazy" decoding="async"/>
        </button>)}
      </div>
      <div className="wheelHub" aria-hidden="true"/>
      <div className="wheelIcons" role="toolbar" aria-label="Saltar por disciplina">
        {filters.map(({id,label,Icon},index)=><button key={id} type="button" className={piece.tags.includes(id)?"isOn":""} style={{"--k":index-2} as React.CSSProperties} onClick={()=>jumpTo(id)} aria-label={`Siguiente pieza de ${label}`}><Icon size={18} strokeWidth={1.6}/><span>{label}</span></button>)}
      </div>
      <span className="wheelMarker" aria-hidden="true"/>
    </div>

    <div className="wheelContent">
    <div className="wheelInfo" key={`${piece.project}-${piece.id}`}>
      <span className="wheelKicker">{piece.project} · {project.year}</span>
      <h3>{piece.label}</h3>
      <p className="wheelMeta">{project.meta}</p>
      <p className="wheelDesc">{desc}</p>
      <div className="wheelActions">
        {project.motion&&<button type="button" className="wheelPlay" onClick={()=>setFilm((value)=>!value)} aria-pressed={film} aria-label={film?"Ver la pieza":"Ver el film del proyecto"}>{film?<Square size={16} fill="currentColor"/>:<Play size={18} fill="currentColor"/>}</button>}
        <a href={project.url} target="_blank" rel="noreferrer">Ver proyecto <span>↗</span></a>
      </div>
      <ul className="wheelTags">{piece.tags.map((tag)=><li key={tag}>{filters.find((item)=>item.id===tag)?.label}</li>)}</ul>
    </div>

    <div className="wheelStage">
      <div className="wheelPreview" key={film?`film-${piece.project}`:`${piece.project}-${piece.id}`}>
        {film&&project.motion
          ?<ProjectMotion poster={project.media} title={project.title} clips={project.motion} autoPlay/>
          :<img src={`/assets/pieces/${piece.id}.jpg`} alt={`${piece.project}: ${piece.label}`}/>}
        <span>{film?"Film · 10s":`${siblings.findIndex((item)=>item.id===piece.id)+1} / ${siblings.length}`}</span>
      </div>
      <ul className="wheelStrip" aria-label={`Piezas de ${piece.project}`}>
        {siblings.map((item)=><li key={item.id}><button type="button" className={item.id===piece.id&&!film?"isOn":""} onClick={()=>showSibling(item.id)} aria-label={item.label}><img src={`/assets/pieces/${item.id}.jpg`} alt="" loading="lazy" decoding="async"/></button></li>)}
      </ul>
    </div>
    </div>
  </div>;
}
