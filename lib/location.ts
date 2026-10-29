// Where an appointment takes place, and what to hand to a navigation app.
export type Place = {
  place: string;           // short name shown first, e.g. "המרפאה"
  address: string | null;  // street address, only for appointments at the clinic
  navQuery: string | null; // what a map app should search for; null = nothing to navigate to
};

// An appointment is "at the clinic" when its place is empty or mentions the clinic ("המרפאה", "מרפאה, קומה 2").
// Anything else (a hospital, an imaging center) is navigated to by the text the clinic typed.
export function resolvePlace(taskLocation: string | null | undefined, clinicAddress: string | null | undefined): Place {
  const loc = (taskLocation ?? "").trim();
  const address = (clinicAddress ?? "").trim() || null;
  const atClinic = loc === "" || loc.includes("מרפאה");
  if (atClinic) return { place: loc || "המרפאה", address, navQuery: address };
  return { place: loc, address: null, navQuery: loc };
}

export const wazeUrl = (q: string) => `https://waze.com/ul?q=${encodeURIComponent(q)}&navigate=yes`;
export const googleMapsUrl = (q: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
