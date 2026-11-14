import bpy, sys, json
src, out, target = sys.argv[1], sys.argv[2], int(sys.argv[3])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
total = sum(len(o.data.polygons) for o in meshes)
for o in meshes:
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.remove_doubles(threshold=0.0005); bpy.ops.object.mode_set(mode='OBJECT')
    o.select_set(False)
for o in meshes:
    tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
    share = target * tris / max(1, sum(sum(len(p.vertices) - 2 for p in m.data.polygons) for m in meshes))
    for _ in range(5):
        tris = sum(len(p.vertices) - 2 for p in o.data.polygons)
        if tris <= share * 1.25: break
        d = o.modifiers.new('d', 'DECIMATE'); d.ratio = max(share / tris, 0.01); d.use_collapse_triangulate = True; d.delimit = set()
        bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier='d')
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_apply=True, export_yup=True)
print('decimated', sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes))
