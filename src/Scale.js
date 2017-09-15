import { h } from "hyperapp";
import tonal from "tonal";
import API from "./API";
import Tonics from "./Tonics";
import Code from "./Code";
import Score from "./Score";
import CircleSet from "./CircleSet";
import { Link } from "./Router";

const toArray = arr => "[" + arr.map(t => `"${t}"`).join(", ") + "]";
const fullName = (tonic, name) => (tonic ? tonic + " " + name : name);

const scale = tonal.scale;

export default ({ tonic, name }) => {
  const intervals = tonal.scale.intervals(name);
  const notes = tonal.scale.notes(name, tonic);
  const offset = tonal.note.chroma(tonic) || 0;
  return (
    <div class="Scale">
      <h4>scale</h4>
      <h1>
        {tonic} {name}
      </h1>
      <p>
        <Tonics route={t => ["scale", name, t]} />
      </p>

      <CircleSet
        size={160}
        offset={offset}
        chroma={tonal.pcset.chroma(intervals)}
      />

      <Score notes={notes} />

      <API module="scale" />

      <Code
        lines={[
          `tonal.scale.exists("${name}"); // => ${scale.exists(name)}`,
          `tonal.scale.intervals("${name}"); // => ${toArray(intervals)}`,
          `tonal.scale.notes("${fullName(tonic, name)}"); // => ${toArray(
            scale.notes(name, tonic)
          )}`
        ]}
      />
    </div>
  );
};
