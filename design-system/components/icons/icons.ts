import hairDensityIconImg from "@/assets/skin-icons2/hair-density.png"
import scalpRednessIconImg from "@/assets/skin-icons2/scalp-redness.png"
import hairThinningIconImg from "@/assets/skin-icons2/hair-thinning.png"
import hairTextureIconImg from "@/assets/skin-icons2/hair-texture.png"
import shaftThicknessIconImg from "@/assets/skin-icons2/shaft-thickness.png"
import scalpTextureIconImg from "@/assets/skin-icons2/scalp-texture.png"
import dandruffIconImg from "@/assets/skin-icons2/dandruff.png"
import oilinessIconImg from "@/assets/skin-icons2/oiliness.png"



import acneIconImg from "@/assets/skin-icons/acne.png"
import darkCircleIconImg from "@/assets/skin-icons/dark circles.png"
import skinTextureIconImg from "@/assets/skin-icons/skin-texture.png"
import wrinklesIconImg from "@/assets/skin-icons/wrinkles.png"
import rednessIconImg from "@/assets/skin-icons/redness.png"
import pigmentationIconImg from "@/assets/skin-icons/pigmentation.png"
import poresIconImg from "@/assets/skin-icons/pores.png"

// parameter to skin icon
export const hairIcons = [
  {
    name: "hair_density",
    icon: hairDensityIconImg,
  },
  {
    name: "oiliness",
    icon: oilinessIconImg,
  },
  {
    name: "scalp_redness",
    icon: scalpRednessIconImg,
  },
  {
    name: "hair_thinning",
    icon: hairThinningIconImg,
  },
  {
    name: "hair_texture",
    icon: hairTextureIconImg,
  },
  {
    name: "shaft_thickness",
    icon: shaftThicknessIconImg,
  },
  {
    name: "scalp_texture",
    icon: scalpTextureIconImg,
  },
  {
    name: "dandruff",
    icon: dandruffIconImg,
  },
]

export const skinIcons = [
  {
    name: "acne",
    icon: acneIconImg,
  },
  {
    name: "dark_circles",
    icon: darkCircleIconImg,
  },
  {
    name: "oiliness",
    icon: oilinessIconImg,
  },
  {
    name: "skin_texture",
    icon: skinTextureIconImg,
  },
  {
    name: "wrinkles",
    icon: wrinklesIconImg,
  },
  {
    name: "redness",
    icon: rednessIconImg,
  },
  {
    name: "pigmentation",
    icon: pigmentationIconImg,
  },
  {
    name: "pores",
    icon: poresIconImg,
  },
  {
    // Comedones are clogged pores — reuse the pores glyph
    name: "comedone",
    icon: poresIconImg,
  },
  {
    // Hydration ~ moisture/oil balance — reuse the oiliness glyph
    name: "hydration",
    icon: oilinessIconImg,
  },
]
