import { Ripple } from "@rmwc/ripple";
import PrevIcon from "../icons/PrevIcon";
import NextIcon from "../icons/NextIcon";
import { CarouselNavigationProps, CarouselIndicatorsProps } from "./types";

interface CarouselNavigationRowProps
  extends CarouselNavigationProps,
    CarouselIndicatorsProps {}

export default function CarouselNavigationRow({
  currentIndex,
  totalBanners,
  onPrevious,
  onNext,
  onIndicatorClick,
}: CarouselNavigationRowProps) {
  // Don't show navigation row if there's only one banner
  if (totalBanners <= 1) {
    return null;
  }

  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalBanners - 1;

  return (
    <div className="carousel-navigation-row flex items-center justify-center space-x-4 mt-3 sm:mt-4">
      {/* Previous button */}
      {canGoPrevious ? (
        <Ripple>
          <button
            onClick={onPrevious}
            className="btn-secondary-sm rounded-full"
            aria-label={`Previous banner (${currentIndex} of ${totalBanners})`}
            aria-describedby="carousel-instructions"
            type="button"
          >
            <PrevIcon size={28} color="var(--text-color-accent)" />
            <span className="sr-only">Go to previous banner</span>
          </button>
        </Ripple>
      ) : (
        <div className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true" />
      )}

      {/* Indicators */}
      <div
        className="carousel-indicators flex justify-center space-x-1 sm:space-x-2"
        role="tablist"
        aria-label="Banner navigation"
      >
        {Array.from({ length: totalBanners }, (_, index) => (
          <Ripple key={index}>
            <button
              onClick={() => onIndicatorClick(index)}
              className={`carousel-dot w-2 h-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:ring-offset-1 transition-all duration-300 ${
                index === currentIndex
                  ? "bg-emerald-700"
                  : "bg-gray-300 hover:bg-gray-400 active:scale-95"
              }`}
              role="tab"
              id={`banner-tab-${index}`}
              aria-label={`Go to banner ${index + 1} of ${totalBanners}`}
              aria-selected={index === currentIndex}
              aria-controls={`banner-${index}`}
              tabIndex={index === currentIndex ? 0 : -1}
              type="button"
            >
              <span className="sr-only">
                {index === currentIndex
                  ? `Current banner: ${index + 1}`
                  : `Banner ${index + 1}`}
              </span>
            </button>
          </Ripple>
        ))}
      </div>

      {/* Next button */}
      {canGoNext ? (
        <Ripple>
          <button
            onClick={onNext}
            className="btn-secondary-sm rounded-full"
            aria-label={`Next banner (${currentIndex + 2} of ${totalBanners})`}
            aria-describedby="carousel-instructions"
            type="button"
          >
            <NextIcon size={28} color="var(--text-color-accent)" />
            <span className="sr-only">Go to next banner</span>
          </button>
        </Ripple>
      ) : (
        <div className="w-8 h-8 sm:w-10 sm:h-10" aria-hidden="true" />
      )}
    </div>
  );
}
