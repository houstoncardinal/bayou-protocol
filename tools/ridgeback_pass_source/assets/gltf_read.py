"""Minimal glTF 2.0 reader (separate .bin) returning numpy arrays per primitive."""
import json, os, numpy as np

CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}

class GLTF:
    def __init__(self, path):
        self.path = path; self.dir = os.path.dirname(path)
        self.j = json.load(open(path))
        self.bufs = [np.memmap(os.path.join(self.dir, b['uri']), dtype=np.uint8, mode='r') for b in self.j['buffers']]

    def acc(self, i):
        a = self.j['accessors'][i]; bv = self.j['bufferViews'][a['bufferView']]
        dt = np.dtype(CT[a['componentType']]); n = NC[a['type']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', 0)
        buf = self.bufs[bv.get('buffer', 0)]
        if not stride or stride == dt.itemsize * n:
            arr = np.frombuffer(buf, dtype=dt, count=a['count'] * n, offset=off).reshape(a['count'], n)
        else:
            raw = np.frombuffer(buf, dtype=np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=off)
            arr = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], dt.itemsize * n), strides=(stride, 1)).copy().view(dt).reshape(a['count'], n)
        if a.get('normalized'):
            arr = arr.astype(np.float32) / np.iinfo(dt).max
        return np.array(arr)

    def prims(self, mesh_index):
        out = []
        for p in self.j['meshes'][mesh_index]['primitives']:
            at = p['attributes']; mat = self.j['materials'][p['material']]
            d = {'material': mat['name'], 'pos': self.acc(at['POSITION']).astype(np.float32),
                 'idx': self.acc(p['indices']).reshape(-1, 3).astype(np.int64)}
            if 'NORMAL' in at: d['nrm'] = self.acc(at['NORMAL']).astype(np.float32)
            if 'TEXCOORD_0' in at: d['uv'] = self.acc(at['TEXCOORD_0']).astype(np.float32)
            out.append(d)
        return out

    def material_textures(self, name):
        for m in self.j['materials']:
            if m['name'] == name:
                pbr = m.get('pbrMetallicRoughness', {}); res = {}
                for key, slot in (('diff', pbr.get('baseColorTexture')), ('nor', m.get('normalTexture')), ('arm', pbr.get('metallicRoughnessTexture'))):
                    if slot:
                        img = self.j['images'][self.j['textures'][slot['index']]['source']]
                        res[key] = os.path.join(self.dir, img['uri'])
                return res
        return {}
