import AdminStudentDetailScreen from "./AdminStudentDetailScreen";

export default async function AdminStudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  return <AdminStudentDetailScreen studentId={studentId} />;
}
