import { h } from "hyperapp";
import CircleSet from "./CircleSet";
import tonal from "tonal";
import { Link } from "./Router";

const setChroma = (type, name) =>
  tonal.pcset.chroma(tonal[type].intervals(name));

const getTonic = (type, name, tonic) =>
  tonic || tonal[type].parseName(name).tonic;

export default ({ type, names, tonic }) => (
  <table>
    <thead>
      <tr>
        <td>&nbsp;</td>
        <td>&nbsp;</td>
      </tr>
    </thead>
    <tbody>
      {names.map(name => (
        <tr>
          <td>
            <CircleSet
              size={40}
              chroma={setChroma(type, name)}
              offset={tonal.note.chroma(getTonic(type, name, tonic))}
            />
          </td>
          <td>
            <Link to={[type, name, tonic]}>{name}</Link>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);
