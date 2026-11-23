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
  Vector4, DataTexture, DepthTexture, OrthographicCamera, ShaderMaterial, WebGLRenderTarget, Float32BufferAttribute,
  REVISION, GLSL3, NearestFilter, LinearFilter, UnsignedIntType, FloatType, HalfFloatType, UnsignedInt248Type,
  RGBAFormat, DepthFormat, DepthStencilFormat, RedFormat,
  // three.js's KTX2 loader (src/main.js, src/mods/01b-ktx2.js)
  CompressedTexture, CompressedArrayTexture, CompressedCubeTexture, Data3DTexture, FileLoader, Loader,
  NearestMipmapNearestFilter, LinearSRGBColorSpace, UnsignedByteType, UnsignedShortType, UnsignedInt5999Type,
  UnsignedInt101111Type, RGBFormat, RGFormat, RGB_S3TC_DXT1_Format, RGBA_S3TC_DXT1_Format, RGBA_S3TC_DXT5_Format,
  RGB_PVRTC_4BPPV1_Format, RGBA_PVRTC_4BPPV1_Format, RGBA_PVRTC_2BPPV1_Format, RGB_ETC1_Format, RGB_ETC2_Format,
  RGBA_ETC2_EAC_Format, R11_EAC_Format, SIGNED_R11_EAC_Format, RG11_EAC_Format, SIGNED_RG11_EAC_Format,
  RGBA_ASTC_4x4_Format, RGBA_ASTC_6x6_Format, RGBA_BPTC_Format, RGB_BPTC_UNSIGNED_Format, RED_RGTC1_Format,
  SIGNED_RED_RGTC1_Format, RED_GREEN_RGTC2_Format, SIGNED_RED_GREEN_RGTC2_Format, Matrix3, ColorManagement, SRGBTransfer,
  LinearTransfer,
} = T;
