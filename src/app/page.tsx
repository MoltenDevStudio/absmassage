import React from 'react'
import BookingEmbedded from '../components/BookingEmbedded.tsx'
import Mailchimp from '../components/Mailchimp.tsx'
import Slider from '../components/Slider.tsx'
import { Metadata } from 'next'
import Map from '../components/Map.tsx'
import reviewData from '../data/reviews.json'
import GoogleReviewsWidget from '../components/GoogleReviewsWidget.tsx'
import { Review } from '../../models/reviews.ts'
import Prices from './services/prices.tsx'
import BookNowButton from '../components/BookNowButton.tsx'
import { BlogWidget } from '../components/BlogWidget'
import { getPosts } from '../lib/getBlogPosts'
import VideoHero from '../components/VideoHero'
import Link from 'next/link'
import '../styles/GiftVouchers.scss'

export const metadata: Metadata = {
  alternates: {
    canonical: 'https://andrewboltonsportsmassage.com',
  },
}

const writeReviewUrl = 'https://g.page/AndrewBoltonSportsMassage/review?gm'

export default function Page() {
  const typedReviews: Review[] = reviewData.map((review) => ({
    ...review,
    // Assert that this specific property matches your 'Review' interface
    starRating: review.starRating as Review['starRating'],
  }))
  const posts = getPosts()

  return (
    <div>
      <VideoHero />
      <div className="content-container">
        <p className="home-intro">{`Hi, I’m Andrew.`}</p>
        <h2>
          I've got 7 years’ experience helping the people of Christchurch live
          stronger, pain-free lives, specialising in Deep Tissue & Sports
          Massage.
        </h2>

        <p>I can help you:</p>
        <ul className="ml-5 mt-5 text-left">
          <li>
            <strong>🦵 Overcome injury</strong>
          </li>
          <li className="mt-1">
            <strong>😌 Relieve pain</strong>
          </li>
          <li className="mt-1">
            <strong>💆 Alleviate tension</strong>
          </li>
          <li className="mt-1">
            <strong>🏃‍♂️ Restore mobility</strong>
          </li>
          <li className="mt-1">
            <strong>🚵🏽‍♂️ Prepare for & recover from events</strong>
          </li>
          <li className="mt-1">
            <strong>💆‍♀️ Relax</strong>
          </li>
        </ul>

        <p>I'm serious about helping you live a pain-free life.</p>

        <p>
          I work holistically with body & breath to release tension. Each
          session is tailored to your preferences, whether you prefer strong
          deep tissue work, a lighter touch or something in between. My clients
          often say that they've struggled to find someone with my strength &
          sensitivity.
        </p>

        <p>
          I'm happy to chat, but appreciate that you get more from your massage
          by sinking into your breath & relaxing.
        </p>

        <BookNowButton className="book-now-btn" text="Book Your Massage" />

        <div className="break-line"></div>
      </div>
      <GoogleReviewsWidget
        reviews={typedReviews}
        writeReviewUrl={writeReviewUrl}
      />
      <section className="home-gallery" aria-labelledby="home-gallery-title">
        <div className="home-gallery__heading">
          <p className="home-gallery__eyebrow">The treatment experience</p>
          <h2 id="home-gallery-title">Strong, relieving, personalised</h2>
        </div>
        <Slider />
      </section>
      <div className="content-container remove-top-margin">
        <div className="break-line"></div>
        <h2 className="p-heading ">Pricing</h2>

        <div className="row items-center">
          <div className="column center">
            <Prices />
          </div>
        </div>
        <div className="break-line"></div>
      </div>
      <Map page="home" />
      <BlogWidget posts={posts} />
      <BookingEmbedded />
      <section
        className="content-container gift-vouchers-intro"
        aria-labelledby="gift-vouchers-heading"
      >
        <h2 id="gift-vouchers-heading" className="p-heading">
          Give the gift of feeling better
        </h2>
        <p>
          Treat someone to a personalised massage. Choose a gift voucher value
          and let them book a time that suits them.
        </p>
        <Link href="/gift-vouchers" className="book-now-btn gift-vouchers-link">
          Buy a Gift Voucher
        </Link>
      </section>
      <Mailchimp />
    </div>
  )
}
