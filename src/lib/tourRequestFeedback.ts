export type TourIntent =
  | "ready_to_buy"
  | "compare_homes"
  | "explore_market"
  | "investment";

export type PurchaseTimeline =
  | "asap"
  | "one_to_three_months"
  | "three_to_six_months"
  | "flexible";

export interface TourRequestFeedback {
  version: 1;
  intent: TourIntent | null;
  timeline: PurchaseTimeline | null;
  priorities: string[];
  comments: string;
}

export const EMPTY_TOUR_REQUEST_FEEDBACK: TourRequestFeedback = {
  version: 1,
  intent: null,
  timeline: null,
  priorities: [],
  comments: "",
};

export const TOUR_INTENTS = [
  {
    value: "ready_to_buy",
    label: "Ready to buy",
    description: "Actively looking to purchase",
  },
  {
    value: "compare_homes",
    label: "Comparing homes",
    description: "Narrowing down my options",
  },
  {
    value: "explore_market",
    label: "Exploring the market",
    description: "Learning what is available",
  },
  {
    value: "investment",
    label: "Investment search",
    description: "Evaluating an investment",
  },
] as const;

export const PURCHASE_TIMELINES = [
  { value: "asap", label: "As soon as possible" },
  { value: "one_to_three_months", label: "Within 1-3 months" },
  { value: "three_to_six_months", label: "Within 3-6 months" },
  { value: "flexible", label: "My timeline is flexible" },
] as const;

export const TOUR_PRIORITIES = [
  { value: "price", label: "Price and value" },
  { value: "location", label: "Location" },
  { value: "schools", label: "Schools" },
  { value: "commute", label: "Commute" },
  { value: "space", label: "Space and layout" },
  { value: "investment_potential", label: "Investment potential" },
  { value: "storage", label: "Storage" },
  { value: "move_in_ready", label: "Move-in ready / condition" },
  { value: "outdoor_space", label: "Yard / outdoor space" },
  { value: "parking", label: "Parking / garage" },
  { value: "natural_light", label: "Natural light" },
  { value: "kitchen", label: "Kitchen" },
  { value: "walkability", label: "Walkability" },
  { value: "safety", label: "Safety / neighborhood" },
  { value: "hoa_fees", label: "HOA / maintenance fees" },
  { value: "pet_friendly", label: "Pet-friendly" },
] as const;

export function parseTourRequestFeedback(
  value: unknown,
): TourRequestFeedback | null {
  if (typeof value === "string") {
    try {
      return parseTourRequestFeedback(JSON.parse(value));
    } catch {
      return value.trim()
        ? { ...EMPTY_TOUR_REQUEST_FEEDBACK, comments: value.trim() }
        : null;
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const intent = row.intent ?? row.Intent;
  const timeline = row.timeline ?? row.Timeline;
  const priorities = row.priorities ?? row.Priorities;
  const comments = row.comments ?? row.Comments;

  return {
    version: 1,
    intent:
      typeof intent === "string"
        ? (intent.trim().toLowerCase() as TourIntent)
        : null,
    timeline:
      typeof timeline === "string"
        ? (timeline.trim().toLowerCase() as PurchaseTimeline)
        : null,
    priorities: Array.isArray(priorities)
      ? priorities.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
    comments: typeof comments === "string" ? comments : "",
  };
}

export function optionLabel(
  options: ReadonlyArray<{ value: string; label: string }>,
  value: string | null,
): string {
  return (
    options.find((option) => option.value === value)?.label ?? "Not specified"
  );
}
