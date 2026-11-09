"use client";

import { companyFaqs } from "@/data/company";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type FaqItem = (typeof companyFaqs)[number];

type Props = {
  faqs: readonly FaqItem[];
};

/** shadcn/ui (Radix) accordion — keyboard + ARIA handled by the primitive. */
export function FaqAccordion({ faqs }: Props) {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={faqs[0]?.id}
      className="my-8 overflow-hidden rounded-xl border border-border bg-card"
    >
      {faqs.map((faq) => (
        <AccordionItem
          key={faq.id}
          value={faq.id}
          className="border-b border-border px-5 last:border-b-0 sm:px-6"
        >
          <AccordionTrigger className="py-5 text-left text-base font-semibold text-brand-dark hover:no-underline [&>svg]:text-primary">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="pb-5 text-[0.95rem] leading-relaxed text-muted-foreground">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
