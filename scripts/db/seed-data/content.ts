/**
 * One-time seed for storefront content (site_content). After seeding, edit it in the admin app
 * (Site content). The storefront never imports this file.
 */
import type { CompanyInfo } from "@/types/company";
import type { ProductCategory } from "@/types/category";
import type { AboutContent, Announcement, Faq, HomeContent, Navigation } from "@/types/site";

const gifting = (sub: string) => `/products?category=gifts&subcategory=${encodeURIComponent(sub)}`;

export const company: CompanyInfo = {
  companyName: "HSP Mart",
  legalName: "HSP Office Basics Private Limited",
  tagline: "Corporate gifting, hampers, boards and office essentials for every occasion.",
  description:
    "HSP Mart is the online storefront of HSP Office Basics Private Limited. We curate and hand-pack corporate, festive, wedding and occasion gifts, and supply presentation boards and office essentials alongside them. Individuals can order single gifts; businesses can request bulk quantities with logo branding and custom packaging.",
  businessType: "Corporate and occasion gifting, presentation boards and office supplies — retail and bulk",
  services: [
    { id: "svc-retail", name: "Everyday shopping", description: "Single-unit and small-quantity purchases for personal and desk use." },
    { id: "svc-bulk", name: "Bulk orders", description: "Request a quote for larger quantities for teams, offices and events." },
    { id: "svc-custom", name: "Customization", description: "Selected products can be branded with a logo, name or packaging options." },
    { id: "svc-gifting", name: "Corporate gifting", description: "Gift sets and kits for employees, clients and occasions." },
  ],
  contact: {
    website: "https://hspmart.com",
    email: "info@hspmart.com",
    phone: "+91 99996 98694",
    registeredOffice: "1112A, 11th Floor, Ansal Bhawan, 16 KG Marg, New Delhi – 110001",
    retailStore: "B-12, Shubham Enclave, Paschim Vihar, New Delhi – 110063",
  },
  categories: ["Gifting", "Custom Products", "Presentation", "Stationery", "Office Essentials", "Desk & Accessories", "Writing Instruments"],
};

export const faqs: Faq[] = [
  { id: "faq-bulk", question: "Do you accept bulk orders?", answer: "Yes. Request a bulk quote from a product page or the Bulk Orders form. HSP prices larger quantities against approved suppliers and replies with a formal quotation." },
  { id: "faq-custom", question: "Can I customize products?", answer: "Selected products support personalization. On those product pages you can enter text (for example a name), preview how it may look, then add the item to cart or include it in a bulk quote." },
  { id: "faq-custom-how", question: "How does customization work?", answer: "Open a customizable product, choose Personalize, enter your text, and adjust font, colour or placement when those options are offered. The preview updates as you type. Final print placement and appearance may vary from the on-screen preview; HSP approves the artwork with you before production." },
  { id: "faq-individual", question: "Can individuals order?", answer: "Yes. HSP Mart is for individual customers as well as businesses ordering in bulk." },
  { id: "faq-packaging", question: "Do you provide branded packaging?", answer: "Branded packaging can be requested on eligible products through the bulk quote flow when packaging options are available." },
  { id: "faq-contact", question: "How can I contact HSP Mart?", answer: "Call +91 99996 98694, email info@hspmart.com, or visit hspmart.com. Retail pickup is available at Paschim Vihar, New Delhi." },
];

export const categories: ProductCategory[] = [
  { id: "cat-stationery", slug: "stationery", name: "Stationery", description: "Notebooks, paper and everyday writing essentials.", featured: true, size: "featured" },
  { id: "cat-office", slug: "office", name: "Office Essentials", description: "Practical supplies for home and workplace desks.", featured: true, size: "medium" },
  { id: "cat-desk", slug: "desk", name: "Desk & Accessories", description: "Organizers and tools that keep your space clear.", featured: true, size: "medium" },
  { id: "cat-writing", slug: "writing", name: "Writing Instruments", description: "Pens and sets for daily notes and signing.", size: "small" },
  { id: "cat-presentation", slug: "presentation", name: "Presentation", description: "Folders and materials for meetings and pitches.", size: "small" },
  { id: "cat-gifts", slug: "gifts", name: "Gifting", description: "Thoughtful gifts for personal and team moments.", featured: true, size: "wide" },
  { id: "cat-custom", slug: "custom", name: "Custom Products", description: "Add a name, logo or packaging when you need it.", featured: true, size: "wide" },
];

export const announcement: Announcement = {
  messages: ["Free delivery on orders above {freeShippingThreshold}"],
  showPhone: true,
};

export const navigation: Navigation = {
  primary: [
    { href: "/", label: "Home" },
    { href: "/products", label: "Products" },
    { href: gifting("Corporate Gifting"), label: "Corporate Gifts" },
    { href: "/products?category=presentation", label: "Boards" },
    { href: "/products?category=gifts", label: "Gifting" },
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
  ],
  gifting: [
    { href: gifting("Corporate Gifting"), label: "Corporate Gifting" },
    { href: gifting("Festive Gifting"), label: "Festive Gifting" },
    { href: gifting("Wedding Gifting"), label: "Wedding Gifting" },
    { href: gifting("Occasional Gifting"), label: "Occasional Gifting" },
  ],
  shopExtras: [{ href: "/bulk-quote", label: "Bulk Orders" }],
  explore: [
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/faq", label: "FAQ" },
  ],
  footer: {
    shop: [
      { href: "/products", label: "All products" },
      { href: gifting("Corporate Gifting"), label: "Corporate gifting" },
      { href: gifting("Festive Gifting"), label: "Festive gifting" },
      { href: gifting("Wedding Gifting"), label: "Wedding gifting" },
      { href: "/products?category=presentation", label: "Boards & presentation" },
      { href: "/products?category=stationery", label: "Stationery & office" },
    ],
    help: [
      { href: "/bulk-quote", label: "Bulk orders" },
      { href: "/products?customizable=true", label: "Customization" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/about", label: "About" },
      { href: "/account", label: "Account" },
      { href: "/wishlist", label: "Wishlist" },
      { href: "/cart", label: "Cart" },
    ],
    legal: [
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ],
  },
};

export const home: HomeContent = {
  hero: {
    titleBefore: "The art of",
    titleEmphasis: "corporate",
    titleAfter: "gifting.",
    lead: "Hampers and branded gifts, curated and hand-packed by our own team in Delhi, for the clients, colleagues and celebrations that matter.",
    primaryCta: { label: "Explore corporate gifts", href: gifting("Corporate Gifting") },
    secondaryCta: { label: "Request a quote", href: "/bulk-quote" },
    featuredSlug: "luxury-decorative-gift-hamper-with-floral-birdcage-premium-festive-corporate-gift-basket",
  },
  occasions: [
    { label: "Corporate", note: "Clients, teams & rewards", subcategory: "Corporate Gifting" },
    { label: "Festive", note: "Diwali, Rakhi & seasonal", subcategory: "Festive Gifting" },
    { label: "Wedding", note: "Shagun, platters & trousseau", subcategory: "Wedding Gifting" },
    { label: "Occasions", note: "Birthdays & celebrations", subcategory: "Occasional Gifting" },
  ],
  hampers: {
    title: "Signature hampers",
    copy: "Composed, wrapped and packed by our own team. Order one, or add them to your quote and we'll tailor contents and branding for your occasion.",
    link: { label: "All gifts", href: "/products?category=gifts" },
    productIds: [],
  },
  trail: {
    title: "Every gift, considered",
    copy: "Every hamper is put together with care, in-house, from the first call to the delivery date.",
    steps: [
      { title: "Understand the occasion", copy: "Tell us who the gifts are for, how many, the budget per unit and the date they must land." },
      { title: "Curate the gifts", copy: "We shortlist hampers and kits from the catalogue, or build a custom set around your brief." },
      { title: "Pack with a personal touch", copy: "Assembled and packed by our own team, with your logo, names or custom packaging where you need it." },
      { title: "Delivered on time", copy: "Dispatched against the date you need them by." },
    ],
    cta: { label: "Start with a quote request", href: "/bulk-quote" },
    note: "Pricing, branding and delivery are confirmed after we review your request.",
  },
  dispatch: {
    title: "Signature corporate gifts",
    copy: "Refined writing sets and desk gifts, in stock and ready to dispatch. Order one to sample, or add them to your quote for your whole team.",
    link: { label: "All corporate gifts", href: `${gifting("Corporate Gifting")}&stock=in-stock` },
    productIds: [],
  },
  house: {
    title: "Gifting and the office, from one trusted house.",
    copy: "HSP Office Basics supplies magnetic whiteboards, notice and chalk boards, easel stands and desk essentials alongside its gifting range, so one vendor can cover both.",
    links: [
      { label: "Boards & presentation", href: "/products?category=presentation" },
      { label: "Desk accessories", href: "/products?category=desk" },
      { label: "Stationery", href: "/products?category=stationery" },
    ],
    productIds: [],
  },
  newArrivals: {
    title: "New in the catalogue",
    copy: "The latest hampers, gifts and boards added to the HSP Mart range.",
    link: { label: "View all new arrivals", href: "/products" },
    // Filled by the seed with the newest imported products; editable in the admin app.
    productIds: [],
  },
  close: {
    title: "Planning gifts for fifty people, or five thousand?",
    cta: { label: "Request a quote", href: "/bulk-quote" },
    address: "Retail store, Paschim Vihar · Office, Connaught Place, New Delhi",
  },
};

export const about: AboutContent = {
  title: "About HSP Mart",
  focusTitle: "What we focus on",
  servicesTitle: "How you can shop",
  legalTitle: "Legal name",
  actions: [
    { label: "Browse products", href: "/products" },
    { label: "Request a bulk quote", href: "/bulk-quote" },
    { label: "Contact", href: "/contact" },
  ],
};

export const siteContent = { company, faqs, categories, announcement, navigation, home, about };
