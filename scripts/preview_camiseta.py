# Render de verificacion de camiseta.glb
import bpy
import os
import math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'modelos', '_preview3.png')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

bpy.ops.import_scene.gltf(filepath=os.path.join(ROOT, 'public', 'modelos', 'camiseta.glb'))

scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 600
scene.render.resolution_y = 600
scene.render.film_transparent = False
scene.world.color = (0.02, 0.05, 0.12)

cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
bpy.context.collection.objects.link(cam)
cam.location = (0, 0.15, 2.2)
scene.camera = cam

light = bpy.data.objects.new('key', bpy.data.lights.new('key', 'AREA'))
bpy.context.collection.objects.link(light)
light.location = (1.5, 2, 2)
light.data.energy = 300
light.data.size = 3
light.rotation_euler = (0.4, 0, 0)

scene.render.filepath = OUT
bpy.ops.render.render(write_still=True)
print('preview ->', OUT)
