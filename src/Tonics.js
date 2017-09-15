import { h } from "hyperapp";
import { Link } from "./Router";

const TONICS = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B B# Cb".split(" ");

export default ({ id, label, route, oct, tonics = TONICS }) => {
  const o = oct !== 0 && !oct ? "" : oct;
  return (
    <p id={id} class="Tonics">
      {label && <label>{label}</label>}
      {tonics.map(t => <Link to={route(t + o)}>{t + o}</Link>)}
    </p>
  );
};
