/**
 * Example wiring for an Expo / React Native + three.js + Rapier game.
 * If you ALREADY have a function that loads your character/weapon GLBs, pass that as `loadGLB`
 * and ignore `expoLoadGLB` below. It only needs: meshopt decoder + webp support (same as your Ch35 character).
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { decode as base64ToArrayBuffer } from 'base64-arraybuffer';
import { loadRidgebackPass } from './loadRidgebackPass';
import type { AssetRef } from './manifest';

const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);

/** Generic Expo GLB loader (use yours instead if you have one). */
export async function expoLoadGLB(ref: AssetRef): Promise<GLTF> {
  let buffer: ArrayBuffer;
  if (typeof ref === 'string') {
    buffer = await (await fetch(ref)).arrayBuffer();                  // web / dev server URL
  } else {
    const asset = Asset.fromModule(ref); await asset.downloadAsync();
    const b64 = await FileSystem.readAsStringAsync(asset.localUri ?? asset.uri, { encoding: FileSystem.EncodingType.Base64 });
    buffer = base64ToArrayBuffer(b64);
  }
  return new Promise((resolve, reject) => gltfLoader.parse(buffer, '', resolve, reject));
}

/** Call once when a match starts. */
export async function startRidgebackMatch(scene: THREE.Scene, renderer: THREE.WebGLRenderer, team: 'T' | 'CT', playerIndex: number) {
  await RAPIER.init();
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });

  const map = await loadRidgebackPass({
    scene, world, RAPIER,
    loadGLB: expoLoadGLB,
    quality: 'medium', renderer,        // 'high' on desktop / recent phones, 'low' on older devices
    tunnelLights: 'few',
    onProgress: (d, t) => console.log(`loading map ${Math.round((d / t) * 100)}%`),
  });

  // Player controller: keep max climb slope at ~45 deg (lanes are <= 28 deg, cliffs >= 55 deg)
  const controller = world.createCharacterController(0.02);
  controller.setMaxSlopeClimbAngle((map.data.player.recommendedMaxSlopeDeg * Math.PI) / 180);
  controller.setMinSlopeSlideAngle((50 * Math.PI) / 180);
  controller.enableAutostep(0.4, 0.2, true);
  controller.enableSnapToGround(0.4);

  const spawn = map.getSpawn(team, playerIndex);
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.position.x, spawn.position.y + 1.0, spawn.position.z));
  const collider = world.createCollider(RAPIER.ColliderDesc.capsule(0.55, 0.35), body);

  // in your game loop (every frame):
  //   map.update(camera, clock.elapsedTime);                // grass wind, tree LOD, shadow follow
  //   controller.computeColliderMovement(collider, desiredMove); body.setNextKinematicTranslation(...); world.step();
  //   hud.callout = map.getCallout(playerPos);              // "A Long", "Mid", "Mine Shaft", ...
  //   canPlant   = map.getBombSite(playerPos) !== null;    // 'A' | 'B' | null
  //   if (map.isOutOfBounds(playerPos)) respawn();
  return { map, world, controller, body, collider, spawnYaw: spawn.yaw };
}
