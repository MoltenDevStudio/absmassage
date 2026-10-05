import { Metadata } from 'next/types'

export const metadata: Metadata = {
  title: 'Privacy Policy - Andrew Bolton Sports Massage',
  description:
    'Professional, strong & effective massage to relieve your pain and tension now. Become relaxed, rejuvenated & pain free today.',
  alternates: {
    canonical: 'https://andrewboltonsportsmassage.com/privacypolicy',
  },
  robots: 'noindex, nofollow',
}

function privacypolicy() {
  return (
    <div>
      <div className="heading-wrapper">
        <h1 className="heading">Privacy Policy</h1>
      </div>
      <div className="content-container">
        <p className="center">
          <strong>
            I take privacy seriously and this page informs you of our policies
            regarding the collection, use and disclosure of personal
            information.
          </strong>
        </p>
        <p>
          We’re committed to protecting the privacy of all individuals that
          provide personal information to us, including the data recorded by
          customers when you book an appointment.
        </p>
        <p>
          {`This privacy policy explains how we collect, protect, use and share
          personal information. We may review and change this policy from time
          to time. When we do, we'll update this version located at
          https://www.andrewboltonsportsmassage.com/privacy-policy`}
        </p>
        <h2 className="p-heading mt-2">Personal information we collect</h2>
        <p>
          We collect personal data in a couple of different ways—directly and
          indirectly.
        </p>

        <p>
          <strong>Personal information we collect directly from you</strong>
        </p>

        <p>
          We directly collect Personal Information if you book an appointment
          online and if you send an enquiry to us from our website, or get in
          touch with us by chat, email, or phone.
        </p>

        <p>
          We may also collect some personal information if you engage with us
          through social media. This information can include and is not limited
          to your name, gender, date of birth, country of birth, addresses,
          telephone numbers, email addresses.
        </p>

        <p>
          We do not directly collect any special categories of personal data
          about you. This includes details about your race or ethnicity,
          religious or philosophical beliefs, sex life, sexual orientation,
          political opinions, trade union membership, and genetic and biometric
          data. Nor do we collect any information about criminal convictions and
          offences.
        </p>

        <p>
          <strong>Personal information we collect indirectly</strong>
        </p>

        <p>
          Very rarely we indirectly collect personal information when someone is
          referred to our practice. A possible scenario would be when a
          healthcare professional refers a patient to our office and sends
          personal information about a patient.
        </p>
        <p>
          This information can include and is not limited to names, genders,
          dates of birth, countries of birth, residential addresses, telephone
          numbers, email addresses, a person’s emergency contacts, health
          insurance numbers, ACC claim details, health history, health status
          and patient treatment notes and records.
        </p>
        <p>
          In addition, in order to improve our services, we use data that can be
          retrieved from cookies, and other technology whose purpose is
          gathering data about website use. This data may include:
        </p>
        <ul className="ml-4 list-inside list-disc">
          <li className=" mt-2">
            Browser and hardware data, such as IP address, type of device,
            operating system, browser type, screen resolution, language, device
            make and model, as well as the versions of the above mentioned
            services.
          </li>
          <li className=" mt-2">
            Cookie and tracking technology data, which would include pages
            visited, time spent on pages, language preferences, and traffic
            data. Advertising tools may associate this data with your device or
            account; see the optional tracking section below for details.
          </li>
        </ul>
        <h2 className="p-heading mt-2">
          Optional analytics and advertising tracking
        </h2>
        <p>
          When you accept optional tracking, we may use Google analytics and
          advertising technologies loaded through Google Tag Manager, and the
          Meta Pixel. These help us understand website use and measure our
          marketing. Google Tag Manager is the tool that loads tracking tags. It
          and the Meta Pixel are disabled unless you accept.
        </p>
        <p>
          Google and Meta may receive information about visits, pages viewed,
          device and browser details, IP addresses, and interactions with the
          website or our ads. They may associate measurement information with
          your device or account and process it under their own privacy
          policies. See{' '}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google’s advertising privacy information
          </a>{' '}
          and{' '}
          <a
            href="https://www.facebook.com/privacy/policy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Meta’s Privacy Policy
          </a>
          .
        </p>
        <p>
          You can reject optional tracking or withdraw consent later using
          Cookie settings at the bottom left of the page. Withdrawal clears
          supported advertising and measurement cookies and may refresh the page
          to stop tracking tags that have already loaded. A first-party
          functional cookie remembers your choice for up to a year, including
          when you reject optional tracking. Other open tabs on this website
          receive updates to your choice.
        </p>
        <p>
          With consent, we also retain Google ad click identifiers for booking
          attribution and may include them in links to our Cliniko booking
          service. They are cleared when you withdraw consent. Separately,
          Vercel Web Analytics and Speed Insights provide cookieless website
          statistics and performance measurements; they are not used for
          advertising profiles and remain outside this optional tracking choice.
        </p>
        <h2 className="p-heading mt-2">How this information is used</h2>
        <p>
          In general, personal information we collect is used by us to inform
          our decision making in how to best look after the client. The personal
          information we collect about our own clients may also be used for
          billing, identification, authentication, and for contacting them if we
          need to.
        </p>
        <p>
          We may, with consent, use email addresses to share reports, advice,
          news, tips, updates and special offers. People who receive these
          promotional emails can unsubscribe at any time, please email
          andrew@andrewboltonsportsmassage.com with UNSUBSCRIBE in the subject
          line.
        </p>
        <p>
          Personal information relating to third parties will not be shared with
          any other entity unless the person it relates to has requested that it
          is shared.
        </p>
        <p>
          We may use other data for a range of different purposes, provided we
          comply with applicable law and our contractual commitments, such as:
        </p>
        <ul>
          <li>
            To deliver customer service and assist you with any inquiries you
            may have.
          </li>
          <li>
            To analyse trends, administer or optimise our service, monitor usage
            or traffic patterns and gather demographic information about our
            user base as a whole.
          </li>
          <li>
            To control unauthorised use or abuse of our database—or otherwise
            detect, investigate or prevent activities that may violate our
            policies or be illegal.
          </li>
        </ul>
        <h2 className="p-heading mt-2">How information is disclosed</h2>
        <p>
          Except as described in this Privacy Policy, Andrew Bolton Sports
          Massage will not share, sell, or rent personal information with anyone
          without your permission or unless ordered by a court of law. We work
          with third-party services in New Zealand and Australia, such as:
        </p>
        <ul>
          <li>
            ‘Cliniko’ our practice management software, located in Australia
          </li>
          <li>‘Hnry’, our tax agent, located in New Zealand</li>
        </ul>
        <p>
          <strong>Google Ads and Customer Match</strong>
        </p>
        <p>
          We use Google Ads, including features such as Customer Match, to
          deliver personalised advertising and measure the effectiveness of our
          marketing campaigns. As part of this service, we may share limited
          personal information (such as email addresses) with Google to match
          our customers with Google accounts and deliver relevant ads across
          Google services.
        </p>
        <p>
          This data is only used to help us reach customers with relevant offers
          and content, and to ensure compliance with Google’s Customer Match
          policies. Google acts as a “processor” of this data under the
          applicable Data Processing Terms, and only processes this information
          on our behalf.
        </p>
        <p>
          Where required by law or applicable Google policies—including the EU
          User Consent Policy—we obtain appropriate consent before collecting
          and sharing this data. You can learn more about how Google uses data
          for advertising by visiting{' '}
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google’s advertising privacy policies
          </a>
          .
        </p>

        <p>
          that we allow access to personal information, and may use it on our
          behalf strictly for the purposes for which they are engaged. We
          minimise the amount of personal data that is utilised by these
          services, and we have ensured that these services process your data in
          accordance with the appropriate regulations. We are not responsible
          for the privacy policies and practices of these third-party services.
        </p>
        <p>
          We may forward personal information and health records to another
          health professional if requested with consent.
        </p>
        <p>
          In rare circumstances, we may be obliged to disclose personal
          information if disclosure is required to comply with the law, if we
          believe it is necessary to protect our rights, or if the ownership and
          assets of Andrew Bolton Sports Massage were to be transferred to
          another party.
        </p>
        <h2 className="p-heading mt-2">
          The security of your Personal Information
        </h2>
        <p>
          We take security seriously, and so do our third party services. Data
          is encrypted, stored in state-of-the-art facilities, access is
          restricted to those who have a need to know, and the technology to
          maintain security is regularly reviewed.
        </p>
        <p>
          In the event that there is a breach and your Personal Information that
          we have collected directly is at risk, you will be notified within 96
          hours of discovering the breach. You will be informed of what
          information is at risk, steps that we have taken to ensure your
          safety, and what action we are taking or have taken to rectify the
          breach.
        </p>
        <p>
          <strong>
            Access, correct or delete personal information about you
          </strong>
        </p>
        <p>
          You can request access to the personal information you have provided
          to us, via email to andrew@andrewboltonsportsmassage.com.
        </p>
        <p>
          If you think there’s a problem with the personal information we hold
          about you, you can request a correction. This enables you to have any
          incomplete or inaccurate data we hold about you corrected.
        </p>
        <p>
          {`If you want to request erasure of your personal information, we'll
          take all reasonable steps to do so unless we are required to keep it
          for legal reasons, which will be notified to you, if applicable, at
          the time of your request.`}
        </p>
        <h2 className="p-heading mt-2">Questions or complaints</h2>
        <p>
          If you have any questions or complaints about our Privacy Policy or
          the way we handle your personal information, you can contact us at
          andrew@andrewboltonsportsmassage.com. This is our preferred method of
          contact.
        </p>
      </div>
    </div>
  )
}

export default privacypolicy
