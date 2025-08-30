export type BannerType = "tip" | "important" | "urgent";

export interface BannerData {
  id: string;
  type: BannerType;
  message: string;
  showAction?: boolean;
  actionText?: string;
  onActionClick?: React.MouseEventHandler<HTMLButtonElement>;
  showLink?: boolean;
  link?: string;
  linkText?: string;
  allowDismiss?: boolean;
  allowPermanentDismiss?: boolean;
  permanentDismissSettingName?: string;
  shouldShow: boolean;
}

export interface CarouselState {
  currentIndex: number;
  visibleBanners: BannerData[];
  isAnimating: boolean;
  dismissedBanners: Set<string>;
}

export interface BannerCarouselProps {
  banners: BannerData[];
  className?: string;
}

export interface CarouselNavigationProps {
  currentIndex: number;
  totalBanners: number;
  onPrevious: () => void;
  onNext: () => void;
}

export interface CarouselIndicatorsProps {
  currentIndex: number;
  totalBanners: number;
  onIndicatorClick: (index: number) => void;
}
