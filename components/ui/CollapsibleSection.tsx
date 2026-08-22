export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="collapsible-section" open={defaultOpen}>
      <summary>
        <h2 className="section-title">{title}</h2>
      </summary>
      <div className="collapsible-body">{children}</div>
    </details>
  );
}
