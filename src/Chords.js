import { h } from "hyperapp";
import tonal from "tonal";
import { Link } from "./Router";

export default ({ tonic }) => (
  <div class="Chords">
    <h1>{tonic} chords</h1>
    <table>
      <tbody>
        {tonal.chord.names().map(name => (
          <tr>
            <td>
              <Link to={["chord", name, tonic]}>{tonic + name}</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
