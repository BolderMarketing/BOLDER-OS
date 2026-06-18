// BOLDER wordmark. Rendered as type (sharp, scalable) rather than a raster PNG.
// To use the actual logo asset instead, drop it at client/public/logo.png and
// swap this for <img src="/logo.png" />.
export default function Logo({ showTagline = true, style }) {
  return (
    <div className="logo" style={style}>
      BOLDER
      {showTagline && <small>MARKETING</small>}
    </div>
  );
}
