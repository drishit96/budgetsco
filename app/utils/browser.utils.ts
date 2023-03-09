export function getResolution() {
  const width = window.screen.width * window.devicePixelRatio;
  const height = window.screen.height * window.devicePixelRatio;
  return [width, height];
}

export function isMobileView() {
  if (window == null) return false;
  const [width] = getResolution();
  return width <= 640;
}

export function isMobileDevice() {
  try {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  } catch (e) {
    return false;
  }
}
