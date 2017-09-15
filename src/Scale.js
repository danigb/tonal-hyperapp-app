import { h } from "hyperapp";
import tonal from "tonal";
import Tonics from "./Tonics";
import Code from "./Code";
import { Link } from "./Router";

const toArray = arr => "[" + arr.map(t => `"${t}"`).join(", ") + "]";
const fullName = (tonic, name) => (tonic ? tonic + " " + name : name);

const scale = tonal.scale;

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
    <Code
      lines={[
        `tonal.scale.notes("${fullName(tonic, name)}"); // => ${toArray(
          scale.notes(name, tonic)
        )}`,
        `tonal.scale.intervals("${fullName(tonic, name)}"); // => ${toArray(
          scale.intervals(name, tonic)
        )}`
      ]}
    />
  </div>
);
