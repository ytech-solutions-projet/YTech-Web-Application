export const resolveSafeNextPath = (value, fallback = '/dashboard') => {
  const candidate = `${value || ''}`.trim();

  if (!candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  return candidate;
};
