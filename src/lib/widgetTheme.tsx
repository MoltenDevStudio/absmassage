export const themeConfig = {
  widgetBg: 'bg-white',
  headerTextColor: 'text-gray-800', //"Google Reviews" title
  ratingTextColor: 'text-gray-700', // average rating number
  basedOnTextColor: 'text-gray-500', // "based on X reviews"
  writeReviewButton:
    'bg-green-900 text-white px-5 py-2.5 rounded-3xl text-md font-medium hover:bg-green-900/80 transition-colors',
  arrowButtonBg:
    'bg-green-900/80 hover:bg-black/90 active:bg-black/90 focus:bg-green-900/80 focus:outline-none transition-colors duration-150', // Background for prev/next arrows
  arrowButtonIconColor: 'text-gray-50',
  cardBg: 'reviews-bg', // User's custom class
  cardBorder: 'border-gray-200',
  cardReviewerNameColor: 'text-gray-800',
  cardDateColor: 'text-gray-500',
  cardCommentColor: 'text-gray-600',
  cardReadMoreColor: 'text-emerald-600 hover:underline',
  starColorFilled: 'text-yellow-400',
  starColorEmpty: 'text-gray-300',
  googleIconColor: 'text-gray-400', // For the small Google G on cards
  fontFamily: 'Raleway', // Overall font family
  cardBaseWidthPx: 200, // Base/Minimum width of a single review card
  blogCardBaseWidthPx: 500,
  cardGapPx: 16, // Gap between review cards (Tailwind space-4 = 1rem = 16px)
  extraSpaceThresholdPx: 40,
  oneCardWidthPercentage: 0.92, // % of viewport width
}

interface BtnProps {
  onClick: () => void
  ariaLabel: string
}

// Widgets span the viewport through 800px; offset arrows only once side margins return.
export function NextBtn({ onClick, ariaLabel }: BtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`absolute right-0 top-1/2 z-20 -translate-y-1/2 p-2 min-[801px]:-right-4 ${themeConfig.arrowButtonBg} rounded-full opacity-80 shadow-lg transition-all hover:opacity-100 focus:outline-none  focus:ring-offset-2`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={`h-4 w-4 sm:h-5 sm:w-5 ${themeConfig.arrowButtonIconColor}`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.25 4.5l7.5 7.5-7.5 7.5"
        />
      </svg>
    </button>
  )
}

export function PrevBtn({ onClick, ariaLabel }: BtnProps) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`absolute left-0 top-1/2 z-20 -translate-y-1/2 p-2 min-[801px]:-left-4 ${themeConfig.arrowButtonBg} rounded-full opacity-80 shadow-lg transition-all hover:opacity-100 focus:outline-none  focus:ring-offset-2`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className={`h-4 w-4 sm:h-5 sm:w-5 ${themeConfig.arrowButtonIconColor}`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 19.5L8.25 12l7.5-7.5"
        />
      </svg>
    </button>
  )
}
