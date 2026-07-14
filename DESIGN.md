# Design Brief — Calivora

## Direction
Royal Aurora — a jewel-tone luxury palette. Deep sapphire primary, imperial magenta accent, emerald secondary, rich gold highlight on a sapphire-black canvas (dark) or ivory canvas (light). Reads as expensive and energetic.

## Tone
Premium and motivating. A nutrition tracker that feels like a luxury fitness boutique — saturated jewel colors, gold punctuation, luminous depth on dark. Confident, never clinical.

## Differentiation
Most trackers default to clinical blue or warm rustic food palettes. Calivora owns the jewel box: sapphire CTAs, magenta data accents, emerald progress, gold streaks, amethyst chart slices — five coordinated jewels that read as one opulent identity.

## Color Palette
| Token | Light (OKLCH) | Dark (OKLCH) | Usage |
|---|---|---|---|
| background | 0.985 0.004 75 | 0.16 0.025 260 | Ivory canvas / sapphire-black canvas |
| foreground | 0.22 0.025 260 | 0.95 0.012 75 | Deep sapphire ink / cream text |
| card | 1.0 0.003 75 | 0.2 0.028 260 | Elevated surfaces |
| primary | 0.5 0.21 260 | 0.62 0.22 260 | Royal sapphire — CTAs, active states |
| secondary | 0.7 0.16 155 | 0.78 0.15 155 | Emerald — progress, success |
| accent | 0.55 0.24 350 | 0.7 0.23 350 | Imperial magenta — UI accent, data viz |
| highlight | 0.82 0.16 85 | 0.85 0.16 85 | Rich gold — streaks, badges |
| destructive | 0.55 0.22 25 | 0.65 0.22 25 | Over-limit, delete (red) |
| muted-foreground | 0.5 0.018 260 | 0.7 0.015 75 | Secondary text |
| chart-1 | 0.5 0.21 260 | 0.62 0.22 260 | Sapphire |
| chart-2 | 0.7 0.16 155 | 0.78 0.15 155 | Emerald |
| chart-3 | 0.55 0.24 350 | 0.7 0.23 350 | Magenta |
| chart-4 | 0.82 0.16 85 | 0.85 0.16 85 | Gold |
| chart-5 | 0.55 0.2 295 | 0.68 0.21 295 | Amethyst |

## Typography
- Display: Bricolage Grotesque — headings, calorie rings, hero numbers
- Body: DM Sans — UI labels, food names, form text
- Mono: Geist Mono — numeric data, macros, timestamps

## Elevation & Depth
Sapphire-tinted shadows (sapphire + magenta tint), never neutral gray. Cards lift with jewel-tinted glow on hover. Two tiers: `shadow-card` (resting) → `shadow-card-hover` (interaction). Hero elements use `shadow-warm-lg`.

## Structural Zones
| Zone | Background | Border | Notes |
|---|---|---|---|
| Header | bg-card | border-b border-border | Sticky, brand wordmark + date + streak chip (highlight bg) |
| Content | bg-background | — | Alternating bg-muted/30 sections for rhythm |
| Footer/Action rail | bg-card | border-t border-border | Bottom-anchored on mobile, sapphire FAB |

## Spacing & Rhythm
Mobile-first 4px base. Cards: 16px padding, 12px gap. Section spacing: 24px. Touch targets min 44px. Container padding 20px mobile, 32px tablet+.

## Component Patterns
- Buttons: primary = sapphire→magenta gradient + warm shadow; secondary = emerald-tinted; highlight = gold for streaks
- Cards: rounded-2xl (1rem), elevated surface, sapphire-tinted shadow, 1px jewel-tinted border
- Progress: emerald gradient fills, rounded-full tracks
- Badges: highlight (gold) bg for streaks; accent (magenta) for data chips
- Rings: SVG stroke-dasharray, sapphire→magenta gradient via `linearGradient` def
- Inputs: jewel-tinted, sapphire focus ring, no harsh blue outlines
- Toggle: Radix Switch, sapphire track when on (theme toggle on Settings)

## Motion
Entrance: `animate-fade-up` staggered (50ms delay). Rings: `animate-scale-in`. Hover: `shadow-card-hover` 200ms. FAB: `animate-pulse-warm` subtle idle glow. Theme toggle: instant via next-themes class swap. Smooth, luminous, never bouncy.

## Constraints
- No barcode scanning UI (out of scope)
- No social sharing features (out of scope)
- Mobile-first; tablet/desktop are progressive enhancement
- Email OTP login only — no password fields, no Internet Identity UI
- Dark mode default + Light/System theme picker preserved on Settings
- LogMeal API key stays backend; never expose in frontend tokens or env

## Signature Detail
The calorie budget ring: a thick sapphire→magenta gradient-stroked arc with the remaining number in Bricolage Grotesque at display size, centered. A small rich-gold dot appears on the ring when the user is under budget — a quiet, luxurious punctuation mark in the Royal Aurora jewel set.
