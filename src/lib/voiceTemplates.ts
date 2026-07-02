import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json, Tables, TablesInsert } from "@/lib/database.types";
import {
  clampVoiceDesignPrompt,
  clampVoiceSettings,
  type VoiceDesignPrompt,
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

  return {
    name,
    description: input.description?.trim() ?? "",
    design_prompt: clampVoiceDesignPrompt(input.designPrompt) as unknown as Json,
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

export function templateRecipe(template: Pick<VoiceTemplate, "name" | "design_prompt" | "voice_settings">): VoiceRecipe {
  return {
    design_prompt: clampVoiceDesignPrompt(template.design_prompt as Partial<VoiceDesignPrompt>),
    voice_settings: clampVoiceSettings(template.voice_settings as Partial<VoiceSettings>),
    template_name: template.name,
  };
}
