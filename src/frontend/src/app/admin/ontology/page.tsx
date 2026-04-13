import { Suspense } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import AdminOntologyScreen from "./AdminOntologyScreen";

export default function AdminOntologyPage() {
  return (
    <Suspense fallback={<AdminShell><div /></AdminShell>}>
      <AdminOntologyScreen />
    </Suspense>
  );
}
