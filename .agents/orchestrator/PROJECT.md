# Project: Air

## Architecture
- React / Next.js web application for file dashboard and video playback.
- Custom thumbnail file management & preview functionality.
- Liquid glass controller bar for embedded video player.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Custom Thumbnail Upload Stability | Fix ReferenceError white screen crash on custom thumbnail upload | none | IN_PROGRESS |
| 2 | M2: Video Player Control Bar Alignment | Fix video player liquid glass controller bar right edge overflow (bounded left-3 right-3 sm:w-auto) | none | PLANNED |
| 3 | M3: Production Build & GitHub Synchronization | Clean `npm run build` and push to origin/main on GitHub | M1, M2 | PLANNED |

## Interface Contracts
- Thumbnail rendering: safe property access, avoidance of unhandled ReferenceErrors.
- Video player control bar layout: bounded symmetrically via `left-3 right-3 sm:w-auto`.

## Code Layout
- Source code in repository root `/home/imitsankit/.gemini/antigravity/scratch/Air`
