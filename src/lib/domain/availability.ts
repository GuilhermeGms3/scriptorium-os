export type AvailabilityStatus =
  | "available"
  | "unavailable"
  | "ambiguous"
  | "restricted"
  | "demo"
  | "empty"
  | "not-imported"
  | "not-indexed"
  | "awaiting-source"
  | "license-restricted"
  | "not-analyzed"
  | "not-existing";

export type Availability<T> =
  | {
      status: "available" | "demo";
      data: T;
      reason?: string;
    }
  | {
      status: Exclude<AvailabilityStatus, "available" | "demo">;
      reason: string;
    };

export const available = <T>(data: T, reason?: string): Availability<T> => ({
  status: "available",
  data,
  ...(reason !== undefined ? { reason } : {}),
});

export const unavailable = <T>(
  status: Exclude<AvailabilityStatus, "available" | "demo">,
  reason: string,
): Availability<T> => ({ status, reason });

export const demo = <T>(data: T, reason: string): Availability<T> => ({
  status: "demo",
  data,
  reason,
});

export function hasAvailableData<T>(
  value: Availability<T>,
): value is Extract<Availability<T>, { status: "available" | "demo" }> {
  return value.status === "available" || value.status === "demo";
}
