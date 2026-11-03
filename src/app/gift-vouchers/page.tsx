import type { Metadata } from 'next'
import GiftUpWidget from '../../components/GiftUpWidget'
import '../../styles/GiftVouchers.scss'

const title = 'Massage Gift Vouchers Christchurch | Andrew Bolton'
const description =
  'Massage gift vouchers in Christchurch. Choose a voucher value, with email delivery or printing at home.'

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
        <p className="center">
          Choose a gift voucher value below. Vouchers can be emailed or printed
          at home.
        </p>
        <GiftUpWidget />
      </div>
    </main>
  )
}
