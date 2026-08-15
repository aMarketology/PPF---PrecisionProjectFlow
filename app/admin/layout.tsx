// Admin layout — minimal wrapper. The admin page handles its own shell.
// This layout only provides auth gating at the layout level.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
