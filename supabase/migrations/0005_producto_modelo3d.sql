-- Ruta al modelo 3D (.glb) del producto, ej. '/modelos/camiseta.glb'
alter table public.productos add column if not exists modelo_3d text;
