# Maple Wars Safe Refactor

This is the first safe split of the original single `page.tsx` file.

## Paths to create

```text
app/page.tsx
game/types.ts
game/constants.ts
game/data/commanders.ts
game/data/units.ts
game/data/terrain.ts
game/data/map.ts
```

The `app/page.tsx` file assumes the `game` folder is beside the `app` folder, so imports use `../game/...`.

If your project uses `src/app/page.tsx`, place the new folder at `src/game/...`.

If your page is somewhere deeper than `app/page.tsx`, adjust the `../game/...` imports accordingly.

## What was moved

- Types moved to `game/types.ts`
- Shared constants moved to `game/constants.ts`
- Commander data moved to `game/data/commanders.ts`
- Unit data moved to `game/data/units.ts`
- Terrain data moved to `game/data/terrain.ts`
- Map setup moved to `game/data/map.ts`

Most gameplay logic, UI, and AI stayed in `app/page.tsx` intentionally. That keeps this refactor safer and easier to test before splitting more code.
