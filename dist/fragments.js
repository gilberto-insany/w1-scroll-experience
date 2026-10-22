import * as THREE from 'three';
import { mergeGeometries } from './assets/vendor/BufferGeometryUtils.js';

// Cut triangulated SVG faces into physical cells. Shared internal edges are
// discarded, so each piece has a front, a back and only its exterior walls.
function clipPolygon(polygon, axis, boundary, keepGreater) {
  const result = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length];
    const insideA = keepGreater ? a[axis] >= boundary : a[axis] <= boundary;
    const insideB = keepGreater ? b[axis] >= boundary : b[axis] <= boundary;
    if (insideA) result.push(a);
    if (insideA !== insideB) {
      const t = (boundary - a[axis]) / (b[axis] - a[axis]);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

function signedArea(points) {
  return points.reduce((sum, point, i) => {
    const next = points[(i + 1) % points.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

const pointKey = point => `${Math.round(point.x * 1e5)},${Math.round(point.y * 1e5)}`;
const seed = n => { const x = Math.sin(n * 127.1 + 19.7) * 43758.5453; return x - Math.floor(x); };

function cellGeometry(polygons, depth) {
  const vertices = [], edges = new Map();
  const z = depth / 2;
  const triangle = (a, b, c) => vertices.push(...a, ...b, ...c);
  for (let polygon of polygons) {
    if (Math.abs(signedArea(polygon)) < 1e-7) continue;
    if (signedArea(polygon) < 0) polygon = polygon.toReversed();
    for (let i = 1; i < polygon.length - 1; i++) {
      const a = polygon[0], b = polygon[i], c = polygon[i + 1];
      triangle([a.x,a.y,z], [b.x,b.y,z], [c.x,c.y,z]);
      triangle([c.x,c.y,-z], [b.x,b.y,-z], [a.x,a.y,-z]);
    }
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length];
      const ka = pointKey(a), kb = pointKey(b);
      if (ka === kb) continue;
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      if (edges.has(key)) edges.delete(key); else edges.set(key, [a,b]);
    }
  }
  for (const [a,b] of edges.values()) {
    triangle([a.x,a.y,-z], [b.x,b.y,-z], [b.x,b.y,z]);
    triangle([a.x,a.y,-z], [b.x,b.y,z], [a.x,a.y,z]);
  }
  if (!vertices.length) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function buildFragmentedLogo(shapes, bodyMaterial, edgeMaterial) {
  const root = new THREE.Group();
  const pieces = [];
  let pieceIndex = 0;
  for (const shape of shapes) {
    const { shape: contour, holes } = shape.extractPoints(18);
    const faces = THREE.ShapeUtils.triangulateShape(contour, holes);
    const points = [...contour, ...holes.flat()].map(point => ({ x: (point.x - 36) * .1, y: (18 - point.y) * .1 }));
    const triangles = faces.map(face => face.map(index => points[index]));
    for (let column = 0; column < 8; column++) {
      for (let row = 0; row < 4; row++) {
        const x0 = -3.6 + column * .9, y0 = -1.8 + row * .9;
        const polygons = [];
        for (const triangle of triangles) {
          let polygon = clipPolygon(triangle, 'x', x0, true);
          polygon = clipPolygon(polygon, 'x', x0 + .9, false);
          polygon = clipPolygon(polygon, 'y', y0, true);
          polygon = clipPolygon(polygon, 'y', y0 + .9, false);
          if (polygon.length >= 3) polygons.push(polygon);
        }
        const geometry = cellGeometry(polygons, .46);
        if (!geometry) continue;
        geometry.computeBoundingBox();
        const center = geometry.boundingBox.getCenter(new THREE.Vector3());
        geometry.translate(-center.x, -center.y, -center.z);
        const group = new THREE.Group();
        group.position.copy(center);
        group.add(new THREE.Mesh(geometry, bodyMaterial));
        const edges = new THREE.EdgesGeometry(geometry, 26);
        group.add(new THREE.LineSegments(edges, edgeMaterial));
        const n = ++pieceIndex;
        pieces.push({ group, center, delay: seed(n) * .24,
          drift: new THREE.Vector3((center.x * .28) + (seed(n+20)-.5)*1.6, center.y*.34 + (seed(n+40)-.5)*1.4, (seed(n+60)-.5)*3.4),
          rotation: new THREE.Vector3((seed(n+80)-.5)*1.25, (seed(n+100)-.5)*1.8, (seed(n+120)-.5)*.85) });
        root.add(group);
      }
    }
  }
  return { root, pieces };
}

export function buildStroke(shapes, material) {
  const geometries = [];
  for (const shape of shapes) {
    for (const contour of [shape, ...shape.holes]) {
      const points = contour.getPoints(36).map(point => new THREE.Vector3((point.x-36)*.1, (18-point.y)*.1, 0));
      if (points[0].distanceTo(points.at(-1)) > 1e-5) points.push(points[0].clone());
      for (const depth of [-.23,.23]) {
        const path = new THREE.CurvePath();
        for (let i = 1; i < points.length; i++) path.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1].x,points[i-1].y,depth), new THREE.Vector3(points[i].x,points[i].y,depth)));
        geometries.push(new THREE.TubeGeometry(path, Math.max(220,points.length*3), depth > 0 ? .016 : .010, 5, true));
      }
      // A few depth connectors reveal the hollow volume without a triangle mesh.
      const anchorIndices = new Set([0, Math.floor(points.length*.2), Math.floor(points.length*.45), Math.floor(points.length*.7)]);
      for (const i of anchorIndices) {
        const p = points[i];
        const path = new THREE.LineCurve3(new THREE.Vector3(p.x,p.y,-.23),new THREE.Vector3(p.x,p.y,.23));
        geometries.push(new THREE.TubeGeometry(path, 1, .009, 5, false));
      }
    }
  }
  const geometry = mergeGeometries(geometries);
  geometries.forEach(geometry => geometry.dispose());
  return new THREE.Mesh(geometry,material);
}
