import { RocketIcon } from "./RocketIcon";

export function RocketWordmark({
  size = 22,
  onDark = false,
}: {
  size?: number;
  onDark?: boolean;
}) {
  return (
    <div className="rocket-wordmark" style={onDark ? { color: "#fff" } : undefined}>
      <RocketIcon size={size} />
      Rocket
    </div>
  );
}
