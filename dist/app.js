import * as THREE from 'three';
import { SVGLoader } from './assets/vendor/SVGLoader.js';
import { RoomEnvironment } from './assets/vendor/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from './assets/vendor/RectAreaLightUniformsLib.js';

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const mobile = () => window.innerWidth <= 800;
const state = { light: 0, turn: 0, size: 1, x: .85, y: 0, alpha: 1, pointerX: 0, pointerY: 0 };
const pointer = { x: 0, y: 0 };
const arrival = { progress: motionQuery.matches ? 1 : 0 };
let renderer, scene, camera, logo, animationFrame, greenSoftbox;
let isVisible = true;
const stage = document.getElementById('logo-stage');

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
    scene.environmentIntensity = .7;
    room.dispose();
    pmrem.dispose();
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(-4, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xadbdb6, 1.4);
    rim.position.set(5, 2, -2);
    scene.add(rim);
    const lower = new THREE.DirectionalLight(0xc9ddd4, .65);
    lower.position.set(1, -5, 3);
    scene.add(lower);
    // A physical green strip light sweeps across the black metal as you scroll.
    // The material itself keeps its original graphite color throughout.
    RectAreaLightUniformsLib.init();
    greenSoftbox = new THREE.RectAreaLight(0x32e6a3, 16, 1.8, 6);
    scene.add(greenSoftbox);
    const material = new THREE.MeshPhysicalMaterial({ color: 0x1b211e, metalness: .96, roughness: .24, clearcoat: 1, clearcoatRoughness: .19, envMapIntensity: 1.9 });
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
    if (window.gsap && !motionQuery.matches && window.scrollY < window.innerHeight * .25) {
      window.gsap.to(arrival, { progress: 1, duration: 2.2, ease: 'power3.inOut' });
    } else {
      arrival.progress = 1;
    }
    tick();
  } catch (error) {
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
  logo.rotation.set(-.16 + intro*.11 + state.turn*.06 + state.pointerY*.08, -.34 + intro*.24 - state.turn*.12 + state.pointerX*.12, -.11 + intro*.11 + state.turn*.035);
  logo.position.set(mobile() ? 0 : state.x * enter, (.35 + state.y) * enter, 0);
  logo.scale.setScalar(fitScale * state.size * (1 + intro * .45));
  const progress = reduced ? .15 : state.light;
  greenSoftbox.position.set(logo.position.x - 5 + progress * 11, 3.5 - progress * 5, 4.5);
  greenSoftbox.lookAt(logo.position.x, logo.position.y, 0);
  greenSoftbox.intensity = (10 + Math.sin(progress * Math.PI) * 14) * (.25 + .75 * enter);
  renderer.domElement.style.opacity = String(state.alpha);
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
      gsap.from('.hero h1 > span', { yPercent: 20, autoAlpha: 0, duration: 1.2, delay: .65, stagger: .1, ease: 'power3.out' });
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
