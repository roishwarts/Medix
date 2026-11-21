// The company details the privacy policy and the accessibility statement need. Fill the values in below (one place,
// every language): anything left empty keeps showing its "[להשלים: …]" placeholder, and `npm run check:legal` lists
// what is still missing. This is a legal text: the wording of the pages themselves should be reviewed by a lawyer.
export const LEGAL = {
  companyName: "", // operating company, as registered
  dataLocation: "", // where the servers / storage are (country or region)
  retention: "", // how long medical/personal data is kept, and what happens at the end of treatment or on a deletion request
  securityContactName: "", // privacy / information-security contact
  securityContactEmail: "",
  accessibilityCoordinatorName: "",
  accessibilityCoordinatorPhone: "",
  accessibilityCoordinatorEmail: "",
  accessibilityKnownGaps: "", // pages or components that have not had a full accessibility review (may stay empty when none)
};

export type LegalKey = keyof typeof LEGAL;

// Puts the configured values in place of the bracketed placeholders of one translated sentence, in order:
// L(t("… [להשלים: א] … [להשלים: ב]"), "companyName", "dataLocation"). A key with no value keeps its placeholder.
export function L(text: string, ...keys: LegalKey[]): string {
  let i = 0;
  return text.replace(/\[[^\]]*\]/g, (placeholder) => {
    const value = LEGAL[keys[i++]];
    return value ? value : placeholder;
  });
}
