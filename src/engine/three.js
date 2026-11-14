// 'three' for code outside the engine core (vite.config.js aliases the package name to this file).
// The classes are the core's own (see src/mods/00-three.js), so there is a single three.js in the game.
// The core module runs before anything that imports this (src/main.js imports the core first).
const T = globalThis.__BP_THREE();
// sanity check: a wrong name in 00-three.js would otherwise fail somewhere deep in a map loader
if (!new T.Group().isGroup || !new T.Mesh().isMesh || !new T.InstancedMesh(new T.BufferGeometry(), new T.MeshBasicMaterial(), 1).isInstancedMesh || !new T.LOD().isLOD || !T.Box3.prototype.setFromPoints || !T.Frustum.prototype.intersectsSphere || !new T.Fog().isFog || !T.PMREMGenerator.prototype.fromEquirectangular)
  console.error('[three] src/mods/00-three.js maps a class to the wrong core name');
export const {
  Vector2, Vector3, Quaternion, Matrix4, Sphere, Box3, Frustum, Color, Object3D, Group, LOD, Mesh, InstancedMesh, Points,
  BufferGeometry, BufferAttribute, Texture, MeshStandardMaterial, MeshBasicMaterial, DirectionalLight, HemisphereLight,
  PointLight, Fog, PerspectiveCamera, PMREMGenerator, FrontSide, DoubleSide, NoColorSpace, SRGBColorSpace,
  EquirectangularReflectionMapping, ClampToEdgeWrapping, RepeatWrapping, LinearMipmapLinearFilter, ACESFilmicToneMapping,
} = T;
