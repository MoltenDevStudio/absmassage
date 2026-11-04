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
        <p className="center gift-vouchers-intro">
          Buy a massage gift voucher below, then send it by email or print it at
          home.
        </p>
        <GiftUpWidget />
        <section className="gift-vouchers-description">
          <h2>Massage gift vouchers in Christchurch</h2>
          <p>
            Help someone ease tension, relax and move better with a massage at
            my home studio in Heathcote Valley, Christchurch.
          </p>
          <p>
            Gift vouchers can be used towards any massage, whether they prefer
            deep tissue or sports massage, or something gentler. I tailor all
            massages to the individual, and recipients can book online at a time
            that suits them.
          </p>
        </section>
        <section
          className="gift-vouchers-faq"
          aria-labelledby="gift-vouchers-faq"
        >
          <h2 id="gift-vouchers-faq">Frequently asked questions</h2>
          <dl>
            <div>
              <dt>How long are gift vouchers valid?</dt>
              <dd>
                Gift vouchers are valid for three years from the date of
                purchase.
              </dd>
            </div>
            <div>
              <dt>Can vouchers be used towards any massage?</dt>
              <dd>
                Yes. All vouchers are issued as dollar-value credit and can be
                used towards any massage.
              </dd>
            </div>
            <div>
              <dt>How does the recipient book?</dt>
              <dd>
                Book online through my website, then bring your voucher or show
                it on your phone at your appointment.
              </dd>
            </div>
            <div>
              <dt>Can I print a gift voucher?</dt>
              <dd>Yes. Vouchers can be emailed or printed at home.</dd>
            </div>
          </dl>
        </section>
      </div>
    </main>
  )
}
