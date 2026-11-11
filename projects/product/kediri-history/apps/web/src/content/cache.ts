/**
 * Tag cache granular. Menerbitkan satu Scene meng-invalidasi Scene itu dan
 * manifest Journey, bukan membangun ulang seluruh situs (Technical Bible
 * bagian 29).
 */
export const CACHE_TAGS = {
  journey: "journey",
  scene: (slug: string) => `scene:${slug}`,
  event: (slug: string) => `event:${slug}`,
  person: (slug: string) => `person:${slug}`,
  place: (slug: string) => `place:${slug}`,
  artifact: (slug: string) => `artifact:${slug}`,
  source: (id: string) => `source:${id}`,
  theme: (slug: string) => `theme:${slug}`,
} as const;
