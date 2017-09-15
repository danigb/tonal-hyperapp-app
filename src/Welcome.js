import { h } from "hyperapp";
import Tonics from "./Tonics";
import { Link } from "./Router";

export default ({}) => (
  <div class="Welcome">
    <h1>tonal</h1>
    <Tonics route={t => ["note", t]} />
    <pre>
      <code>import tonal from "tonal"; </code>
      <code>tonal.note.freq("A4") // => 440</code>
      <code>tonal.note.midi("A4") // => 69</code>
    </pre>
    <h3>
      <Link to={["notes"]}>Notes</Link>
    </h3>
    <pre>
      <code>tonal.note.freq("A4") // => 440</code>
      <code>tonal.note.midi("A4") // => 69</code>
    </pre>
  </div>
);
