# Issue: PrevNextNav Fixed Bottom Bar Obscures Page Content

**Date:** 2026-05-11
**Submitted by:** User (via UI feedback)
**Test Case:** N/A (UI feedback)
**Severity:** MEDIUM
**Status:** RESOLVED

## Description

The PrevNextNav fixed bottom bar (48px height) covers/obscures content at the bottom of the ProjectDetail page. When scrolling to the bottom, content is hidden behind the navigation bar.

## Expected Behavior

The bottom navigation bar should not obscure page content. Page should have enough bottom padding or the content should be scrollable so all content is accessible above the fixed nav bar.

## Suggested Fix Options

1. **Add bottom padding to main content** - Add `padding-bottom` to the main content container equal to or greater than the nav bar height (48px + safe area)

2. **Use safe-area-inset** - Ensure `padding-bottom: env(safe-area-inset-bottom)` is properly applied to account for devices with home indicator

3. **Adjust z-index** - Ensure nav bar stays on top but content scrolls behind it (current behavior is correct, just needs bottom padding)

## Environment

- App: Precision Curator Electron app
- Page: ProjectDetail (`/project/:id`)

## Notes

- The nav bar height is 48px (`h-12`)
- Uses `fixed bottom-0` positioning
- Already has `env(safe-area-inset-bottom)` in style
- The fix likely needs to add bottom padding to the scrollable content area