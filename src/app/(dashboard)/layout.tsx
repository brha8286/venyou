import SessionWrapper from "@/components/SessionWrapper";
import AuthLayout from "@/components/AuthLayout";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionWrapper>
      <AuthLayout>{children}</AuthLayout>
    </SessionWrapper>
  );
}
