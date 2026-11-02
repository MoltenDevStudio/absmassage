import type { Metadata } from 'next'
import GiftUpWidget from '../../components/GiftUpWidget'
import '../../styles/GiftVouchers.scss'

const title = 'Massage Gift Vouchers Christchurch | Andrew Bolton'
const description =
  'Give the gift of feeling better with a personalised massage in Christchurch. Choose a gift voucher value and let them book a time that suits them.'

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: 'https://andrewboltonsportsmassage.com/gift-vouchers',
  },
  openGraph: {
    title,
    description,
    url: 'https://andrewboltonsportsmassage.com/gift-vouchers',
    type: 'website',
    locale: 'en_NZ',
  },
}

export default function GiftVouchersPage() {
  return (
    <main>
      <div className="heading-wrapper">
        <h1 className="heading">Gift Vouchers</h1>
      </div>
      <div className="content-container gift-vouchers-page">
        <h2 className="p-heading">Give the gift of feeling better</h2>
        <p className="center">
          Treat someone to a personalised massage. Choose a gift voucher value
          and let them book a time that suits them.
        </p>
        <GiftUpWidget />
      </div>
    </main>
  )
}
