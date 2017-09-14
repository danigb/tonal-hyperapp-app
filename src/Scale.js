import { h } from "hyperapp";
import tonal from "tonal";
import Tonics from "./Tonics";

export default ({ tonic, name }) => (
  <div class="Scale">
    <h1>
      {tonic} {name}
    </h1>
    Change tonic: <Tonics route={t => ["scale", name, t]} />
    <div class="properties">
      <label>Notes:</label>
      {tonal.scale.get(name, tonic).join(" ")}
      <br />
    </div>
  </div>
);
