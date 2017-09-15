import { h } from "hyperapp";
import { Link } from "./Router";

const TONICS = "C C# Db D D# Eb E F F# Gb G G# Ab A A# Bb B B# Cb".split(" ");

export default ({ id, route }) => (
  <span id={id} class="Tonics">
    {TONICS.map(t => <Link to={route(t)}>{t}</Link>)}
  </span>
);
