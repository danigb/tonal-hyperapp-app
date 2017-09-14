import { h } from "hyperapp";
import { Link } from "./Router";

export default ({ tonic }) => (
  <div class="Note">
    <h1>{tonic}</h1>
    <Link to={["scales", tonic]}>{tonic} scales</Link>
    <br />
    <Link to={["chords", tonic]}>{tonic} chords</Link>
  </div>
);
