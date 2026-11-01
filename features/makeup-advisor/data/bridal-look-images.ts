import type { StaticImageData } from "next/image";
import type { BridalLookId } from "../types";

import malayalamBrideImg from "@/assets/bridal-looks/Malayalam Bride.png";
import christianBrideImg from "@/assets/bridal-looks/Christian Bride.png";
import tamilBrideImg from "@/assets/bridal-looks/Tamil Bride.png";
import iyengarBrideImg from "@/assets/bridal-looks/Iyengar Bride.png";
import teluguBrideImg from "@/assets/bridal-looks/Telugu Bride.png";
import kannadaBrideImg from "@/assets/bridal-looks/Kannada Bride.png";
import maharashtrianBrideImg from "@/assets/bridal-looks/Maharashtrian Bride.png";
import receptionGlamImg from "@/assets/bridal-looks/Reception Glam.png";
import friendOfBrideImg from "@/assets/bridal-looks/Friend of Bride.png";
import punjabiBrideImg from "@/assets/bridal-looks/Punjabi Bride.png";
import rajasthaniBrideImg from "@/assets/bridal-looks/Rajasthani Bride.png";
import bengaliBrideImg from "@/assets/bridal-looks/Bengali Bride.png";
import northIndianBrideImg from "@/assets/bridal-looks/North Indian Bride.png";
import minimalPastelBrideImg from "@/assets/bridal-looks/Minimal Pastel- Modern Bride.png";
import cocktailLookImg from "@/assets/bridal-looks/Cocktail Look.png";
import mehendiLookImg from "@/assets/bridal-looks/Mehendi Look.png";

/** Display order of the bridal collection. */
export const LOOK_ORDER: BridalLookId[] = [
  "malayalam-bride",
  "christian-bride",
  "tamil-bride",
  "iyengar-bride",
  "telugu-bride",
  "kannada-bride",
  "maharashtrian-bride",
  "reception-glam",
  "friend-of-bride",
  "punjabi-bride",
  "rajasthani-bride",
  "bengali-bride",
  "north-indian-bride",
  "minimal-pastel-bride",
  "cocktail-look",
  "mehendi-look",
];

export const LOOK_IMAGES: Record<BridalLookId, StaticImageData> = {
  "malayalam-bride": malayalamBrideImg,
  "christian-bride": christianBrideImg,
  "tamil-bride": tamilBrideImg,
  "iyengar-bride": iyengarBrideImg,
  "telugu-bride": teluguBrideImg,
  "kannada-bride": kannadaBrideImg,
  "maharashtrian-bride": maharashtrianBrideImg,
  "reception-glam": receptionGlamImg,
  "friend-of-bride": friendOfBrideImg,
  "punjabi-bride": punjabiBrideImg,
  "rajasthani-bride": rajasthaniBrideImg,
  "bengali-bride": bengaliBrideImg,
  "north-indian-bride": northIndianBrideImg,
  "minimal-pastel-bride": minimalPastelBrideImg,
  "cocktail-look": cocktailLookImg,
  "mehendi-look": mehendiLookImg,
};
