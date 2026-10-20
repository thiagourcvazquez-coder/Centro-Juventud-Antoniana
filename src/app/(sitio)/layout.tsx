import Header from '@/components/Header'
import Footer from '@/components/Footer'
import CartButton from '@/components/CartButton'
import CartPanel from '@/components/CartPanel'
import ScrollFx from '@/components/fx/ScrollFx'
import WhatsAppButton from '@/components/WhatsAppButton'

export default function SitioLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ScrollFx />
      <Header />
      {children}
      <Footer />
      <WhatsAppButton />
      <CartButton />
      <CartPanel />
    </>
  )
}
