import { useState, useEffect, useCallback, useRef, memo } from "react";
import Banner from "../Banner";
import CarouselNavigationRow from "./CarouselNavigationRow";
import { BannerCarouselProps, CarouselState } from "./types";
import { useSwipeGesture } from "~/lib/useSwipeGesture.hook";

function BannerCarousel({ banners, className = "" }: BannerCarouselProps) {
  // Check for reduced motion preference
  const prefersReducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // Update reduced motion preference if it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);

  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    visibleBanners: [],
    isAnimating: false,
    dismissedBanners: new Set(),
  });

  const carouselContainerRef = useRef<HTMLDivElement>(null);

  // Filter banners based on shouldShow and dismissal status
  const filterVisibleBanners = useCallback(() => {
    return banners.filter(
      (banner) => banner.shouldShow && !carouselState.dismissedBanners.has(banner.id)
    );
  }, [banners, carouselState.dismissedBanners]);

  // Update visible banners when banners prop changes or dismissal state changes
  useEffect(() => {
    const filteredBanners = filterVisibleBanners();

    setCarouselState((prev) => ({
      ...prev,
      visibleBanners: filteredBanners,
      currentIndex: Math.min(prev.currentIndex, Math.max(0, filteredBanners.length - 1)),
    }));
  }, [filterVisibleBanners]);

  const handlePrevious = () => {
    if (isAnimatingRef.current || carouselState.currentIndex <= 0) return;

    const newIndex = carouselState.currentIndex - 1;
    isAnimatingRef.current = true;
    setCarouselState((prev) => ({
      ...prev,
      isAnimating: true,
      currentIndex: newIndex,
    }));

    const animationDuration = prefersReducedMotion.current ? 0 : 300;
    setTimeout(() => {
      isAnimatingRef.current = false;
      setCarouselState((prev) => ({ ...prev, isAnimating: false }));
      announceBannerChange(newIndex);
    }, animationDuration);
  };

  const handleNext = () => {
    if (
      isAnimatingRef.current ||
      carouselState.currentIndex >= carouselState.visibleBanners.length - 1
    )
      return;

    const newIndex = carouselState.currentIndex + 1;
    isAnimatingRef.current = true;
    setCarouselState((prev) => ({
      ...prev,
      isAnimating: true,
      currentIndex: newIndex,
    }));

    const animationDuration = prefersReducedMotion.current ? 0 : 300;
    setTimeout(() => {
      isAnimatingRef.current = false;
      setCarouselState((prev) => ({ ...prev, isAnimating: false }));
      announceBannerChange(newIndex);
    }, animationDuration);
  };

  const handleIndicatorClick = (index: number) => {
    if (isAnimatingRef.current || index === carouselState.currentIndex) return;

    isAnimatingRef.current = true;
    setCarouselState((prev) => ({
      ...prev,
      isAnimating: true,
      currentIndex: index,
    }));

    const animationDuration = prefersReducedMotion.current ? 0 : 300;
    setTimeout(() => {
      isAnimatingRef.current = false;
      setCarouselState((prev) => ({ ...prev, isAnimating: false }));
      announceBannerChange(index);
    }, animationDuration);
  };

  const handleBannerDismiss = (bannerId: string) => {
    if (isAnimatingRef.current) return;

    setCarouselState((prev) => {
      const newDismissedBanners = new Set(prev.dismissedBanners);
      newDismissedBanners.add(bannerId);

      // Filter out the dismissed banner
      const newVisibleBanners = prev.visibleBanners.filter(
        (banner) => banner.id !== bannerId
      );

      // Calculate new current index after dismissal
      let newCurrentIndex = prev.currentIndex;

      if (newVisibleBanners.length === 0) {
        // No banners left - index doesn't matter
        newCurrentIndex = 0;
      } else if (prev.currentIndex >= newVisibleBanners.length) {
        // Current index is beyond the new array length, go to the last banner
        newCurrentIndex = newVisibleBanners.length - 1;
      }
      // If current index is still valid, keep it (this handles dismissing a banner
      // that's not currently visible, or dismissing the current banner when there
      // are banners after it)

      return {
        ...prev,
        dismissedBanners: newDismissedBanners,
        visibleBanners: newVisibleBanners,
        currentIndex: newCurrentIndex,
        isAnimating: true,
      };
    });

    // Clear animation state after transition
    isAnimatingRef.current = true;
    const animationDuration = prefersReducedMotion.current ? 0 : 300;
    setTimeout(() => {
      isAnimatingRef.current = false;
      setCarouselState((prev) => ({ ...prev, isAnimating: false }));
    }, animationDuration);
  };

  // Configure swipe gesture hook
  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: handleNext,
    onSwipeRight: handlePrevious,
    minSwipeDistance: 50,
    disabled: carouselState.visibleBanners.length <= 1,
    isAnimating: carouselState.isAnimating,
  });

  // Keyboard navigation handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only handle keyboard navigation if the carousel container has focus
    if (carouselState.visibleBanners.length <= 1 || isAnimatingRef.current) return;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        handlePrevious();
        break;
      case "ArrowRight":
        e.preventDefault();
        handleNext();
        break;
      case "Home":
        e.preventDefault();
        if (carouselState.currentIndex !== 0) {
          handleIndicatorClick(0);
        }
        break;
      case "End":
        e.preventDefault();
        const lastIndex = carouselState.visibleBanners.length - 1;
        if (carouselState.currentIndex !== lastIndex) {
          handleIndicatorClick(lastIndex);
        }
        break;
    }
  };

  // Utility function to create screen reader announcements
  const announceToScreenReader = useCallback((message: string) => {
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    liveRegion.textContent = message;

    document.body.appendChild(liveRegion);

    setTimeout(() => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion);
      }
    }, 1000);
  }, []);

  // Utility function to announce banner changes to screen readers
  const announceBannerChange = useCallback(
    (index: number) => {
      const currentBanner = carouselState.visibleBanners[index];
      if (currentBanner) {
        const announcement = `Showing banner ${index + 1} of ${
          carouselState.visibleBanners.length
        }: ${currentBanner.type} - ${currentBanner.message}`;
        announceToScreenReader(announcement);
      }
    },
    [carouselState.visibleBanners, announceToScreenReader]
  );

  // Focus management - ensure carousel container can receive focus
  const handleFocus = () => {
    // Announce current banner to screen readers
    if (carouselContainerRef.current) {
      const currentBanner = carouselState.visibleBanners[carouselState.currentIndex];
      if (currentBanner) {
        const announcement = `Banner ${carouselState.currentIndex + 1} of ${
          carouselState.visibleBanners.length
        }: ${currentBanner.type} - ${currentBanner.message}`;
        announceToScreenReader(announcement);
      }
    }
  };

  // Don't render anything if no banners are visible
  if (carouselState.visibleBanners.length === 0) {
    return null;
  }

  // Single banner - render without carousel controls
  if (carouselState.visibleBanners.length === 1) {
    const banner = carouselState.visibleBanners[0];
    return (
      <div
        className={`carousel-container ${className}`}
        role="region"
        aria-label="Banner notification"
      >
        <Banner
          type={banner.type}
          message={banner.message}
          showAction={banner.showAction}
          actionText={banner.actionText}
          onActionClick={banner.onActionClick}
          showLink={banner.showLink}
          link={banner.link}
          linkText={banner.linkText}
          allowDismiss={banner.allowDismiss}
          allowPermanentDismiss={banner.allowPermanentDismiss}
          permanentDismissSettingName={banner.permanentDismissSettingName}
          onDismiss={() => handleBannerDismiss(banner.id)}
          carouselMode={true}
        />
      </div>
    );
  }

  // Calculate transform for smooth sliding animation
  const translateX = -carouselState.currentIndex * 100;
  const animationDuration = prefersReducedMotion.current ? 0 : 300;

  return (
    <div
      className={`carousel-container relative ${className}`}
      role="region"
      aria-label="Banner carousel"
      aria-live="polite"
      aria-atomic="false"
    >
      <div
        className="carousel-viewport relative overflow-hidden touch-pan-y focus:outline-none focus:ring-1 focus:ring-black-500 focus:ring-offset-2 rounded-md"
        ref={carouselContainerRef}
        tabIndex={0}
        role="group"
        aria-label={`Banner ${carouselState.currentIndex + 1} of ${
          carouselState.visibleBanners.length
        }`}
        aria-describedby="carousel-instructions"
        {...swipeHandlers}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        <div
          className="carousel-track flex transition-transform ease-in-out"
          ref={carouselTrackRef}
          style={{
            transform: `translateX(${translateX}%)`,
            transitionDuration: `${animationDuration}ms`,
          }}
        >
          {carouselState.visibleBanners.map((banner, index) => (
            <div
              key={banner.id}
              className="carousel-slide flex-shrink-0 w-full"
              id={`banner-${index}`}
              role="tabpanel"
              aria-labelledby={`banner-tab-${index}`}
              aria-hidden={index !== carouselState.currentIndex}
            >
              <Banner
                type={banner.type}
                message={banner.message}
                showAction={banner.showAction}
                actionText={banner.actionText}
                onActionClick={banner.onActionClick}
                showLink={banner.showLink}
                link={banner.link}
                linkText={banner.linkText}
                allowDismiss={banner.allowDismiss}
                allowPermanentDismiss={banner.allowPermanentDismiss}
                permanentDismissSettingName={banner.permanentDismissSettingName}
                onDismiss={() => handleBannerDismiss(banner.id)}
                carouselMode={true}
                isVisible={index === carouselState.currentIndex}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Screen reader instructions */}
      <div id="carousel-instructions" className="sr-only">
        Use arrow keys to navigate between banners, Home to go to first banner, End to go
        to last banner.
      </div>

      <CarouselNavigationRow
        currentIndex={carouselState.currentIndex}
        totalBanners={carouselState.visibleBanners.length}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onIndicatorClick={handleIndicatorClick}
      />
    </div>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(BannerCarousel, (prevProps, nextProps) => {
  // Only re-render if banners array has actually changed
  if (prevProps.banners.length !== nextProps.banners.length) {
    return false;
  }

  // Check if any banner properties have changed
  for (let i = 0; i < prevProps.banners.length; i++) {
    const prevBanner = prevProps.banners[i];
    const nextBanner = nextProps.banners[i];

    if (
      prevBanner.id !== nextBanner.id ||
      prevBanner.shouldShow !== nextBanner.shouldShow ||
      prevBanner.message !== nextBanner.message ||
      prevBanner.type !== nextBanner.type
    ) {
      return false;
    }
  }

  return prevProps.className === nextProps.className;
});
