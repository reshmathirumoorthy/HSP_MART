export type Locale = "en" | "hi";
export const LOCALES: Locale[] = ["en", "hi"];
export const LANG_COOKIE = "hsp_lang";

const en = {
  "login.title": "Sign in to HSP Mart",
  "login.subtitle": "Customers, partners, suppliers and HSP staff all sign in here.",
  "login.identifier": "Email or mobile number",
  "login.send": "Send sign-in code",
  "login.sending": "Sending code…",
  "login.sent": "We sent a 6-digit code to",
  "login.code": "Sign-in code",
  "login.submit": "Sign in",
  "login.verifying": "Verifying…",
  "partner.portal": "Partner portal",
  "partner.nav.earnings": "Earnings",
  "partner.nav.leads": "Leads",
  "partner.nav.quotes": "Quotes",
  "partner.nav.coach": "Sales coach",
  "ledger.pending": "Pending",
  "ledger.earned": "Earned",
  "ledger.approved": "Approved",
  "ledger.paid": "Paid",
  "ledger.title": "Commission ledger",
  "common.signOut": "Sign out",
} as const;

export type MessageKey = keyof typeof en;

const hi: Record<MessageKey, string> = {
  "login.title": "HSP Mart में साइन इन करें",
  "login.subtitle": "ग्राहक, पार्टनर, सप्लायर और HSP स्टाफ़ सभी यहीं साइन इन करते हैं।",
  "login.identifier": "ईमेल या मोबाइल नंबर",
  "login.send": "साइन-इन कोड भेजें",
  "login.sending": "कोड भेजा जा रहा है…",
  "login.sent": "हमने 6 अंकों का कोड भेजा है",
  "login.code": "साइन-इन कोड",
  "login.submit": "साइन इन करें",
  "login.verifying": "जाँच हो रही है…",
  "partner.portal": "पार्टनर पोर्टल",
  "partner.nav.earnings": "कमाई",
  "partner.nav.leads": "लीड्स",
  "partner.nav.quotes": "कोटेशन",
  "partner.nav.coach": "सेल्स कोच",
  "ledger.pending": "लंबित",
  "ledger.earned": "अर्जित",
  "ledger.approved": "स्वीकृत",
  "ledger.paid": "भुगतान हुआ",
  "ledger.title": "कमीशन खाता",
  "common.signOut": "साइन आउट",
};

export const MESSAGES: Record<Locale, Record<MessageKey, string>> = { en, hi };
export const translator = (locale: Locale) => (key: MessageKey) => MESSAGES[locale][key] ?? en[key];
