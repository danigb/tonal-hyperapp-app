import { h } from "hyperapp";
import tonal from "tonal";
import Tonics from "./Tonics";
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

      <table>
        <thead>
          <tr>
            <td>{title} name</td>
          </tr>
        </thead>
        <tbody>
          {names.map(name => (
            <tr>
              <td>
                <Link to={[type, name, tonic]}>{name}</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
