import * as THREE from '../dist/assets/vendor/three.module.js';
import { writeFileSync } from 'node:fs';

// Project real beveled geometry to SVG so the marquee needs no extra WebGL contexts.
const camera = new THREE.PerspectiveCamera(33, 1, .1, 30);
camera.position.set(0, 0, 6.8);
camera.updateMatrixWorld();
const rotation = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(.38, -.45, -.2));
const key = new THREE.Vector3(-.5, .85, 1).normalize();
const green = new THREE.Vector3(1, .45, -.1).normalize();
function render(name, geometry) {
  if (geometry.index) geometry = geometry.toNonIndexed();
  geometry.applyMatrix4(rotation);
  const p = geometry.attributes.position, normals = geometry.attributes.normal;
  const triangles = [];
  for (let i = 0; i < p.count; i += 3) {
    const v = [0, 1, 2].map(j => new THREE.Vector3().fromBufferAttribute(p, i+j));
    const center = v[0].clone().add(v[1]).add(v[2]).divideScalar(3);
    const normal = new THREE.Vector3().fromBufferAttribute(normals,i).add(new THREE.Vector3().fromBufferAttribute(normals,i+1)).add(new THREE.Vector3().fromBufferAttribute(normals,i+2)).normalize();
    const faceNormal = v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));
    if (faceNormal.dot(camera.position.clone().sub(center)) <= 0) continue;
    const white = Math.max(0,normal.dot(key));
    const rim = Math.pow(1-Math.abs(normal.z),.7) * Math.pow(Math.max(0, normal.dot(green)),.65);
    const rgb = [6+white*18+rim*58,8+white*21+rim*238,8+white*21+rim*210].map(Math.round);
    const points = v.map(point => { const q=point.project(camera);return `${(64+q.x*64).toFixed(2)},${(64-q.y*64).toFixed(2)}`; }).join(' ');
    triangles.push({z:center.z,path:`<polygon points="${points}" fill="rgb(${rgb})" stroke="rgb(${rgb})" stroke-width=".32" stroke-linejoin="round"/>`});
  }
  triangles.sort((a,b)=>a.z-b.z);
  writeFileSync(new URL(`../dist/assets/marquee-${name}.svg`, import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">${triangles.map(t=>t.path).join('')}</svg>\n`);
}
function extrude(points, depth) {
  const shape = new THREE.Shape();
  points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.065,bevelThickness:.065});
  geometry.translate(0,0,-depth/2);
  return geometry;
}
const square = new THREE.Shape();
square.moveTo(-.95,-.95);square.lineTo(.95,-.95);square.lineTo(.95,.95);square.lineTo(-.95,.95);square.closePath();
const hole = new THREE.Path();
hole.moveTo(-.53,-.53);hole.lineTo(-.53,.53);hole.lineTo(.53,.53);hole.lineTo(.53,-.53);hole.closePath();square.holes.push(hole);
const frame = new THREE.ExtrudeGeometry(square,{depth:.32,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.055,bevelThickness:.055});frame.translate(0,0,-.16);
render('frame',frame);
render('cross',extrude([[-.32,1.02],[.32,1.02],[.32,.32],[1.02,.32],[1.02,-.32],[.32,-.32],[.32,-1.02],[-.32,-1.02],[-.32,-.32],[-1.02,-.32],[-1.02,.32],[-.32,.32]],.38));
render('prism',new THREE.OctahedronGeometry(1.15,0));
render('cube',extrude([[-.75,-.75],[.75,-.75],[.75,.75],[-.75,.75]],1.5));
