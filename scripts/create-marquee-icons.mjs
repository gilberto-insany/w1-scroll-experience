import * as THREE from '../dist/assets/vendor/three.module.js';
import { writeFileSync } from 'node:fs';

// Small vector fallbacks. The page renders these poses with the W's PBR maps.
const camera = new THREE.PerspectiveCamera(33, 1, .1, 30);
camera.position.set(0, 0, 6.8);
camera.updateMatrixWorld();
const key = new THREE.Vector3(-.5, .85, 1).normalize();
const poses = [[.25,-.4,-.22],[-.3,.5,.38],[.45,-.25,.75],[-.25,-.5,-.55]];
const shape = new THREE.Shape();
shape.moveTo(0,1.05);shape.lineTo(.72,0);shape.lineTo(0,-1.05);shape.lineTo(-.72,0);shape.closePath();
const original = new THREE.ExtrudeGeometry(shape,{depth:.26,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.055,bevelThickness:.055});
original.translate(0,0,-.13);
poses.forEach((pose,index)=>{
  const geometry = original.clone().applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...pose)));
  const p=geometry.attributes.position,normals=geometry.attributes.normal,triangles=[];
  for(let i=0;i<p.count;i+=3){
    const v=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,i+j));
    const center=v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
    const normal=new THREE.Vector3().fromBufferAttribute(normals,i).add(new THREE.Vector3().fromBufferAttribute(normals,i+1)).add(new THREE.Vector3().fromBufferAttribute(normals,i+2)).normalize();
    if(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).dot(camera.position.clone().sub(center))<=0)continue;
    const light=.25+Math.max(0,normal.dot(key))*.65;
    const color=[50,221,201].map(c=>Math.round(c*light));
    const points=v.map(point=>{const q=point.project(camera);return `${(64+q.x*64).toFixed(2)},${(64-q.y*64).toFixed(2)}`;}).join(' ');
    triangles.push({z:center.z,path:`<polygon points="${points}" fill="rgb(${color})" stroke="rgb(${color})" stroke-width=".3" stroke-linejoin="round"/>`});
  }
  triangles.sort((a,b)=>a.z-b.z);
  writeFileSync(new URL(`../dist/assets/marquee-diamond-${index+1}.svg`,import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${triangles.map(t=>t.path).join('')}</svg>\n`);
  geometry.dispose();
});
original.dispose();
