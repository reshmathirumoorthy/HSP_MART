/**
 * Company content model.
 * Only include researched/known fields. Mark placeholders clearly.
 */

export type CompanyService = {
  id: string;
  name: string;
  description: string;
};

export type CompanyContact = {
  website: string;
  email?: string;
  phone?: string;
  registeredOffice?: string;
  retailStore?: string;
};

export type CompanyInfo = {
  companyName: string;
  legalName?: string;
  tagline: string;
  description: string;
  businessType: string;
  services: CompanyService[];
  contact: CompanyContact;
  categories: string[];
};
