/**
 * Product photography under /public/images/products/.
 *
 * Coverage: 36 / 36 products mapped below.
 *
 * - 34 products use verified HSP Mart store photography (local copies).
 * - Phase 11C: laptop-stand-01 and cable-organizer-01 use licensed Wikimedia
 *   Commons photographs (no official HSP Mart listing/SKU match). See
 *   public/images/products/attribution/PHASE11C_STOCK_ATTRIBUTION.md.
 */

export type ProductMediaEntry = {
  productId: string;
  sourceHandle: string;
  sourceTitle: string;
  /** Display name aligned with the official HSP Mart listing. */
  officialName: string;
  images: string[];
};

export const productMediaById: Record<string, ProductMediaEntry> = {
  "executive-notebook-01": {
    productId: "executive-notebook-01",
    sourceHandle: "note-book-set",
    sourceTitle: "Note Book Set",
    officialName: "Note Book Set",
    images: [
      "/images/products/note-book-set-main.png",
      "/images/products/note-book-set-2.png",
    ],
  },
  "spiral-notebook-01": {
    productId: "spiral-notebook-01",
    sourceHandle: "lotus-spiral-pad-no-6-a4200-pages",
    sourceTitle: "Lotus Spiral Pad No.6",
    officialName: "Lotus Spiral Pad No.6",
    images: [
      "/images/products/lotus-spiral-pad-main.jpg",
      "/images/products/lotus-spiral-pad-2.jpg",
      "/images/products/lotus-spiral-pad-3.jpg",
      "/images/products/lotus-spiral-pad-4.jpg",
    ],
  },
  "writing-pad-01": {
    productId: "writing-pad-01",
    sourceHandle: "hans-writing-pad-no-33-80sheets",
    sourceTitle: "Hans Writing Pad No.33",
    officialName: "Hans Writing Pad No.33",
    images: ["/images/products/hans-writing-pad.jpg"],
  },
  "sticky-notes-01": {
    productId: "sticky-notes-01",
    sourceHandle: "wild-happy-animal-index-tabs-sticky-notes",
    sourceTitle: "Index Tabs Sticky Notes",
    officialName: "Index Tabs Sticky Notes",
    images: [
      "/images/products/sticky-notes-set-main.webp",
      "/images/products/sticky-notes-set-2.webp",
      "/images/products/sticky-notes-set-3.webp",
    ],
  },
  "document-tray-01": {
    productId: "document-tray-01",
    sourceHandle: "magazine-holder-ew",
    sourceTitle: "Magazine Holder",
    officialName: "Magazine Holder",
    images: [
      "/images/products/magazine-holder-main.jpg",
      "/images/products/magazine-holder-2.jpg",
      "/images/products/magazine-holder-3.jpg",
    ],
  },
  "file-organizer-01": {
    productId: "file-organizer-01",
    sourceHandle:
      "worldone-box-file-with-magnetic-button-closure-spine-for-easy-classification-finger-hole-for-ease-to-pulling-out-str",
    sourceTitle: "Worldone Box File",
    officialName: "Worldone Box File",
    images: [
      "/images/products/box-file-main.webp",
      "/images/products/box-file-2.webp",
      "/images/products/box-file-3.jpg",
      "/images/products/box-file-4.jpg",
    ],
  },
  "document-folder-01": {
    productId: "document-folder-01",
    sourceHandle: "solo-button-folder-ch118-transparent-set-of-12",
    sourceTitle: "Solo Button Folder",
    officialName: "Solo Button Folder",
    images: [
      "/images/products/button-folder-main.webp",
      "/images/products/button-folder-2.webp",
      "/images/products/button-folder-3.webp",
    ],
  },
  "desktop-storage-01": {
    productId: "desktop-storage-01",
    sourceHandle:
      "zipit-automotive-storage-box-red-asb-2-rn-stylish-amp-durable-organizer",
    sourceTitle: "ZIPIT Storage Box",
    officialName: "ZIPIT Storage Box",
    images: [
      "/images/products/auto-storage-box-main.jpg",
      "/images/products/auto-storage-box-2.jpg",
      "/images/products/auto-storage-box-3.jpg",
    ],
  },
  "clipboard-01": {
    productId: "clipboard-01",
    sourceHandle: "spring-action-file-a4-sg501",
    sourceTitle: "Spring Action File A4",
    officialName: "Spring Action File A4",
    images: [
      "/images/products/spring-action-file-main.webp",
      "/images/products/spring-action-file-2.webp",
      "/images/products/spring-action-file-3.webp",
    ],
  },
  "document-wallet-01": {
    productId: "document-wallet-01",
    sourceHandle: "flexi-document-bag-with-xtra-pocket-lock-handle-dc555",
    sourceTitle: "Flexi Document Bag",
    officialName: "Flexi Document Bag",
    images: [
      "/images/products/document-bag-main.webp",
      "/images/products/document-bag-2.webp",
      "/images/products/document-bag-3.webp",
    ],
  },
  "workspace-kit-01": {
    productId: "workspace-kit-01",
    sourceHandle:
      "desk-fan-with-pen-container-pencil-sharpener-3-in-1-smart-organizer",
    sourceTitle: "Desk Fan Organizer",
    officialName: "Desk Fan Organizer",
    images: [
      "/images/products/desk-fan-organizer-main.jpg",
      "/images/products/desk-fan-organizer-2.jpg",
      "/images/products/desk-fan-organizer-3.jpg",
    ],
  },
  "desk-organizer-01": {
    productId: "desk-organizer-01",
    sourceHandle: "wooden-sleek-organiser-ew",
    sourceTitle: "Wooden Sleek Organiser",
    officialName: "Wooden Sleek Organiser",
    images: ["/images/products/wooden-organiser.png"],
  },
  "cable-organizer-01": {
    productId: "cable-organizer-01",
    sourceHandle: "wikimedia-cable-core-earphone-cable-tidy",
    sourceTitle: "Cable Core Earphone Cable Tidy",
    officialName: "Cable Organizer",
    images: ["/images/products/cable-organizer-main.jpg"],
  },
  "pen-holder-01": {
    productId: "pen-holder-01",
    sourceHandle: "rotating-pencil-holder-metal-mesh-cup-holder-for-desk-office",
    sourceTitle: "Rotating Pencil Holder",
    officialName: "Rotating Pencil Holder",
    images: [
      "/images/products/rotating-pencil-holder-main.jpg",
      "/images/products/rotating-pencil-holder-2.jpg",
      "/images/products/rotating-pencil-holder-3.jpg",
    ],
  },
  "desk-tray-01": {
    productId: "desk-tray-01",
    sourceHandle: "maharaja-pen-stand-ew",
    sourceTitle: "Maharaja Pen Stand",
    officialName: "Maharaja Pen Stand",
    images: ["/images/products/maharaja-pen-stand.png"],
  },
  "card-holder-01": {
    productId: "card-holder-01",
    sourceHandle: "solo-visiting-card-sleeves-bc810-25-sheet",
    sourceTitle: "Solo Visiting Card Sleeves",
    officialName: "Solo Visiting Card Sleeves",
    images: [
      "/images/products/visiting-card-sleeves-main.webp",
      "/images/products/visiting-card-sleeves-2.webp",
      "/images/products/visiting-card-sleeves-3.webp",
    ],
  },
  "laptop-stand-01": {
    productId: "laptop-stand-01",
    sourceHandle: "wikimedia-laptop-stand",
    sourceTitle: "Laptop stand",
    officialName: "Laptop Stand",
    images: ["/images/products/laptop-stand-main.jpg"],
  },
  "desk-calendar-01": {
    productId: "desk-calendar-01",
    sourceHandle: "calculator-diary-smart-stylish-multi-functional",
    sourceTitle: "Calculator Diary",
    officialName: "Calculator Diary",
    images: [
      "/images/products/calculator-diary-main.jpg",
      "/images/products/calculator-diary-2.jpg",
      "/images/products/calculator-diary-3.jpg",
    ],
  },
  "premium-pen-set-01": {
    productId: "premium-pen-set-01",
    sourceHandle:
      "parker-special-edition-vector-time-check-gold-trim-roller-ball-pen-ink-color-blue-navigator-technology",
    sourceTitle: "Parker Vector Special Edition Pen",
    officialName: "Parker Vector Special Edition Pen",
    images: [
      "/images/products/parker-vector-pen-main.jpg",
      "/images/products/parker-vector-pen-2.jpg",
      "/images/products/parker-vector-pen-3.jpg",
      "/images/products/parker-vector-pen-4.jpg",
    ],
  },
  "gel-pen-pack-01": {
    productId: "gel-pen-pack-01",
    sourceHandle: "kk-7412-gel-pen-bi",
    sourceTitle: "KK-7412 Gel Pen",
    officialName: "KK-7412 Gel Pen",
    images: [
      "/images/products/kk-gel-pen-main.png",
      "/images/products/kk-gel-pen-2.png",
      "/images/products/kk-gel-pen-3.png",
    ],
  },
  "marker-set-01": {
    productId: "marker-set-01",
    sourceHandle: "washable-marker-scented-16-set-mcr-1990-29-rn",
    sourceTitle: "Washable Marker Set",
    officialName: "Washable Marker Set",
    images: [
      "/images/products/marker-set-main.webp",
      "/images/products/marker-set-2.webp",
      "/images/products/marker-set-3.webp",
    ],
  },
  "mechanical-pencil-01": {
    productId: "mechanical-pencil-01",
    sourceHandle: "pencil-set-ps-fy-1001",
    sourceTitle: "Pencil Set",
    officialName: "Pencil Set",
    images: [
      "/images/products/pencil-set-main.webp",
      "/images/products/pencil-set-2.jpg",
    ],
  },
  "signature-pen-01": {
    productId: "signature-pen-01",
    sourceHandle: "harry-potter-quill-pen-gift-set-vintage-feather-pen-with-ink",
    sourceTitle: "Quill Pen Gift Set",
    officialName: "Quill Pen Gift Set",
    images: [
      "/images/products/harry-potter-quill-main.jpg",
      "/images/products/harry-potter-quill-2.jpg",
      "/images/products/harry-potter-quill-3.jpg",
    ],
  },
  "presentation-folder-01": {
    productId: "presentation-folder-01",
    sourceHandle: "worldone-rf003-presentation-folder",
    sourceTitle: "WORLDONE RF003 Presentation Folder",
    officialName: "WORLDONE RF003 Presentation Folder",
    images: ["/images/products/presentation-folder.jpg"],
  },
  "document-portfolio-01": {
    productId: "document-portfolio-01",
    sourceHandle: "solo-report-file-rf101-pack-of-6",
    sourceTitle: "Solo Report File",
    officialName: "Solo Report File",
    images: [
      "/images/products/report-file-main.jpg",
      "/images/products/report-file-2.jpg",
      "/images/products/report-file-3.jpg",
    ],
  },
  "conference-folder-01": {
    productId: "conference-folder-01",
    sourceHandle: "ring-binder-2d-ring-17mm-a4-rb407",
    sourceTitle: "Ring Binder A4",
    officialName: "Ring Binder A4",
    images: [
      "/images/products/ring-binder-main.webp",
      "/images/products/ring-binder-2.webp",
      "/images/products/ring-binder-3.webp",
    ],
  },
  "meeting-kit-01": {
    productId: "meeting-kit-01",
    sourceHandle: "expanding-file-elastic-with-sewing-12-section-a4-size-ex802",
    sourceTitle: "Expanding File A4",
    officialName: "Expanding File A4",
    images: [
      "/images/products/expanding-file-main.webp",
      "/images/products/expanding-file-2.webp",
      "/images/products/expanding-file-3.webp",
    ],
  },
  "executive-gift-set-01": {
    productId: "executive-gift-set-01",
    sourceHandle:
      "premium-luxury-corporate-gift-hamper-customized-executive-gift-box-for-employees-clients-business-partners",
    sourceTitle: "Corporate Gift Hamper",
    officialName: "Corporate Gift Hamper",
    images: ["/images/products/harry-potter-quill-main.jpg"],
  },
  "notebook-pen-gift-01": {
    productId: "notebook-pen-gift-01",
    sourceHandle: "lotus-hard-bound-easy-register-96pages",
    sourceTitle: "Lotus Hard Bound Register",
    officialName: "Lotus Hard Bound Register",
    images: ["/images/products/lotus-register.jpg"],
  },
  "desk-gift-set-01": {
    productId: "desk-gift-set-01",
    sourceHandle:
      "premium-luxury-gift-hamper-basket-chocolates-photo-frame-plant-decorative-gift-set",
    sourceTitle: "Premium Gift Hamper Basket",
    officialName: "Premium Gift Hamper Basket",
    images: ["/images/products/presentation-folder.jpg"],
  },
  "welcome-kit-01": {
    productId: "welcome-kit-01",
    sourceHandle:
      "premium-luxury-gift-hamper-basket-chocolates-photo-frame-plant-decorative-gift-set",
    sourceTitle: "Premium Gift Hamper Basket",
    officialName: "Premium Gift Hamper Basket",
    images: ["/images/categories/category-gifts.jpg"],
  },
  "corporate-gift-box-01": {
    productId: "corporate-gift-box-01",
    sourceHandle:
      "premium-luxury-corporate-gift-hamper-customized-executive-gift-box-for-employees-clients-business-partners",
    sourceTitle: "Corporate Gift Hamper",
    officialName: "Corporate Gift Hamper",
    images: ["/images/categories/category-gifts.jpg"],
  },
  "branded-tumbler-01": {
    productId: "branded-tumbler-01",
    sourceHandle: "vacuum-insulated-bottle-500ml-369-nv",
    sourceTitle: "Vacuum Insulated Bottle 500ml",
    officialName: "Vacuum Insulated Bottle 500ml",
    images: [
      "/images/products/vacuum-bottle-2.jpg",
      "/images/products/vacuum-bottle-main.jpg",
    ],
  },
  "custom-notebook-01": {
    productId: "custom-notebook-01",
    sourceHandle:
      "a5-fancy-magnetic-notebook-elegant-secure-perfect-for-everyday-use",
    sourceTitle: "A5 Fancy Magnetic Notebook",
    officialName: "A5 Fancy Magnetic Notebook",
    images: [
      "/images/products/a5-fancy-magnetic-notebook-main.jpg",
      "/images/products/a5-fancy-magnetic-notebook-2.jpg",
      "/images/products/a5-fancy-magnetic-notebook-3.jpg",
      "/images/products/a5-fancy-magnetic-notebook-4.jpg",
    ],
  },
  "custom-pen-01": {
    productId: "custom-pen-01",
    sourceHandle:
      "parker-special-edition-vector-time-check-gold-trim-roller-ball-pen-ink-color-blue-navigator-technology",
    sourceTitle: "Parker Vector Special Edition Pen",
    officialName: "Parker Vector Special Edition Pen",
    images: [
      "/images/products/parker-vector-pen-main.jpg",
      "/images/products/parker-vector-pen-2.jpg",
      "/images/products/parker-vector-pen-3.jpg",
    ],
  },
  "custom-folder-01": {
    productId: "custom-folder-01",
    sourceHandle: "worldone-rf003-presentation-folder",
    sourceTitle: "WORLDONE RF003 Presentation Folder",
    officialName: "WORLDONE RF003 Presentation Folder",
    images: ["/images/products/presentation-folder.jpg"],
  },
};

export function getProductImages(productId: string): string[] {
  return productMediaById[productId]?.images ?? [];
}

export function productsWithRealImages(): string[] {
  return Object.keys(productMediaById);
}
