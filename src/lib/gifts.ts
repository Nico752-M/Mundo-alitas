
export const GIFTS = [
  {
    value: "colanta",
    label: "1 alita",
    description: "Una alita de pollo"
  },
  {
    value: "papitas",
    label: "Una porción de papitas",
    description: "Una porción de papitas"
  },
  {
    value: "bebida",
    label: "Una bebida",
    description: "Una bebida del evento"
  }
] as const;

export type GiftValue = (typeof GIFTS)[number]["value"];

export function giftLabel(value: string) {
  return GIFTS.find((gift) => gift.value === value)?.label ?? "Premio no identificado";
}
