import { toast } from "sonner";
import { errorMessage } from "@/lib/utils";

/**
 * Says how an action started by a tap went (a note created, an item added to a study) instead of
 * succeeding or failing in silence. Resolves to undefined when it failed, after telling the reader.
 */
export async function withFeedback<T>(
  action: Promise<T>,
  messages: { success?: string; failure: string },
): Promise<T | undefined> {
  try {
    const value = await action;
    if (messages.success) toast.success(messages.success);
    return value;
  } catch (cause) {
    toast.error(messages.failure, { description: errorMessage(cause) });
    return undefined;
  }
}
