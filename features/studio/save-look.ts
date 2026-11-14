import { studioApi, type Session } from "./api";
import { catalogKey, type LookDraft } from "./context/StudioContext";

/**
 * Save the draft look on the backend (needed before a share / report). The look = what the kept try-on images show:
 * an empty field falls back to that step's kept layer. Same rules as the Look screen.
 */
export async function saveLookDraft(session: Session, look: LookDraft): Promise<Session> {
  const lp = (k: "cut" | "colour" | "makeup" | "beard", f: string) => (look.layers[k]?.params?.[f] as string | undefined) ?? null;
  const cut = look.cut ?? lp("cut", "item");
  const shade = look.hair_shade ?? lp("colour", "shade");
  return studioApi.saveLook(session.id, {
    cut: catalogKey(cut),
    hair_shade: catalogKey(shade),
    technique: catalogKey(shade) ? look.technique ?? lp("colour", "technique") : null,
    makeup_look: catalogKey(look.makeup_look ?? lp("makeup", "look")),
    lip: look.lip ?? lp("makeup", "lip"),
    eye: look.eye ?? lp("makeup", "eye"),
    beard: catalogKey(look.beard ?? lp("beard", "beard")),
    // Recommended salon skin services ride along in params, so the report (and its PDF) can list them.
    params: look.skinServices?.length ? { ...look.params, skin_services: look.skinServices } : look.params,
    products: look.products,
    final_tryon_id: look.lastTryon?.status === "done" ? look.lastTryon.id : null,
    headline: {},
  });
}
