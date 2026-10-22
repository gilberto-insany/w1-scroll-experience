import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildFragmentedLogo, buildStroke } from '../dist/fragments.js';

function verify(points, expectedArea, label) {
  const shape = new THREE.Shape(points.map(([x,y]) => new THREE.Vector2(x,y)));
  const material = new THREE.MeshBasicMaterial();
  const { pieces } = buildFragmentedLogo([shape], material, new THREE.LineBasicMaterial());
  let totalVolume = 0;
  for (const piece of pieces) {
    const positions = piece.group.children[0].geometry.getAttribute('position');
    let volume = 0;
    for (let i = 0; i < positions.count; i += 3) {
      const a = new THREE.Vector3().fromBufferAttribute(positions, i);
      const b = new THREE.Vector3().fromBufferAttribute(positions, i+1);
      const c = new THREE.Vector3().fromBufferAttribute(positions, i+2);
      assert([...a,...b,...c].every(Number.isFinite));
      volume += a.dot(new THREE.Vector3().crossVectors(b,c)) / 6;
    }
    assert(volume > 0, 'Every fragment must be a solid with outward facing normals');
    totalVolume += volume;
  }
  const expectedVolume = expectedArea * .01 * .46;
  assert(Math.abs(totalVolume - expectedVolume) < 1e-4, 'Cutting must preserve the complete silhouette and volume');
  const stroke = buildStroke([shape], material);
  stroke.geometry.computeBoundingBox();
  assert(stroke.geometry.boundingBox.max.z > .23 && stroke.geometry.boundingBox.min.z < -.23, 'Stroke must have front and rear depth');
  assert(pieces.length > 12, 'Logo should separate into independently animated pieces');
  console.log(label + ': ' + pieces.length + ' solid pieces; preserved volume and 3D stroke');
}
verify([[0,0],[72,0],[72,36],[0,36]],72*36,'Rectangle');
verify([[0,0],[72,0],[72,36],[36,18],[0,36]],72*36-72*18/2,'Concave silhouette');
