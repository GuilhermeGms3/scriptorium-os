export function supportsPassageInspector(pathname: string): boolean {
  return /^\/scripture\/[^/]+\/\d+\/?$/u.test(pathname);
}
