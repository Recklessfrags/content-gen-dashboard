import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json, Tables, TablesInsert } from "@/lib/database.types";
import {
  GENERATION_DEFAULTS,
  clampGeneration,
  clampVoiceDesignPrompt,
  clampVoiceSettings,
  composeVoiceDescription,
  type VoiceDesignPrompt,
  type VoiceGeneration,
  type VoiceRecipe,
  type VoiceSettings,
} from "@/lib/casting";
import type { SupabaseCompatibleDatabase } from "@/lib/supabase/compat";

type VoiceTemplateClient = SupabaseClient<SupabaseCompatibleDatabase>;

export type VoiceTemplate = Tables<"voice_templates">;
export type VoiceTemplateInsertInput = {
  name: string;
  description?: string | null;
  designPrompt: Partial<VoiceDesignPrompt>;
  generation?: Partial<VoiceGeneration> | null;
  voiceSettings: Partial<VoiceSettings>;
  sourceCodename?: string | null;
};

export function validateVoiceTemplateName(name: string): string[] {
  const trimmed = name.trim();
  const errors: string[] = [];

  if (trimmed.length < 2) {
    errors.push("Template name must be at least 2 characters.");
  }

  if (trimmed.length > 60) {
    errors.push("Template name must be 60 characters or fewer.");
  }

  return errors;
}

export function buildVoiceTemplateInsert(
  input: VoiceTemplateInsertInput,
): TablesInsert<"voice_templates"> {
  const name = input.name.trim();
  const errors = validateVoiceTemplateName(name);

  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  const prompt = clampVoiceDesignPrompt(input.designPrompt);
  const generation = clampGeneration(input.generation);

  return {
    name,
    description: input.description?.trim() ?? "",
    design_prompt: {
      ...prompt,
      generation,
    } as unknown as Json,
    voice_settings: clampVoiceSettings(input.voiceSettings) as unknown as Json,
    source_codename: input.sourceCodename?.trim() || null,
  };
}

export async function listVoiceTemplates(
  supabase: VoiceTemplateClient,
): Promise<VoiceTemplate[]> {
  const { data, error } = await supabase
    .from("voice_templates")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createVoiceTemplate(
  supabase: VoiceTemplateClient,
  input: VoiceTemplateInsertInput,
): Promise<VoiceTemplate> {
  const insert = buildVoiceTemplateInsert(input);
  const { data, error } = await supabase
    .from("voice_templates")
    .insert(insert)
    .select("*")
    .single();

  if (error) {
    if ("code" in error && error.code === "23505") {
      throw new Error("ERROR: DESIGNATION ALREADY CLASSIFIED.");
    }
    throw new Error(error.message);
  }

  return data;
}

export async function deleteVoiceTemplate(
  supabase: VoiceTemplateClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("voice_templates").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

function recordFromJson(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function templateRecipe(template: Pick<VoiceTemplate, "name" | "design_prompt" | "voice_settings">): VoiceRecipe {
  const designPromptRecord = recordFromJson(template.design_prompt);
  const designPrompt = clampVoiceDesignPrompt(designPromptRecord as Partial<VoiceDesignPrompt>);
  const voiceDescriptionRaw =
    typeof designPrompt.voice_description_raw === "string" && designPrompt.voice_description_raw.trim().length > 0
      ? designPrompt.voice_description_raw
      : composeVoiceDescription(designPrompt);
  const previewTextRaw =
    typeof designPrompt.preview_text_raw === "string" ? designPrompt.preview_text_raw : "";
  const generationRecord = recordFromJson(designPromptRecord.generation);

  return {
    design_prompt: {
      ...designPrompt,
      voice_description_raw: voiceDescriptionRaw,
      preview_text_raw: previewTextRaw,
    },
    generation: Object.keys(generationRecord).length > 0
      ? clampGeneration(generationRecord as Partial<VoiceGeneration>)
      : { ...GENERATION_DEFAULTS },
    voice_settings: clampVoiceSettings(template.voice_settings as Partial<VoiceSettings>),
    template_name: template.name,
  };
}
