"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

type Axis = "X" | "Y" | "Z";

export default function UtsSphere({activeAxis}:{activeAxis:Axis|null}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeAxisRef = useRef<Axis|null>(activeAxis);
  useEffect(()=>{activeAxisRef.current=activeAxis;},[activeAxis]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    const sphereGroup = new THREE.Group();
    scene.add(sphereGroup);
    const geometry = new THREE.SphereGeometry(3, 48, 32);
    const material = new THREE.MeshPhysicalMaterial({
      color: "#2A1450",
      emissive: "#0B0710",
      emissiveIntensity: 0.5,
      metalness: 0.72,
      roughness: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.18,
    });
    const sphere = new THREE.Mesh(geometry, material);
    const interactionMaterial=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});
    const interactionSphere=new THREE.Mesh(geometry,interactionMaterial);
    sphereGroup.add(interactionSphere);
    const wireMaterial = new THREE.MeshBasicMaterial({color:0x7C3CFF,wireframe:true,transparent:true,opacity:0.045});
    const wireSphere = new THREE.Mesh(geometry, wireMaterial);
    wireSphere.scale.setScalar(1.006);

    const glowMaterial = new THREE.ShaderMaterial({
      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      side:THREE.BackSide,
      uniforms:{glowColor:{value:new THREE.Color(0x7C3CFF)}},
      vertexShader:`varying vec3 vNormal; varying vec3 vView; void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform vec3 glowColor; varying vec3 vNormal; varying vec3 vView; void main(){float fresnel=pow(1.0-abs(dot(vNormal,vView)),2.35);gl_FragColor=vec4(glowColor,fresnel*.42);}`,
    });
    const glowSphere=new THREE.Mesh(geometry,glowMaterial);
    glowSphere.scale.setScalar(1.075);

    const scanMaterial=new THREE.ShaderMaterial({
      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      uniforms:{time:{value:0},scanColor:{value:new THREE.Color(0x7C3CFF)}},
      vertexShader:`varying vec3 vObjectPosition; varying vec3 vNormal; varying vec3 vView; void main(){vObjectPosition=position;vec4 mv=modelViewMatrix*vec4(position,1.0);vNormal=normalize(normalMatrix*normal);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}`,
      fragmentShader:`uniform float time; uniform vec3 scanColor; varying vec3 vObjectPosition; varying vec3 vNormal; varying vec3 vView; void main(){float fresnel=pow(1.0-abs(dot(vNormal,vView)),2.0);float wave=sin(vObjectPosition.y*25.0-time*3.2)*.5+.5;float band=smoothstep(.9,1.0,wave);float sweep=smoothstep(.0,.12,abs(fract(vObjectPosition.y*.13-time*.08)-.5));float alpha=fresnel*.08+band*.04+sweep*.008;gl_FragColor=vec4(scanColor,alpha);}`,
    });
    const scanSphere=new THREE.Mesh(geometry,scanMaterial);
    scanSphere.scale.setScalar(1.025);

    const nodePositions:number[]=[];
    const topologyGeometry=mergeVertices(new THREE.IcosahedronGeometry(3,22),1e-4);
    const topologyPositions=topologyGeometry.getAttribute("position");
    const topologyIndex=topologyGeometry.getIndex();
    const nodeCount=topologyPositions.count;
    let randomSeed=721347;
    const seededRandom=()=>{randomSeed|=0;randomSeed=randomSeed+0x4B1F8CF5|0;let value=Math.imul(randomSeed^randomSeed>>>15,1|randomSeed);value=value+Math.imul(value^value>>>7,61|value)^value;return ((value^value>>>14)>>>0)/4294967296;};
    for(let index=0;index<nodeCount;index++){
      const direction=new THREE.Vector3().fromBufferAttribute(topologyPositions,index).normalize();
      direction.x+=(seededRandom()-.5)*.035;
      direction.y+=(seededRandom()-.5)*.035;
      direction.z+=(seededRandom()-.5)*.035;
      const radius=2.88+seededRandom()*.3;
      direction.normalize().multiplyScalar(radius);
      nodePositions.push(direction.x,direction.y,direction.z);
    }
    const baseNodePositions=new Float32Array(nodePositions);
    const nodeVelocity=new Float32Array(nodePositions.length);
    const nodeGeometry=new THREE.BufferGeometry();
    nodeGeometry.setAttribute("position",new THREE.Float32BufferAttribute(nodePositions,3));
    const nodeMaterial=new THREE.PointsMaterial({color:0x746a80,size:.045,transparent:true,opacity:.44,blending:THREE.NormalBlending,depthWrite:false});
    const surfaceNodes=new THREE.Points(nodeGeometry,nodeMaterial);
    sphereGroup.add(surfaceNodes);

    const networkPositions:number[]=[];
    const networkPairs:Array<[number,number]>=[];
    const connectedPairs=new Set<string>();
    const addNetworkEdge=(first:number,second:number)=>{
        const start=Math.min(first,second);
        const end=Math.max(first,second);
        const pairKey=`${start}:${end}`;
        if(connectedPairs.has(pairKey)) return;
        connectedPairs.add(pairKey);
        networkPairs.push([first,second]);
        networkPositions.push(nodePositions[first*3],nodePositions[first*3+1],nodePositions[first*3+2],nodePositions[second*3],nodePositions[second*3+1],nodePositions[second*3+2]);
    };
    if(topologyIndex){
      for(let index=0;index<topologyIndex.count;index+=3){
        const first=topologyIndex.getX(index);
        const second=topologyIndex.getX(index+1);
        const third=topologyIndex.getX(index+2);
        addNetworkEdge(first,second);
        addNetworkEdge(second,third);
        addNetworkEdge(third,first);
      }
    }
    const networkGeometry=new THREE.BufferGeometry();
    networkGeometry.setAttribute("position",new THREE.Float32BufferAttribute(networkPositions,3));
    const networkMaterial=new THREE.LineBasicMaterial({color:0x746a80,transparent:true,opacity:.08,blending:THREE.NormalBlending,depthWrite:false});
    const networkLines=new THREE.LineSegments(networkGeometry,networkMaterial);
    sphereGroup.add(networkLines);

    const particlePositions:number[]=[];
    for(let index=0;index<180;index++){
      const angle=index*2.399963;
      const y=1-(index/179)*2;
      const ring=Math.sqrt(1-y*y);
      const distance=4.8+((Math.sin(index*91.17)+1)*.5)*2.4;
      particlePositions.push(Math.cos(angle)*ring*distance,y*distance,Math.sin(angle)*ring*distance);
    }
    const particleGeometry=new THREE.BufferGeometry();
    particleGeometry.setAttribute("position",new THREE.Float32BufferAttribute(particlePositions,3));
    const particleMaterial=new THREE.PointsMaterial({color:0xBDA5FF,size:.032,transparent:true,opacity:.48,blending:THREE.AdditiveBlending,depthWrite:false});
    const particleField=new THREE.Points(particleGeometry,particleMaterial);
    sphereGroup.add(particleField);

    const orbitMaterials = [0x7C3CFF,0x7C3CFF,0xBDA5FF].map((color,index)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:index===2?.4:.56}));
    const orbitGeometries = [3.72,3.95,4.18].map(radius=>new THREE.TorusGeometry(radius,.018,8,160));
    const orbits = orbitGeometries.map((orbitGeometry,index)=>{
      const orbit=new THREE.Mesh(orbitGeometry,orbitMaterials[index]);
      orbit.rotation.set(index===0?Math.PI/2:Math.PI/3,index===1?Math.PI/2:Math.PI/7,index===2?Math.PI/3:0);
      sphereGroup.add(orbit);
      return orbit;
    });
    const satelliteGeometry=new THREE.SphereGeometry(.09,16,16);
    const satelliteMaterials=[0x7C3CFF,0xBDA5FF,0xBDA5FF].map(color=>new THREE.MeshBasicMaterial({color,transparent:true,opacity:.95,blending:THREE.AdditiveBlending}));
    const satellites=orbits.map((orbit,index)=>{
      const satellite=new THREE.Mesh(satelliteGeometry,satelliteMaterials[index]);
      orbit.add(satellite);
      return satellite;
    });
    const axisTextures:THREE.CanvasTexture[]=[];
    const axisMaterials:THREE.SpriteMaterial[]=[];
    const makeAxisLabel=(label:string,color:string,position:THREE.Vector3)=>{
      const labelCanvas=document.createElement("canvas");
      labelCanvas.width=192;
      labelCanvas.height=96;
      const context=labelCanvas.getContext("2d");
      if(!context) return;
      context.fillStyle="rgba(10,8,14,.88)";
      context.strokeStyle=color;
      context.lineWidth=3;
      context.beginPath();
      context.roundRect(35,10,122,76,18);
      context.fill();
      context.stroke();
      context.fillStyle="#E9E1D6";
      context.font="600 52px 'DM Sans', Arial";
      context.textAlign="center";
      context.textBaseline="middle";
      context.fillText(label,96,50);
      const texture=new THREE.CanvasTexture(labelCanvas);
      texture.colorSpace=THREE.SRGBColorSpace;
      const labelMaterial=new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false});
      const sprite=new THREE.Sprite(labelMaterial);
      sprite.position.copy(position);
      sprite.scale.set(1.05,.52,1);
      sprite.renderOrder=10;
      sphereGroup.add(sprite);
      axisTextures.push(texture);
      axisMaterials.push(labelMaterial);
    };
    makeAxisLabel("X","#4B1F8C",new THREE.Vector3(3.55,.15,.7));
    makeAxisLabel("Y","#7C3CFF",new THREE.Vector3(-.3,2.85,.75));
    makeAxisLabel("Z","#BDA5FF",new THREE.Vector3(-2.85,-1.45,1.35));

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.z = 14.5;
    scene.add(camera);

    const keyLight = new THREE.PointLight(0xffffff, 34, 100);
    keyLight.position.set(3, 7, 9);
    scene.add(keyLight);
    const rimLight = new THREE.PointLight(0x4B1F8C, 34, 100);
    rimLight.position.set(-7, -2, 4);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.08;

    const composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    const bloomPass=new UnrealBloomPass(new THREE.Vector2(1,1),.08,.2,.78);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.75;
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 2.2;

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const width = Math.max(1, bounds.width);
      const height = Math.max(1, bounds.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      composer.setSize(width,height);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    sphereGroup.scale.setScalar(0);
    const entrance = gsap.to(sphereGroup.scale, { x: 1, y: 1, z: 1, duration: 1.15, ease: "power3.out" });
    let dragging = false;
    const pointer={x:0,y:0};
    const raycaster=new THREE.Raycaster();
    let previousHit:THREE.Vector3|null=null;
    const pointerDown = () => { dragging = true;previousHit=null; canvas.classList.add("isDragging"); };
    const pointerUp = () => { dragging = false;previousHit=null; canvas.classList.remove("isDragging"); };
    const pointerMove = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      pointer.x=(x-.5)*2;
      pointer.y=(y-.5)*2;
      keyLight.position.x=3+pointer.x*4;
      keyLight.position.y=7-pointer.y*3;
      if(dragging){
        sphereGroup.updateMatrixWorld(true);
        raycaster.setFromCamera(new THREE.Vector2(pointer.x,-pointer.y),camera);
        const hit=raycaster.intersectObject(interactionSphere,false)[0];
        if(hit){
          surfaceNodes.updateMatrixWorld(true);
          const localHit=surfaceNodes.worldToLocal(hit.point.clone());
          if(previousHit){
            const dragDelta=localHit.clone().sub(previousHit);
            const positions=nodeGeometry.attributes.position.array as Float32Array;
            for(let index=0;index<nodeCount;index++){
              const offset=index*3;
              const dx=positions[offset]-localHit.x;
              const dy=positions[offset+1]-localHit.y;
              const dz=positions[offset+2]-localHit.z;
              const distance=Math.sqrt(dx*dx+dy*dy+dz*dz);
              if(distance<1.65){
                const influence=Math.pow(1-distance/1.65,2);
                const normal=new THREE.Vector3(positions[offset],positions[offset+1],positions[offset+2]).normalize();
                nodeVelocity[offset]+=dragDelta.x*2.8*influence+normal.x*.025*influence;
                nodeVelocity[offset+1]+=dragDelta.y*2.8*influence+normal.y*.025*influence;
                nodeVelocity[offset+2]+=dragDelta.z*2.8*influence+normal.z*.025*influence;
              }
            }
          }
          previousHit=localHit;
        }
      }
      const color = new THREE.Color().setRGB(.18+x*.48, .04+(1-y)*.18, .28+y*.42);
      if(dragging) gsap.to(material.color, { r: color.r, g: color.g, b: color.b, duration: 0.35, overwrite: true });
    };
    canvas.addEventListener("pointerdown", pointerDown);
    canvas.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);

    let frame = 0;
    const startedAt=performance.now();
    const baseCoreColor=new THREE.Color(0x0B0710);
    const baseWireColor=new THREE.Color(0x746a80);
    const axisCoreColors={Z:new THREE.Color(0x2A1450),X:new THREE.Color(0x2A1450),Y:new THREE.Color(0x4B1F8C)};
    const axisWireColors={Z:new THREE.Color(0x7C3CFF),X:new THREE.Color(0xBDA5FF),Y:new THREE.Color(0xBDA5FF)};
    const labelAxes:Axis[]=["X","Y","Z"];
    const orbitAxisIndexes:Record<Axis,number>={Z:0,X:1,Y:2};
    const render = () => {
      const elapsed=(performance.now()-startedAt)/1000;
      const positions=nodeGeometry.attributes.position.array as Float32Array;
      for(let offset=0;offset<positions.length;offset++){
        nodeVelocity[offset]*=.91;
        positions[offset]+=nodeVelocity[offset];
        positions[offset]+=(baseNodePositions[offset]-positions[offset])*.027;
      }
      nodeGeometry.attributes.position.needsUpdate=true;
      const linePositions=networkGeometry.attributes.position.array as Float32Array;
      networkPairs.forEach(([start,end],pairIndex)=>{
        const lineOffset=pairIndex*6;
        const startOffset=start*3;
        const endOffset=end*3;
        linePositions[lineOffset]=positions[startOffset];
        linePositions[lineOffset+1]=positions[startOffset+1];
        linePositions[lineOffset+2]=positions[startOffset+2];
        linePositions[lineOffset+3]=positions[endOffset];
        linePositions[lineOffset+4]=positions[endOffset+1];
        linePositions[lineOffset+5]=positions[endOffset+2];
      });
      networkGeometry.attributes.position.needsUpdate=true;
      const selectedAxis=activeAxisRef.current;
      const coreTarget=selectedAxis?axisCoreColors[selectedAxis]:baseCoreColor;
      const wireTarget=selectedAxis?axisWireColors[selectedAxis]:baseWireColor;
      const bloomTarget=selectedAxis==="Y"?.055:selectedAxis?.08:.035;
      bloomPass.strength+=(bloomTarget-bloomPass.strength)*.1;
      bloomPass.radius+=(selectedAxis==="Y"?.2:.32-bloomPass.radius)*.08;
      material.color.lerp(coreTarget,.075);
      wireMaterial.color.lerp(wireTarget,.09);
      nodeMaterial.color.lerp(wireTarget,.08);
      networkMaterial.color.lerp(wireTarget,.08);
      nodeMaterial.opacity+=((selectedAxis?.58:.38)-nodeMaterial.opacity)*.09;
      glowMaterial.uniforms.glowColor.value.lerp(wireTarget,.075);
      scanMaterial.uniforms.scanColor.value.lerp(wireTarget,.075);
      labelAxes.forEach((axis,labelIndex)=>{
        const targetOpacity=!selectedAxis||selectedAxis===axis?1:.025;
        axisMaterials[labelIndex].opacity+=(targetOpacity-axisMaterials[labelIndex].opacity)*.14;
      });
      orbitMaterials.forEach((orbitMaterial,orbitIndex)=>{
        const activeOpacity=orbitIndex===2?.28:.36;
        const targetOpacity=!selectedAxis||orbitAxisIndexes[selectedAxis]===orbitIndex?activeOpacity:.008;
        orbitMaterial.opacity+=(targetOpacity-orbitMaterial.opacity)*.12;
      });
      controls.update();
      if(!reducedMotion){
        orbits[0].rotation.z+=.0012;
        orbits[1].rotation.x-=.0009;
        orbits[2].rotation.y+=.001;
      }
      satellites.forEach((satellite,index)=>{
        const angle=elapsed*(.34+index*.08)+index*2.1;
        const radius=[3.72,3.95,4.18][index];
        satellite.position.set(Math.cos(angle)*radius,Math.sin(angle)*radius,0);
        const satelliteOpacity=!selectedAxis||orbitAxisIndexes[selectedAxis]===index?.72:.012;
        satelliteMaterials[index].opacity+=(satelliteOpacity-satelliteMaterials[index].opacity)*.14;
        const pulse=1+Math.sin(elapsed*3+index)*.35;
        satellite.scale.setScalar(pulse);
      });
      surfaceNodes.rotation.y=reducedMotion?0:elapsed*.035;
      networkLines.rotation.y=surfaceNodes.rotation.y;
      particleField.rotation.y=reducedMotion?0:-elapsed*.018;
      particleField.rotation.x=reducedMotion?0:Math.sin(elapsed*.16)*.08;
      scanMaterial.uniforms.time.value=elapsed;
      const targetX=-pointer.y*.11;
      const targetY=pointer.x*.14;
      sphereGroup.rotation.x+=(targetX-sphereGroup.rotation.x)*.025;
      sphereGroup.rotation.y+=(targetY-sphereGroup.rotation.y)*.025;
      glowSphere.scale.setScalar(1.075+(reducedMotion?0:Math.sin(elapsed*1.45)*.018));
      wireMaterial.opacity=.035+(reducedMotion?0:Math.sin(elapsed*1.4)*.018);
      const networkOpacityTarget=(selectedAxis?.105:.06)+(reducedMotion?0:Math.sin(elapsed*1.15)*(selectedAxis?.012:.008));
      networkMaterial.opacity+=(networkOpacityTarget-networkMaterial.opacity)*.09;
      composer.render();
      frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      entrance.kill();
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      interactionMaterial.dispose();
      wireMaterial.dispose();
      glowMaterial.dispose();
      scanMaterial.dispose();
      topologyGeometry.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      networkGeometry.dispose();
      networkMaterial.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      orbitGeometries.forEach(item=>item.dispose());
      orbitMaterials.forEach(item=>item.dispose());
      satelliteGeometry.dispose();
      satelliteMaterials.forEach(item=>item.dispose());
      axisTextures.forEach(item=>item.dispose());
      axisMaterials.forEach(item=>item.dispose());
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="utsSphereCanvas" aria-label="Esfera empresarial 3D interactiva" />;
}
