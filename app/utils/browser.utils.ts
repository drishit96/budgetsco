export function isMobileView() {
  try {
    if (window == null) return false;
    return window.innerWidth <= 640;
  } catch (e) {
    return false;
  }
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
