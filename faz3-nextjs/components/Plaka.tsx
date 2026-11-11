// Draws a plate the way it looks on the car, so it is recognised at a glance.
// It keeps its white face in both themes, as a real plate does.
export function Plaka({ plaka }: { plaka: string }) {
  return (
    <span className="plaka">
      <span className="plaka-tr" aria-hidden="true">
        TR
      </span>
      <span className="plaka-metin">{plaka}</span>
    </span>
  );
}
