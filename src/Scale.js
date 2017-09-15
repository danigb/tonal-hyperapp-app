import { h } from "hyperapp";
import tonal from "tonal";
import Tonics from "./Tonics";
import { Link } from "./Router";

const toArray = arr => "[" + arr.map(t => `"${t}"`).join(", ") + "]";

export default ({ tonic, name }) => (
  <div class="Scale">
    <h4>scale</h4>
    <h1>
      {tonic} {name}
    </h1>
    <p>
      <Tonics route={t => ["scale", name, t]} />
    </p>

    <h3>Scale notes</h3>
    <pre>
      <code>
        tonal.scale.notes("{tonic + " " + name}"); // =>
        {toArray(tonal.scale.get(name, tonic))}
      </code>
    </pre>
  </div>
);
