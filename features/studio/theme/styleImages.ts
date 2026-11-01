/**
 * Preview pictures for catalog options (from FLUX_VERSION_3's style library, resized to 400 px).
 * Keyed by catalog kind → item key. A catalog item's own `image_url` (set in Django admin) wins over these.
 */
export const STYLE_IMAGES: Record<string, Record<string, string>> = {
  haircut: {
    classic_short: "/studio/styles/haircuts/classic_short.jpg",
    lob: "/studio/styles/haircuts/lob.jpg",
    long_face_framing: "/studio/styles/haircuts/long_face_framing.jpg",
    textured_crop: "/studio/styles/haircuts/textured_crop.jpg",
  },
  beard_style: {
    designer_stubble: "/studio/styles/beards/designer_stubble.jpg",
    full_beard: "/studio/styles/beards/full_beard.jpg",
    none: "/studio/styles/beards/none.jpg",
    short_boxed: "/studio/styles/beards/short_boxed.jpg",
  },
  hair_shade: {
    ash_blonde: "/studio/styles/colours/ash_blonde.jpg",
    ash_brown: "/studio/styles/colours/ash_brown.jpg",
    beige_blonde: "/studio/styles/colours/beige_blonde.jpg",
    blue_black: "/studio/styles/colours/blue_black.jpg",
    bright_copper: "/studio/styles/colours/bright_copper.jpg",
    burgundy_brown: "/studio/styles/colours/burgundy_brown.jpg",
    caramel: "/studio/styles/colours/caramel.jpg",
    champagne_blonde: "/studio/styles/colours/champagne_blonde.jpg",
    chocolate_brown: "/studio/styles/colours/chocolate_brown.jpg",
    cool_dark_brown: "/studio/styles/colours/cool_dark_brown.jpg",
    cool_mocha: "/studio/styles/colours/cool_mocha.jpg",
    dark_copper: "/studio/styles/colours/dark_copper.jpg",
    espresso_brown: "/studio/styles/colours/espresso_brown.jpg",
    golden_blonde: "/studio/styles/colours/golden_blonde.jpg",
    golden_brown: "/studio/styles/colours/golden_brown.jpg",
    golden_chestnut: "/studio/styles/colours/golden_chestnut.jpg",
    golden_copper: "/studio/styles/colours/golden_copper.jpg",
    honey_blonde: "/studio/styles/colours/honey_blonde.jpg",
    light_ash_brown: "/studio/styles/colours/light_ash_brown.jpg",
    light_golden_brown: "/studio/styles/colours/light_golden_brown.jpg",
    mahogany: "/studio/styles/colours/mahogany.jpg",
    mushroom_brown: "/studio/styles/colours/mushroom_brown.jpg",
    pearl_blonde: "/studio/styles/colours/pearl_blonde.jpg",
    plum_black: "/studio/styles/colours/plum_black.jpg",
    rose_blonde: "/studio/styles/colours/rose_blonde.jpg",
    soft_bronde: "/studio/styles/colours/soft_bronde.jpg",
    strawberry_blonde: "/studio/styles/colours/strawberry_blonde.jpg",
    taupe_blonde: "/studio/styles/colours/taupe_blonde.jpg",
    warm_black: "/studio/styles/colours/warm_black.jpg",
    warm_espresso: "/studio/styles/colours/warm_espresso.jpg",
  },
};

/** Image for an option, or null (then the UI falls back to a colour swatch / the customer photo). */
export function styleImage(kind: string, key: string | null | undefined, ownImage?: string | null): string | null {
  if (ownImage) return ownImage;
  return key ? STYLE_IMAGES[kind]?.[key] ?? null : null;
}
