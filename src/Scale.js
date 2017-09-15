import { h } from "hyperapp";
import tonal from "tonal";
import Tonics from "./Tonics";
import Breadcrumbs from "./Breadcrumbs";

const toArray = arr => "[" + arr.map(t => `"${t}"`).join(", ") + "]";

export default ({ tonic, name }) => (
  <div class="Scale">
    <Tonics route={t => ["scale", name, t]} />
    <Breadcrumbs />
    <h4>scale</h4>
    <h1>
      {tonic} {name}
    </h1>
    <div class="properties">
      <label>Scale notes:</label>
      <pre>
        <code>
          tonal.scale.notes("{tonic + " " + name}"); // =>
          {toArray(tonal.scale.get(name, tonic))}
        </code>
      </pre>
      <br />
    </div>
  </div>
);
