import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
// Exercise the real generated shoulder geometry and production wingbeat without WebGL.
// Internal helpers are exposed only in this in-memory check, not in the browser API.
const root=new URL('../',import.meta.url).pathname;
const {transform}=await import(pathToFileURL(root+'/node_modules/esbuild/lib/main.js'));
const url=pathToFileURL(root+'/node_modules/three/build/three.module.js').href;
const THREE=await import(url);
let source=await fs.readFile(root+'src/components/swallow.ts','utf8');
assert(source.includes('  function pose(')&&source.includes('  function step('),'Production pose seam changed; update this check');
const pose=source.slice(source.indexOf('  function pose('),source.indexOf('  function step('));
source=source.replace("from 'three'",`from '${url}'`);
source+='\nexport {wingGeometry,shoulderGeometry,boxUVs,buildSwallow,flightFeathersGeometry,covertFeathersGeometry,wingWeights,planform,SPAN};';
source+=`\nexport function checkPose(parts,beat){const {bird,wings,tail,feet}=parts; const t=0,gustAt=0,beats=4; ${pose} pose(1+beat,0);}`;
const js=await transform(source,{loader:'ts',format:'esm'});
const module=await import('data:text/javascript;base64,'+Buffer.from(js.code).toString('base64'));
const wing=module.wingGeometry(), box=module.boxUVs(wing), cuff=module.shoulderGeometry(box);
// Coincident boundary vertices also need the same tessellation, otherwise two
// different polylines can still open small gaps between their sample stations.
const wingPositions=wing.getAttribute('position');
const cuffPositions=cuff.getAttribute('position');
const vertexKey=(x,z)=>`${x.toFixed(6)},${z.toFixed(6)}`;
const wingLattice=new Set();
for(let i=0;i<wingPositions.count;i++)wingLattice.add(vertexKey(wingPositions.getX(i),wingPositions.getZ(i)));
for(let i=0;i<cuffPositions.count;i++) {
 const [le,te]=module.planform(cuffPositions.getZ(i)/module.SPAN);
 if(cuffPositions.getZ(i)<.025 || Math.min(Math.abs(cuffPositions.getX(i)-le),Math.abs(cuffPositions.getX(i)-te))>1e-7)continue;
 assert(wingLattice.has(vertexKey(cuffPositions.getX(i),cuffPositions.getZ(i))),'Cuff edge uses a different tessellation from the main wing');
}
const mat=new THREE.ShaderMaterial();
const parts=module.buildSwallow(mat,mat,mat,new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial(),wing,cuff,module.flightFeathersGeometry(box),module.covertFeathersGeometry(box),new THREE.BufferGeometry());
const skinIndex=[],skinWeight=[],pos=cuff.getAttribute('position');
for(let i=0;i<pos.count;i++){
 const {bones,weights}=module.wingWeights(pos.getZ(i)/module.SPAN);
 skinIndex.push(...bones);skinWeight.push(...weights);
}
const probeGeo=cuff.clone();
probeGeo.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndex,4));
probeGeo.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeight,4));
const probe=new THREE.SkinnedMesh(probeGeo,mat);
let largestGap=0,samples=0,atPhase=0;
const a=new THREE.Vector3(),b=new THREE.Vector3();
for(let phase=0;phase<=1.001;phase+=.025){
 module.checkPose(parts,phase);parts.bird.updateMatrixWorld(true);
 parts.bird.traverse(mesh=>{
  if(!(mesh instanceof THREE.SkinnedMesh)||mesh.geometry!==cuff)return;
  mesh.skeleton.update();probe.bind(mesh.skeleton,mesh.bindMatrix);probe.bindMatrixInverse.copy(mesh.bindMatrixInverse);
  for(let i=0;i<pos.count;i++){
   // Leading and trailing cuffs have zero thickness and must meet the main wing
   // throughout its stroke. Buried inner vertices are deliberately not compared.
   const [leading,trailing]=module.planform(pos.getZ(i)/module.SPAN);
   const boundary=Math.min(Math.abs(pos.getX(i)-leading),Math.abs(pos.getX(i)-trailing))<1e-7;
   if(pos.getZ(i)<.025 || !boundary)continue;
   a.fromBufferAttribute(pos,i);b.copy(a);
   mesh.applyBoneTransform(i,a);probe.applyBoneTransform(i,b);
   const gap=a.distanceTo(b);if(gap>largestGap){largestGap=gap;atPhase=phase;}samples++;
  }
 });
}
console.log(JSON.stringify({largestGap,atPhase,samples,phases:41}));
assert(largestGap<1e-6,'Moving cuff boundary separates from wing: '+largestGap.toFixed(6));
