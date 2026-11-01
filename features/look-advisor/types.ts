/** Item returned by `salon/mirror/recommend-hairstyle/`. */
export interface HairstyleData {
  hairstyle: string;
  reason: string;
  styling_options: string;
  maintenance: string;
  prompt: string;
}

/** Item returned by `salon/mirror/recommend-haircolor/`. */
export interface HaircolorData {
  haircolor: string;
  reason: string;
  prompt: string;
  /** Colour technique note (markdown), when the recommender gives one. */
  technique?: string;
  /** Which technique `prompt` is for (global / ombre / balayage / streaks / highlights), on newer backends. */
  technique_type?: string;
  maintenance: string;
}
