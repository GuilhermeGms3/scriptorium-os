export type AvailabilityStatus =
  | "available"
  | "empty"
  | "not-imported"
  | "not-indexed"
  | "awaiting-source"
  | "license-restricted"
  | "not-analyzed"
  | "not-existing";

export type Availability<T> =
  | {
      status: "available";
      data: T;
      reason?: string;
    }
  | {
      status: Exclude<AvailabilityStatus, "available">;
      reason: string;
    };

export const available = <T>(data: T, reason?: string): Availability<T> => ({
  status: "available",
  data,
  ...(reason !== undefined ? { reason } : {}),
});

export const unavailable = <T>(
  status: Exclude<AvailabilityStatus, "available">,
  reason: string,
): Availability<T> => ({ status, reason });
