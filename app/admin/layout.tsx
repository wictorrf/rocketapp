export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ice)", padding: "34px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>{children}</div>
    </div>
  );
}
