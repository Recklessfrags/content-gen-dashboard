import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ControlRoom from "@/components/ControlRoom";
import { UiModeProvider } from "@/components/aurora/UiModeContext";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <UiModeProvider>
      <ControlRoom userEmail={user.email ?? ""} />
    </UiModeProvider>
  );
}
