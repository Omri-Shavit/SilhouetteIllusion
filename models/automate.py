# import trimesh
# A = trimesh.load('A.stl')
# B = trimesh.load('B.stl')
# trimesh.exchange.export.export_mesh(intersection, "temp.stl", file_type='stl', resolver=None)

# import trimesh
# import math
# A = trimesh.load('A.stl')
# out = A.apply_transform(R)
# out = out.apply_transform(T)
# trimesh.exchange.export.export_mesh(out, "temp.stl", file_type='stl', resolver=None)
import os
import trimesh
import time
import math

start_time = time.time()

stls = []
for filename in os.listdir("./"):
    if not filename.endswith(".stl"):
        continue
    stls.append(filename)

stls.reverse()

R = trimesh.transformations.rotation_matrix(math.pi/2, [0, 0, 1], [0, 0, 0])
T = trimesh.transformations.scale_and_translate(1, [15, 0, 0])
things = len(stls) ** 2
completed = 0
for m1 in stls:
    m1_mesh = trimesh.load(m1)
    m1 = m1.replace(".stl", "")
    for m2 in stls:
        m2_mesh = trimesh.load(m2)
        m2 = m2.replace(".stl", "")
        m2_mesh = m2_mesh.apply_transform(R)
        m2_mesh = m2_mesh.apply_transform(T)
        intersect = intersection = trimesh.boolean.intersection([m1_mesh, m2_mesh], 'blender')
        trimesh.exchange.export.export_mesh(intersect, "%s_%s.stl" % (m1, m2), file_type='stl', resolver=None)
        completed += 1
        print(
            "%s_%s.stl generated: %s%% done. Estimated time remaining: %s seconds, avg: %s seconds/stl" %
            (m1, m2, 100*completed/things, (time.time()-start_time)*(things-completed)/completed, (time.time()-start_time)/completed)
        )

print("completed after %s seconds" % time.time()-start_time)
