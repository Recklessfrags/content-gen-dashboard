import type { SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";

type TelemetryClient = SupabaseClient<SupabaseCompatibleDatabase>;

export type KeepRateRow = { field: string; proposed: string; saved: string };

/**
 * Best-effort keep-rate telemetry. Records, per field, what the model proposed vs.
 * what the operator actually saved, so we can learn which fields to trust. NEVER
 * throws and never surfaces an error — telemetry must not break a Save.
 */
export async function logGuidelineKeepRate(
  client: TelemetryClient,
  channel: string,
  generatedAt: string | null,
  rows: KeepRateRow[],
): Promise<void> {
  if (rows.length === 0) return;
  try {
    await client.from("channel_guideline_telemetry").insert(
      rows.map((r) => ({
        channel,
        field: r.field,
        proposed: r.proposed,
        saved: r.saved,
        generated_at: generatedAt,
      })),
    );
  } catch {
    // swallow — telemetry is best-effort and must never break a Save
  }
}
