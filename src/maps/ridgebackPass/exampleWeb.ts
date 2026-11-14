/**
 * Minimal web (Vite) wiring. Assets in public/maps/ridgeback_pass/ (served at /maps/ridgeback_pass/...).
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { loadRidgebackPass } from './loadRidgebackPass';

const gltf = new GLTFLoader(); gltf.setMeshoptDecoder(MeshoptDecoder);
const loadGLB = (url: unknown) => new Promise<GLTF>((res, rej) => gltf.load(url as string, res, undefined, rej));

export async function startRidgeback(scene: THREE.Scene, renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true;
  camera.far = Math.max(camera.far, 1500); camera.updateProjectionMatrix();       // distant mountains reach ~900 m
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const map = await loadRidgebackPass({ scene, world, RAPIER, renderer, loadGLB, quality: 'high',
    onProgress: (d, t) => console.log(`map ${Math.round((d / t) * 100)}%`) });
  const clock = new THREE.Clock();
  const tick = () => { map.update(camera, clock.getElapsedTime()); /* world.step(); renderer.render(scene, camera); */ };
  return { map, world, tick };
}
