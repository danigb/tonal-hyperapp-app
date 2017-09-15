import { h } from "hyperapp";
import { Link } from "./Router";
import tonal from "tonal";

const OCTS = [1, 2, 3, 4, 5, 6];

export default ({ tonic }) => (
  <div class="Note">
    <h4>note</h4>
    <h1>{tonic}</h1>
    <Link to={["scales", tonic]}>{tonic} scales</Link> |
    <Link to={["chords", tonic]}>{tonic} chords</Link>
    <table>
      <thead>
        <tr>
          <td>Note</td>
          <td>Midi</td>
          <td>Frecuency</td>
        </tr>
      </thead>
      <tbody>
        {OCTS.map(o => (
          <tr>
            <td>{tonic + o}</td>
            <td>{tonal.note.midi(tonic + o)}</td>
            <td>{tonal.note.freq(tonic + o).toFixed(3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
