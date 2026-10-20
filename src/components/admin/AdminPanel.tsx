'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { fmtPrecio } from '@/lib/constants'
import type { Cliente, CodigoSocio, Producto, Venta } from '@/lib/types'

type Tab = 'ventas' | 'clientes' | 'stock' | 'codigos'

const sb = createClient()

export default function AdminPanel() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('ventas')
  const [toast, setToast] = useState('')
  const [toastVisible, setToastVisible] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const mostrarToast = useCallback((msg: string) => {
    setToast(msg)
    setToastVisible(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastVisible(false), 2800)
  }, [])

  async function logout() {
    await sb.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  return (
    <div id="admin-panel" style={{ display: 'block' }}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <img src="/images/escudo.png" alt="CJA" />
          <span>
            Juventud Antoniana
            <small>Panel de gestión</small>
          </span>
        </div>
        <nav className="sidebar-nav">
          {(
            [
              ['ventas', '💳', 'Ventas'],
              ['clientes', '👥', 'Clientes'],
              ['stock', '📦', 'Stock'],
              ['codigos', '🎟️', 'Códigos'],
            ] as [Tab, string, string][]
          ).map(([key, icono, label]) => (
            <button
              key={key}
              className={`nav-item${tab === key ? ' active' : ''}`}
              onClick={() => setTab(key)}
            >
              <span className="nav-icon">{icono}</span>
              <span className="nav-label">{label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <button className="btn-logout" onClick={logout}>
            ⏻ Cerrar sesión
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="main">
        {tab === 'ventas' && <VentasTab />}
        {tab === 'clientes' && <ClientesTab mostrarToast={mostrarToast} />}
        {tab === 'stock' && <StockTab mostrarToast={mostrarToast} />}
        {tab === 'codigos' && <CodigosTab mostrarToast={mostrarToast} />}
      </main>

      {/* TOAST */}
      <div id="toast" className={`toast${toastVisible ? ' show' : ''}`}>
        {toast}
      </div>
    </div>
  )
}

/* ==================== VENTAS ==================== */

function VentasTab() {
  const [ventas, setVentas] = useState<Venta[] | null>(null)
  const [busqueda, setBusqueda] = useState('')

  const cargar = useCallback(async () => {
    const { data } = await sb
      .from('ventas')
      .select('*')
      .order('created_at', { ascending: false })
    setVentas((data ?? []) as Venta[])
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filtradas = (ventas ?? []).filter(
    v =>
      (v.nombre_cliente ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (v.email_cliente ?? '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (v.dni_cliente ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  )

  const total = (ventas ?? []).reduce((s, v) => s + Number(v.total), 0)
  const conDescuento = (ventas ?? []).filter(v => v.descuento_socio).length
  const tarjeta = (ventas ?? []).filter(v => v.metodo_pago === 'tarjeta').length
  const mp = (ventas ?? []).filter(v => v.metodo_pago === 'mercadopago').length

  return (
    <div id="page-ventas" className="page active">
      <div className="page-header">
        <h1>Ventas</h1>
      </div>
      <div className="stats-grid" id="ventas-stats">
        <div className="stat-card">
          <div className="label">Total ventas</div>
          <div className="value">{ventas?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="label">Recaudado</div>
          <div className="value">${fmtPrecio(total)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Con descuento socio</div>
          <div className="value">{conDescuento}</div>
        </div>
        <div className="stat-card">
          <div className="label">Tarjeta / MP</div>
          <div className="value">
            {tarjeta} / {mp}
          </div>
        </div>
      </div>
      <div className="tabla-container">
        <div className="table-toolbar">
          <input
            className="search-input"
            placeholder="🔍 Buscar por cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Email</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Total</th>
                <th>Método</th>
                <th>Socio</th>
              </tr>
            </thead>
            <tbody>
              {ventas === null ? (
                <tr className="loading-row">
                  <td colSpan={8}>Cargando...</td>
                </tr>
              ) : filtradas.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <div className="icon">💳</div>
                      <p>Sin ventas</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtradas.map(v => (
                  <tr key={v.id}>
                    <td>
                      {new Date(v.created_at).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{v.nombre_cliente || 'Anónimo'}</td>
                    <td>{v.email_cliente || '—'}</td>
                    <td>{v.dni_cliente || '—'}</td>
                    <td>{v.tel_cliente || '—'}</td>
                    <td>
                      <strong>${fmtPrecio(Number(v.total))}</strong>
                    </td>
                    <td>
                      <span className={`badge badge-${v.metodo_pago}`}>
                        {v.metodo_pago}
                      </span>
                    </td>
                    <td>{v.descuento_socio ? '✅' : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ==================== CLIENTES ==================== */

function ClientesTab({
  mostrarToast,
}: {
  mostrarToast: (m: string) => void
}) {
  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '' })

  const cargar = useCallback(async () => {
    const { data, error } = await sb
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      mostrarToast('Error cargando clientes')
      return
    }
    setClientes((data ?? []) as Cliente[])
  }, [mostrarToast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const filtrados = (clientes ?? []).filter(
    c =>
      c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (c.email ?? '').toLowerCase().includes(busqueda.toLowerCase()),
  )

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre: '', email: '', telefono: '' })
    setModalAbierto(true)
  }

  function abrirEditar(c: Cliente) {
    setEditando(c)
    setForm({
      nombre: c.nombre ?? '',
      email: c.email ?? '',
      telefono: c.telefono ?? '',
    })
    setModalAbierto(true)
  }

  async function guardar() {
    const nombre = form.nombre.trim()
    if (!nombre) {
      mostrarToast('El nombre es obligatorio')
      return
    }
    const payload = {
      nombre,
      email: form.email.trim(),
      telefono: form.telefono.trim(),
    }
    const { error } = editando
      ? await sb.from('clientes').update(payload).eq('id', editando.id)
      : await sb.from('clientes').insert(payload)

    if (error) {
      mostrarToast(editando ? 'Error al actualizar' : 'Error al crear cliente')
      return
    }
    mostrarToast(editando ? '✅ Cliente actualizado' : '✅ Cliente creado')
    setModalAbierto(false)
    cargar()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este cliente?')) return
    const { error } = await sb.from('clientes').delete().eq('id', id)
    if (error) {
      mostrarToast('Error al eliminar')
      return
    }
    mostrarToast('✅ Cliente eliminado')
    cargar()
  }

  return (
    <div id="page-clientes" className="page active">
      <div className="page-header">
        <h1>Clientes</h1>
        <button className="btn-add" onClick={abrirNuevo}>
          + Nuevo Cliente
        </button>
      </div>
      <div className="tabla-container">
        <div className="table-toolbar">
          <input
            className="search-input"
            placeholder="🔍 Buscar cliente..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes === null ? (
                <tr className="loading-row">
                  <td colSpan={5}>Cargando...</td>
                </tr>
              ) : filtrados.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <div className="icon">👥</div>
                      <p>Sin clientes</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtrados.map(c => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.email || '—'}</td>
                    <td>{c.telefono || '—'}</td>
                    <td>{new Date(c.created_at).toLocaleDateString('es-AR')}</td>
                    <td>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => abrirEditar(c)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => eliminar(c.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CLIENTE */}
      <div
        className={`modal-overlay${modalAbierto ? ' open' : ''}`}
        onClick={e => {
          if (e.target === e.currentTarget) setModalAbierto(false)
        }}
      >
        <div className="modal-box">
          <h3>{editando ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              placeholder="Nombre completo"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="email@ejemplo.com"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              placeholder="387..."
              value={form.telefono}
              onChange={e => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalAbierto(false)}>
              Cancelar
            </button>
            <button className="btn-save" onClick={guardar}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==================== STOCK ==================== */

const TALLES_ADMIN = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

const FORM_PROD_INICIAL = {
  nombre: '',
  precio: '',
  tieneTalle: 'true',
  imagen: '',
  xs: '0',
  s: '0',
  m: '0',
  l: '0',
  xl: '0',
  xxl: '0',
  sinTalle: '0',
}

function StockTab({ mostrarToast }: { mostrarToast: (m: string) => void }) {
  const [productos, setProductos] = useState<Producto[] | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState<Producto | null>(null)
  const [form, setForm] = useState(FORM_PROD_INICIAL)

  const cargar = useCallback(async () => {
    const { data, error } = await sb
      .from('productos')
      .select('*')
      .order('nombre')
    if (error) {
      mostrarToast('Error cargando stock')
      return
    }
    setProductos((data ?? []) as Producto[])
  }, [mostrarToast])

  useEffect(() => {
    cargar()
  }, [cargar])

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_PROD_INICIAL)
    setModalAbierto(true)
  }

  function abrirEditar(p: Producto) {
    setEditando(p)
    setForm({
      nombre: p.nombre,
      precio: String(p.precio_base),
      tieneTalle: String(p.tiene_talle),
      imagen: p.imagen_url ?? '',
      xs: String(p.stock_xs ?? 0),
      s: String(p.stock_s ?? 0),
      m: String(p.stock_m ?? 0),
      l: String(p.stock_l ?? 0),
      xl: String(p.stock_xl ?? 0),
      xxl: String(p.stock_xxl ?? 0),
      sinTalle: String(p.stock_sin_talle ?? 0),
    })
    setModalAbierto(true)
  }

  async function guardar() {
    const nombre = form.nombre.trim()
    const precio = Number(form.precio)
    if (!nombre || !precio) {
      mostrarToast('Nombre y precio son obligatorios')
      return
    }
    const tieneTalle = form.tieneTalle === 'true'
    const payload = {
      nombre,
      precio_base: precio,
      tiene_talle: tieneTalle,
      imagen_url: form.imagen.trim() || null,
      stock_xs: tieneTalle ? Number(form.xs) : 0,
      stock_s: tieneTalle ? Number(form.s) : 0,
      stock_m: tieneTalle ? Number(form.m) : 0,
      stock_l: tieneTalle ? Number(form.l) : 0,
      stock_xl: tieneTalle ? Number(form.xl) : 0,
      stock_xxl: tieneTalle ? Number(form.xxl) : 0,
      stock_sin_talle: tieneTalle ? 0 : Number(form.sinTalle),
    }
    const { error } = editando
      ? await sb.from('productos').update(payload).eq('id', editando.id)
      : await sb.from('productos').insert(payload)

    if (error) {
      mostrarToast(editando ? 'Error al actualizar' : 'Error al crear producto')
      return
    }
    mostrarToast(editando ? '✅ Producto actualizado' : '✅ Producto creado')
    setModalAbierto(false)
    cargar()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    const { error } = await sb.from('productos').delete().eq('id', id)
    if (error) {
      mostrarToast('Error al eliminar')
      return
    }
    mostrarToast('✅ Producto eliminado')
    cargar()
  }

  const tieneTalle = form.tieneTalle === 'true'

  return (
    <div id="page-stock" className="page active">
      <div className="page-header">
        <h1>Stock</h1>
        <button className="btn-add" onClick={abrirNuevo}>
          + Nuevo Producto
        </button>
      </div>
      <div id="stock-grid" className="stock-grid">
        {productos === null ? (
          <p style={{ color: 'var(--gris)' }}>Cargando...</p>
        ) : productos.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📦</div>
            <p>Sin productos</p>
          </div>
        ) : (
          productos.map(p => (
            <div className="stock-card" key={p.id}>
              <div className="stock-card-header">
                <h3>{p.nombre}</h3>
                <span className="precio">${fmtPrecio(Number(p.precio_base))}</span>
              </div>
              <div className="talles-stock">
                {p.tiene_talle ? (
                  TALLES_ADMIN.map(t => {
                    const key = `stock_${t.toLowerCase()}` as keyof Producto
                    const qty = Number(p[key] ?? 0)
                    const cls = qty === 0 ? 'out' : qty <= 3 ? 'low' : ''
                    return (
                      <div className={`talle-chip ${cls}`} key={t}>
                        <span className="talle-label">{t}</span>
                        <span className="talle-qty">{qty}</span>
                      </div>
                    )
                  })
                ) : (
                  <div className="talle-chip">
                    <span className="talle-label">STOCK</span>
                    <span className="talle-qty">{p.stock_sin_talle ?? 0}</span>
                  </div>
                )}
              </div>
              <div className="stock-card-actions">
                <button
                  className="btn-action btn-edit"
                  onClick={() => abrirEditar(p)}
                >
                  Editar
                </button>
                <button
                  className="btn-action btn-delete"
                  onClick={() => eliminar(p.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL PRODUCTO */}
      <div
        className={`modal-overlay${modalAbierto ? ' open' : ''}`}
        onClick={e => {
          if (e.target === e.currentTarget) setModalAbierto(false)
        }}
      >
        <div className="modal-box">
          <h3>{editando ? 'Editar Producto' : 'Nuevo Producto'}</h3>
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              placeholder="Nombre del producto"
              value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Precio Base ($)</label>
            <input
              type="number"
              placeholder="80500"
              value={form.precio}
              onChange={e => setForm({ ...form, precio: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>¿Tiene talles?</label>
            <select
              value={form.tieneTalle}
              onChange={e => setForm({ ...form, tieneTalle: e.target.value })}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </div>
          {tieneTalle ? (
            <div id="talles-inputs">
              <div className="talles-grid">
                {TALLES_ADMIN.map(t => {
                  const campo = t.toLowerCase() as 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl'
                  return (
                    <div className="form-group" key={t}>
                      <label>{t}</label>
                      <input
                        type="number"
                        value={form[campo]}
                        onChange={e =>
                          setForm({ ...form, [campo]: e.target.value })
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div id="sin-talle-input">
              <div className="form-group">
                <label>Stock</label>
                <input
                  type="number"
                  value={form.sinTalle}
                  onChange={e =>
                    setForm({ ...form, sinTalle: e.target.value })
                  }
                />
              </div>
            </div>
          )}
          <div className="form-group">
            <label>URL Imagen</label>
            <input
              type="text"
              placeholder="images/producto.jpg"
              value={form.imagen}
              onChange={e => setForm({ ...form, imagen: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalAbierto(false)}>
              Cancelar
            </button>
            <button className="btn-save" onClick={guardar}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==================== CÓDIGOS SOCIO ==================== */

function CodigosTab({ mostrarToast }: { mostrarToast: (m: string) => void }) {
  const [codigos, setCodigos] = useState<CodigoSocio[] | null>(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [nuevoCodigo, setNuevoCodigo] = useState('')

  const cargar = useCallback(async () => {
    const { data, error } = await sb
      .from('codigos_socio')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      mostrarToast('Error cargando códigos')
      return
    }
    setCodigos((data ?? []) as CodigoSocio[])
  }, [mostrarToast])

  useEffect(() => {
    cargar()
  }, [cargar])

  async function guardar() {
    const codigo = nuevoCodigo.trim()
    if (!codigo) {
      mostrarToast('Ingresá un código')
      return
    }
    const { error } = await sb.from('codigos_socio').insert({ codigo })
    if (error) {
      mostrarToast('Error al crear código (¿ya existe?)')
      return
    }
    mostrarToast('✅ Código creado')
    setModalAbierto(false)
    setNuevoCodigo('')
    cargar()
  }

  async function toggle(id: string, activo: boolean) {
    const { error } = await sb
      .from('codigos_socio')
      .update({ activo: !activo })
      .eq('id', id)
    if (error) {
      mostrarToast('Error al actualizar')
      return
    }
    mostrarToast(`✅ Código ${!activo ? 'activado' : 'desactivado'}`)
    cargar()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este código?')) return
    const { error } = await sb.from('codigos_socio').delete().eq('id', id)
    if (error) {
      mostrarToast('Error al eliminar')
      return
    }
    mostrarToast('✅ Código eliminado')
    cargar()
  }

  return (
    <div id="page-codigos" className="page active">
      <div className="page-header">
        <h1>Códigos Socio</h1>
        <button className="btn-add" onClick={() => setModalAbierto(true)}>
          + Nuevo Código
        </button>
      </div>
      <div className="tabla-container">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {codigos === null ? (
                <tr className="loading-row">
                  <td colSpan={4}>Cargando...</td>
                </tr>
              ) : codigos.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <div className="icon">🎟️</div>
                      <p>Sin códigos</p>
                    </div>
                  </td>
                </tr>
              ) : (
                codigos.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.codigo}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge badge-${c.activo ? 'activo' : 'inactivo'}`}
                      >
                        {c.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>{new Date(c.created_at).toLocaleDateString('es-AR')}</td>
                    <td>
                      <button
                        className="btn-action btn-edit"
                        onClick={() => toggle(c.id, c.activo)}
                      >
                        {c.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button
                        className="btn-action btn-delete"
                        onClick={() => eliminar(c.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CÓDIGO */}
      <div
        className={`modal-overlay${modalAbierto ? ' open' : ''}`}
        onClick={e => {
          if (e.target === e.currentTarget) setModalAbierto(false)
        }}
      >
        <div className="modal-box">
          <h3>Nuevo Código de Socio</h3>
          <div className="form-group">
            <label>Código</label>
            <input
              type="text"
              placeholder="Ej: Antoniano1916"
              value={nuevoCodigo}
              onChange={e => setNuevoCodigo(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalAbierto(false)}>
              Cancelar
            </button>
            <button className="btn-save" onClick={guardar}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
