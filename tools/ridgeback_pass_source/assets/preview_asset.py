import bpy, sys, math, mathutils
files = sys.argv[1].split(','); out = sys.argv[2]; dist = float(sys.argv[3]) if len(sys.argv) > 3 else 14; tz = float(sys.argv[4]) if len(sys.argv) > 4 else 8
hdri = sys.argv[5] if len(sys.argv) > 5 else '/home/claude/ph/hdri/kloppenheim_05_2k.hdr'
bpy.ops.wm.read_factory_settings(use_empty=True); sc = bpy.context.scene
xoff = 0
for f in files:
    before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=f)
    new = [o for o in bpy.data.objects if o not in before and o.parent is None]
    for o in new: o.location.x += xoff
    xoff += float(sys.argv[6]) if len(sys.argv) > 6 else 9
bpy.ops.mesh.primitive_plane_add(size=200); g = bpy.context.object
m = bpy.data.materials.new('g'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.08, 0.1, 0.05, 1)
g.data.materials.append(m)
w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
env = w.node_tree.nodes.new('ShaderNodeTexEnvironment'); env.image = bpy.data.images.load(hdri)
w.node_tree.links.new(env.outputs[0], w.node_tree.nodes['Background'].inputs[0])
sun = bpy.data.objects.new('s', bpy.data.lights.new('s', 'SUN')); sun.data.energy = 3; sun.rotation_euler = (math.radians(50), 0, math.radians(30)); sc.collection.objects.link(sun)
cam = bpy.data.objects.new('c', bpy.data.cameras.new('c')); sc.collection.objects.link(cam); sc.camera = cam
cx = (xoff - (float(sys.argv[6]) if len(sys.argv) > 6 else 9)) / 2
cam.location = (cx, -dist, tz * 0.55); cam.data.lens = 35
cam.rotation_euler = (mathutils.Vector((cx, 0, tz * 0.5)) - cam.location).to_track_quat('-Z', 'Y').to_euler()
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 48; sc.cycles.use_denoising = True
sc.render.resolution_x = 1280; sc.render.resolution_y = 720; sc.view_settings.view_transform = 'AgX'
sc.render.filepath = out; bpy.ops.render.render(write_still=True)
