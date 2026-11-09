/**
 * Central HSP Mart company content.
 * Only researched/known storefront facts — no invented metrics.
 */

import type { CompanyInfo } from "@/types/company";

export const company: CompanyInfo = {
  companyName: "HSP Mart",
  legalName: "HSP Office Basics Private Limited",
  tagline: "Corporate gifting, hampers, boards and office essentials for every occasion.",
  description:
    "HSP Mart is the online storefront of HSP Office Basics Private Limited. The catalogue focuses on stationery, office essentials, desk accessories, writing instruments, presentation materials and gifting. Individual customers can shop everyday products; businesses can request bulk orders, branding and packaging support. Some products are manufactured in-house and others are imported for the catalogue.",
  businessType: "Stationery, gifting and office products — retail and bulk",
  services: [
    {
      id: "svc-retail",
      name: "Everyday shopping",
      description: "Single-unit and small-quantity purchases for personal and desk use.",
    },
    {
      id: "svc-bulk",
      name: "Bulk orders",
      description: "Request a quote for larger quantities for teams, offices and events.",
    },
    {
      id: "svc-custom",
      name: "Customization",
      description: "Selected products can be branded with a logo, name or packaging options.",
    },
    {
      id: "svc-gifting",
      name: "Corporate gifting",
      description: "Gift sets and kits for employees, clients and occasions.",
    },
  ],
  contact: {
    website: "https://hspmart.com",
    email: "info@hspmart.com",
    phone: "+91 99996 98694",
    // Verified from the public HSP Mart website (hspmart.com).
    registeredOffice:
      "1112A, 11th Floor, Ansal Bhawan, 16 KG Marg, New Delhi – 110001",
    retailStore: "B-12, Shubham Enclave, Paschim Vihar, New Delhi – 110063",
  },
  categories: [
    "Stationery",
    "Office Essentials",
    "Desk & Accessories",
    "Writing Instruments",
    "Presentation",
    "Gifting",
    "Custom Products",
  ],
};

export const companyFaqs = [
  {
    id: "faq-bulk",
    question: "Do you accept bulk orders?",
    answer:
      "Yes. You can request a bulk quote from the product page or the Bulk Orders form. Pricing for larger quantities is confirmed through the quote process — this storefront does not show invented bulk prices.",
  },
  {
    id: "faq-custom",
    question: "Can I customize products?",
    answer:
      "Selected products support personalization. On those product pages you can enter text (for example a name), preview how it may look, then add the item to cart or include it in a bulk quote.",
  },
  {
    id: "faq-custom-how",
    question: "How does customization work?",
    answer:
      "Open a customizable product, choose Personalize, enter your text, and adjust font, colour or placement when those options are offered. The preview updates as you type. Final print placement and appearance may vary from the on-screen preview.",
  },
  {
    id: "faq-individual",
    question: "Can individuals order?",
    answer:
      "Yes. HSP Mart is for individual customers as well as businesses ordering in bulk.",
  },
  {
    id: "faq-packaging",
    question: "Do you provide branded packaging?",
    answer:
      "Branded packaging can be requested on eligible products through the bulk quote flow when packaging options are available.",
  },
  {
    id: "faq-contact",
    question: "How can I contact HSP Mart?",
    answer:
      "Call +91 99996 98694, email info@hspmart.com, or visit hspmart.com. Retail pickup is available at Paschim Vihar, New Delhi.",
  },
] as const;
