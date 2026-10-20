import type { Metadata } from 'next'
import './admin.css'

export const metadata: Metadata = {
  title: 'Panel Admin - CJA',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
