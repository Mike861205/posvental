import { redirect } from "next/navigation";
import { isSuperadminSessionActive } from "@/lib/superadmin";
import { SuperadminClient } from "./superadmin-client";

export default async function SuperadminPage() {
  if (!isSuperadminSessionActive()) {
    redirect("/superadmin/login");
  }

  return <SuperadminClient />;
}
