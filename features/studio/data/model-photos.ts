/**
 * Recommender model photos: two per option, shown side by side on the Recommended tab (public/studio/recommended).
 * Each returns null when the option has no photos — the UI then shows its catalogue picture / swatch.
 */
type Pair = readonly [string, string];
const g_ = (gender: string | null) => (gender === "man" ? "man" : "woman");

/** Haircuts with photos, per gender (recommended/haircut/<gender>/<key>-1|2.jpg). */
const HAIRCUT_MODELS: Record<"man" | "woman", string[]> = {
  man: [
    "buzz_cut", "caesar_cut", "center_parted", "crew_cut", "fade_pompadour", "french_crop", "long_wolf_cut", "man_bun", "mullet",
    "quiff", "side_part", "side_swept", "slicked_back", "undercut",
  ],
  woman: [
    "a_line_bob", "blunt_lob", "butterfly_cut", "classic_pixie", "feather_cut", "french_bob", "long_layers", "messy_long_bob",
    "soft_mullet", "wolf_cut",
  ],
};
export const haircutModels = (gender: string | null, key: string): Pair | null => {
  const g = g_(gender);
  return HAIRCUT_MODELS[g].includes(key) ? [`/studio/recommended/haircut/${g}/${key}-1.jpg`, `/studio/recommended/haircut/${g}/${key}-2.jpg`] : null;
};

/** The 24 FLUX colours (`flux_<shade>`): a pair per shade for both genders (recommended/colour/<gender>/flux). */
const FLUX_PHOTOS = new Set([
  "natural_black", "soft_black", "espresso_brown", "dark_chocolate", "chocolate_brown", "mocha_brown", "chestnut_brown",
  "caramel_brown", "dark_blonde", "honey_blonde", "salt_and_pepper", "ash_blonde", "light_copper", "copper", "cinnamon_red",
  "auburn", "deep_red", "burgundy", "wine_red", "plum", "rose_pink", "lavender", "blue", "emerald_green",
]);
/** FLUX colours use their own photos (never another shade's); backend season shades use the front + back pair. */
export const colourModels = (gender: string | null, key: string): Pair | null => {
  const g = g_(gender);
  if (key.startsWith("flux_")) {
    const shade = key.slice(5);
    return FLUX_PHOTOS.has(shade) ? [`/studio/recommended/colour/${g}/flux/${shade}-1.jpg`, `/studio/recommended/colour/${g}/flux/${shade}-2.jpg`] : null;
  }
  return [`/studio/recommended/colour/${g}/${key}-front.jpg`, `/studio/recommended/colour/${g}/${key}-back.jpg`];
};

/** Beards with photos (recommended/beard/<key>-1|2.jpg). `verdi` has photos but no catalogue beard yet. */
const BEARD_MODELS = [
  "anchor", "clean_shave", "designer_stubble", "ducktail", "goatee", "handlebar_mustache", "horseshoe", "italian", "low_taper_fade",
  "natural_mustache", "short_boxed", "van_dyke", "verdi",
];
export const beardModels = (key: string): Pair | null =>
  BEARD_MODELS.includes(key) ? [`/studio/recommended/beard/${key}-1.jpg`, `/studio/recommended/beard/${key}-2.jpg`] : null;
