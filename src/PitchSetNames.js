import { h } from "hyperapp";
import tonal from "tonal";
import Tonics from "./Tonics";
import PitchSetList from "./PitchSetList";
import Code from "./Code";
import { Install } from "./Badges";
import { Link } from "./Router";

const PitchSetNames = ({ tonic, names, title, type, packageName }) => {
  console.log("joder", names);
  return (
    <div class="{title}">
      <h1>{title}</h1>
      <Install packageName={packageName} />
      <Code lines={[`import ${type} from "${packageName}"`]} />
      <p>Or using tonal facade:</p>
      <Code lines={['import tonal from "tonal"']} />

      <h3>Names</h3>
      <Code
        lines={[
          `tonal.${type}.names(); // => ["${names[0]}", "${names[1]}", ...]`
        ]}
      />
      <PitchSetList names={names} type={type} tonic={tonic} />
    </div>
  );
};

export const Scales = ({ tonic }) => (
  <PitchSetNames
    title="Scales"
    type="scale"
    packageName="tonal-scale"
    tonic={tonic}
    names={tonal.scale.names()}
  />
);

export const Chords = ({ tonic }) => (
  <PitchSetNames
    title="Chords"
    type="chord"
    packageName="tonal-chord"
    tonic={tonic}
    names={tonal.chord.names()}
  />
);
