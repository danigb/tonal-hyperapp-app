import { h } from "hyperapp";
import Tonics from "./Tonics";
import Code from "./Code";
import { Link } from "./Router";
import { Install } from "./Badges";

export default ({}) => (
  <div class="Welcome">
    <h1>tonal</h1>
    <Install packageName="tonal" />
    <Code
      lines={[
        'import tonal from "tonal";',
        'tonal.note.freq("A4") // => 440',
        'tonal.note.midi("A4") // => 69'
      ]}
    />
    <pre />
    <h3>
      <Link to={["notes"]}>Notes</Link>
    </h3>
    <Tonics route={t => ["note", t]} />
    <Code
      lines={[
        'tonal.note.freq("A4") // => 440',
        'tonal.note.midi("A4") // => 69'
      ]}
    />
    <h3>
      <Link to={["intervals"]}>Intervals</Link>
    </h3>
  </div>
);
