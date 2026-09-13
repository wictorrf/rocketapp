export function PageLoader({
  fullScreen = false,
  dark = false,
}: {
  fullScreen?: boolean;
  dark?: boolean;
}) {
  return (
    <div
      className={`page-loader${fullScreen ? " page-loader-full" : ""}${dark ? " page-loader-dark" : ""}`}
      role="status"
      aria-label="Carregando"
    >
      <span className="spinner" />
    </div>
  );
}
