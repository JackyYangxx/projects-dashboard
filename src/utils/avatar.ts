/**
 * Generate a DiceBear initials avatar URL for a given name.
 */
export function generateAvatarUrl(name: string): string {
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`
}
