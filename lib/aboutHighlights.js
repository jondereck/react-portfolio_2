export const splitAboutHighlightPoints = (value) => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => splitAboutHighlightPoints(item));
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split('.')
    .map((point) => point.trim())
    .filter(Boolean);
};
