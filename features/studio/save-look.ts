import { studioApi, type Session } from "./api";
import { catalogKey, type LookDraft } from "./context/StudioContext";
import { isFluxShade, savedHairColour } from "./data/haircolor";

/** Look params + what the backend has no field for: the FLUX colour and the recommended salon skin services. */
export function lookParams(look: LookDraft, shade: string | null): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  const colour = isFluxShade(shade) ? savedHairColour(shade) : null;
  if (colour) extra.hair_colour = { ...colour, technique: look.technique ?? null };
  if (look.skinServices?.length) extra.skin_services = look.skinServices;
  return { ...look.params, ...extra };
}

/**
 * Save the draft look on the backend (needed before a share / report). The look = what the kept try-on images show:
 * an empty field falls back to that step's kept layer. Same rules as the Look screen.
 */
export async function saveLookDraft(session: Session, look: LookDraft): Promise<Session> {
  const lp = (k: "cut" | "colour" | "makeup" | "beard", f: string) => (look.layers[k]?.params?.[f] as string | undefined) ?? null;
  const cut = look.cut ?? lp("cut", "item");
  const shade = look.hair_shade ?? lp("colour", "shade") ?? lp("colour", "shade_key"); // shade_key = FLUX colour
  return studioApi.saveLook(session.id, {
    cut: catalogKey(cut),
    // A FLUX_VERSION_3 colour is not a backend catalogue key: saved in params.hair_colour instead.
    hair_shade: isFluxShade(shade) ? null : catalogKey(shade),
    technique: catalogKey(shade) && !isFluxShade(shade) ? look.technique ?? lp("colour", "technique") : null,
    makeup_look: catalogKey(look.makeup_look ?? lp("makeup", "look")),
    lip: look.lip ?? lp("makeup", "lip"),
    eye: look.eye ?? lp("makeup", "eye"),
    beard: catalogKey(look.beard ?? lp("beard", "beard")),
    // Recommended salon skin services ride along in params, so the report (and its PDF) can list them.
    params: lookParams(look, shade),
    products: look.products,
    final_tryon_id: look.lastTryon?.status === "done" ? look.lastTryon.id : null,
    headline: {},
  });
}
