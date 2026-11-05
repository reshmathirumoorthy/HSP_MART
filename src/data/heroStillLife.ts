/**
 * Hero still-life — catalogue assets chosen for visible product bounds.
 *
 * Avoid assets with large transparent/white studio margins when possible
 * (e.g. note-book-set-main ~29% visible, ss-sipper ~23% visible).
 * `fit` / `ar` / `objectPosition` encode how each file should sit in its frame.
 */

export type HeroStillPiece = {
  id: string;
  src: string;
  alt: string;
  role:
    | "primary"
    | "bottle"
    | "organiser"
    | "notes"
    | "hamper"
    | "desk"
    | "accent";
  /** CSS aspect-ratio matching the visible product, not empty canvas */
  ar: string;
  fit: "cover" | "contain";
  objectPosition?: string;
};

export const HERO_STILL_LIFE: HeroStillPiece[] = [
  {
    id: "notebook",
    src: "/images/products/a5-fancy-magnetic-notebook-main.jpg",
    alt: "A5 magnetic notebook",
    role: "primary",
    ar: "428 / 640",
    fit: "cover",
    objectPosition: "center 20%",
  },
  {
    id: "bottle",
    src: "/images/products/trendy-tumbler-main.png",
    alt: "Trendy tumbler",
    role: "bottle",
    /* Visible product ~79% of square; frame taller so contain doesn't look sparse */
    ar: "3 / 4",
    fit: "contain",
    objectPosition: "center 55%",
  },
  {
    id: "organiser",
    src: "/images/products/wooden-organiser.png",
    alt: "Wooden desk organiser",
    role: "organiser",
    /* Transparent right margin ~19% — bias left so product fills the frame */
    ar: "501 / 362",
    fit: "contain",
    objectPosition: "12% center",
  },
  {
    id: "notes",
    src: "/images/products/sticky-notes-set-main.webp",
    alt: "Sticky notes set",
    role: "notes",
    ar: "1 / 1",
    fit: "cover",
    objectPosition: "center center",
  },
  {
    id: "hamper",
    src: "/images/categories/category-gifts.jpg",
    alt: "Gift box with gold ribbon for corporate gifting",
    role: "hamper",
    ar: "2 / 3",
    fit: "cover",
    objectPosition: "center 30%",
  },
  {
    id: "desk",
    src: "/images/products/vacuum-bottle-main.jpg",
    alt: "Vacuum bottle",
    role: "desk",
    ar: "734 / 580",
    fit: "cover",
    objectPosition: "center center",
  },
  {
    id: "accent",
    src: "/images/products/magazine-holder-main.jpg",
    alt: "Magazine holder",
    role: "accent",
    ar: "1500 / 1334",
    fit: "cover",
    objectPosition: "center center",
  },
];
