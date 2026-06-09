# Maple Wars Component Refactor

This version continues from the safe refactor and moves UI-only pieces into `game/components`.

## Folder structure

```text
app/
  page.tsx

game/
  types.ts
  constants.ts

  data/
    commanders.ts
    units.ts
    terrain.ts
    map.ts

  components/
    ArrowOverlay.tsx
    CharacterSelect.tsx
    CommanderPortrait.tsx
    HomeScreen.tsx
    HpNumber.tsx
    TileArt.tsx
    UnitArt.tsx
    UnitSprite.tsx
```

## What changed in this refactor

Moved these visual components out of `app/page.tsx`:

- `HomeScreen`
- `CharacterSelect`
- `CommanderPortrait`
- `UnitArt`
- `HpNumber`
- `UnitSprite`
- `TileArt`
- `ArrowOverlay`

Gameplay state, player actions, combat logic, repair logic, and AI logic are still in `app/page.tsx`.

That is intentional. The goal of this step is to reduce the size of `page.tsx` without moving risky game logic yet.

## Import path note

This package assumes:

```text
app/page.tsx
game/...
```

So imports use:

```tsx
import { HomeScreen } from "../game/components/HomeScreen";
```

If your project uses `src/app/page.tsx`, create the `game` folder at:

```text
src/game/
```

If your `page.tsx` is deeper than `app/page.tsx`, adjust the `../game/...` imports accordingly.
