import * as THREE from 'three';
import { SVGLoader } from './assets/vendor/SVGLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from './assets/vendor/RectAreaLightUniformsLib.js';

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = () => window.innerWidth <= 800;
const state = { light: 0, turn: 0, size: 1, x: .85, y: 0, alpha: 1, pointerX: 0, pointerY: 0 };
const pointer = { x: 0, y: 0 };
const introRoot = document.documentElement;
if (motionQuery.matches) introRoot.classList.remove('intro-pending');
const startsWithLogo = introRoot.classList.contains('intro-pending');
const arrival = { progress: startsWithLogo ? 0 : 1, reveal: startsWithLogo ? 0 : 1 };
let renderer, scene, camera, logo, animationFrame, greenSoftbox;
let isVisible = true;
const stage = document.getElementById('logo-stage');

function createSurfaceTexture() {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 731;
  for (let i = 0; i < size * size; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const grain = 204 + (seed >>> 29);
    pixels[i*4] = pixels[i*4+1] = pixels[i*4+2] = grain;
    pixels[i*4+3] = 255;
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(.065, .065);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

function revealInterface() {
  introRoot.classList.remove('intro-pending');
  if (window.gsap) {
    window.gsap.fromTo('.header, .hero-top, .hero h1, .hero-bottom, .case-card', { autoAlpha: 0 }, { autoAlpha: 1, duration: .55, stagger: .045, ease: 'power2.out', onComplete: () => window.ScrollTrigger?.refresh() });
  }
}

async function createLogo() {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile() ? 1.5 : 2));
    renderer.setClearColor(0x080909, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    stage.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
    camera.position.set(0, 0, 14);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, .04).texture;
    scene.environmentIntensity = .35;
    room.dispose();
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-4, 6, 2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xb6bdb9, .8);
    rim.position.set(5, 2, -2);
    scene.add(rim);
    const lower = new THREE.DirectionalLight(0xd4d8d5, .3);
    lower.position.set(1, -5, 3);
    scene.add(lower);
    // A physical green strip light sweeps across the black metal as you scroll.
    // The material itself keeps its original graphite color throughout.
    RectAreaLightUniformsLib.init();
    greenSoftbox = new THREE.RectAreaLight(0x32ddc9, 22, 2.2, 6);
    scene.add(greenSoftbox);
    const surface = createSurfaceTexture();
    const faceMaterial = new THREE.MeshPhysicalMaterial({ color: 0x090b0a, metalness: .28, roughness: .48, roughnessMap: surface, bumpMap: surface, bumpScale: .002, clearcoat: .85, clearcoatRoughness: .22, envMapIntensity: .65 });
    const edgeMaterial = new THREE.MeshPhysicalMaterial({ color: 0x111714, metalness: .55, roughness: .23, clearcoat: 1, clearcoatRoughness: .14, envMapIntensity: 1.2 });
    // Keep the broad black face neutral; the bevel and side material carry
    // the colored rim. This avoids a bright green wash over the core.
    faceMaterial.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
        float neutralFinish = min(outgoingLight.r, min(outgoingLight.g, outgoingLight.b));
        outgoingLight = vec3(neutralFinish) + (outgoingLight - vec3(neutralFinish)) * 0.06;
        #include <opaque_fragment>
      `);
    };
    const material = [faceMaterial, edgeMaterial];
    const response = await fetch('./assets/w1.svg');
    if (!response.ok) throw new Error('Logo indisponível');
    const svg = new SVGLoader().parse(await response.text());
    logo = new THREE.Group();
    for (const path of svg.paths) {
      if (path.userData?.node?.nodeName !== 'path') continue;
      for (const shape of SVGLoader.createShapes(path)) {
        const geometry = new THREE.ExtrudeGeometry(shape, { depth: 6, steps: 1, bevelEnabled: true, bevelThickness: .48, bevelSize: .42, bevelSegments: 5, curveSegments: 24 });
        geometry.translate(-36, -18, -3);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(.1, -.1, .1);
        logo.add(mesh);
      }
    }
    scene.add(logo);
    resize();
    document.body.classList.add('webgl-ready');
    renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      cancelAnimationFrame(animationFrame);
      document.body.classList.remove('webgl-ready');
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => { document.body.classList.add('webgl-ready'); tick(); });
    if (window.gsap && introRoot.classList.contains('intro-pending')) {
      const opening = window.gsap.timeline({ defaults: { ease: 'power3.inOut' } });
      opening.to(arrival, { reveal: 1, duration: .25 }, 0)
        .to(arrival, { progress: 1, duration: 1.35 }, .15)
        .call(revealInterface);
    } else {
      arrival.progress = arrival.reveal = 1;
      introRoot.classList.remove('intro-pending');
    }
    tick();
  } catch (error) {
    introRoot.classList.remove('intro-pending');
    console.warn('Exibindo a versão vetorial da marca.', error.message);
    renderer?.domElement.remove();
    document.body.classList.remove('webgl-ready');
  }
}

function resize() {
  if (!renderer) return;
  const { width, height } = stage.getBoundingClientRect();
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function tick() {
  animationFrame = requestAnimationFrame(tick);
  if (!isVisible || document.hidden || !logo) return;
  const reduced = motionQuery.matches;
  state.pointerX += ((reduced ? 0 : pointer.x) - state.pointerX) * .055;
  state.pointerY += ((reduced ? 0 : pointer.y) - state.pointerY) * .055;
  const fitScale = mobile() ? Math.min(.84, camera.aspect * .9) : Math.min(.88, camera.aspect * .75);
  const enter = reduced ? 1 : arrival.progress;
  const intro = 1 - enter;
  logo.rotation.set(-.16 + state.turn*.04 + state.pointerY*.08, -.34 - state.turn*.1 + state.pointerX*.12, -.11 + state.turn*.025);
  logo.position.set(mobile() ? 0 : state.x * enter, (.35 + state.y) * enter, 0);
  logo.scale.setScalar(fitScale * state.size * (1 + intro * .28));
  const progress = reduced ? .15 : state.light;
  const angle = -.85 + progress * Math.PI * 1.6;
  greenSoftbox.position.set(logo.position.x + Math.cos(angle) * 5.4, logo.position.y + Math.sin(angle) * 3.8, -.25);
  greenSoftbox.lookAt(logo.position.x, logo.position.y, 0);
  greenSoftbox.intensity = (18 + Math.sin(progress * Math.PI) * 12) * enter * enter;
  renderer.domElement.style.opacity = String(state.alpha * arrival.reveal);
  renderer.render(scene, camera);
}

window.addEventListener('resize', resize, { passive: true });
window.addEventListener('pointermove', event => {
  pointer.x = (event.clientX / innerWidth - .5) * 2;
  pointer.y = (event.clientY / innerHeight - .5) * 2;
}, { passive: true });
window.addEventListener('pointerout', event => { if (!event.relatedTarget) pointer.x = pointer.y = 0; });
new IntersectionObserver(entries => { isVisible = entries[0].isIntersecting; }, { rootMargin: '100px' }).observe(document.querySelector('.dark-journey'));
createLogo();

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  media.add({ full: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    gsap.set(state, { light: 0, turn: 0, size: 1, x: .85, y: 0, alpha: 1 });
    if (context.conditions.full) {
      gsap.fromTo('.hero h1', { y: 0, autoAlpha: 1 }, { y: -70, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '12% top', end: 'bottom 20%', scrub: .5 } });
      gsap.fromTo('.hero-top, .hero-bottom, .case-card', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -25, ease: 'none', scrollTrigger: { trigger: '.hero', start: '10% top', end: '70% top', scrub: .4 } });
      const journey = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: '.dark-journey', start: 'top top', end: 'bottom bottom', scrub: .8 } });
      journey.to(state, { light: 1, turn: 1, size: .95, x: 1.1, y: .7, duration: 1 }, 0)
        .to(state, { alpha: .22, duration: .25 }, .75);
      gsap.from('.manifesto-copy', { autoAlpha: 0, y: 30, ease: 'none', scrollTrigger: { trigger: '.manifesto-copy', start: 'top 93%', end: 'top 72%', scrub: .4 } });
    }
  });
  document.fonts.ready.then(() => ScrollTrigger.refresh());
}
const header = document.querySelector('.header');
const solutions = document.querySelector('.solutions');
function updateHeader() {
  header.classList.toggle('scrolled', window.scrollY > 40);
  header.classList.toggle('light', solutions.getBoundingClientRect().top < 75);
}
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();
const menuButton = document.querySelector('.menu-button');
const menu = document.querySelector('#menu');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
  menu.hidden = true;
  menu.inert = true;
  header.classList.remove('menu-open');
  document.body.classList.remove('menu-is-open');
  requestAnimationFrame(() => { ScrollTrigger?.refresh(); ScrollTrigger?.update(); });
}
menuButton.addEventListener('click', () => {
  if (menuButton.getAttribute('aria-expanded') === 'true') return closeMenu();
  menu.hidden = false;
  menu.inert = false;
  menuButton.setAttribute('aria-expanded', 'true');
  menuButton.setAttribute('aria-label', 'Fechar menu');
  header.classList.add('menu-open');
  document.body.classList.add('menu-is-open');
});
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
window.addEventListener('hashchange', () => { ScrollTrigger?.refresh(); ScrollTrigger?.update(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { ScrollTrigger?.refresh(); ScrollTrigger?.update(); } });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !menu.hidden) { closeMenu(); menuButton.focus(); }
  if (event.key === 'Tab' && !menu.hidden) {
    const controls = [...header.querySelectorAll('a,button'), ...menu.querySelectorAll('a')];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});
document.querySelectorAll('.solution-list details').forEach(detail => {
  detail.addEventListener('toggle', () => {
    if (detail.open) document.querySelectorAll('.solution-list details').forEach(other => { if (other !== detail) other.open = false; });
    ScrollTrigger?.refresh();
  });
});

const caseDialog = document.getElementById('case-dialog');
document.querySelector('.case-card').addEventListener('click', () => caseDialog.showModal());
document.querySelector('.case-dialog-close').addEventListener('click', () => caseDialog.close());
caseDialog.addEventListener('click', event => {
  const rect = caseDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) caseDialog.close();
});
