import { h } from "hyperapp";
import tonal from "tonal";
import { routeTo } from "./utils";
import Tonics from "./Tonics";
import { Install } from "./Badges";
import { Link } from "./Router";

export default ({ tonic, names = tonal.scale.names() }) => (
  <div class="Scales">
    <h1>Scales</h1>
    <Install packageName="tonal-scale" />
    <pre>
      <code>import scale from "tonal-scale";</code>
    </pre>
    <h3>Names</h3>
    <pre>
      <code>import tonal from "tonal";</code>
      <code>
        tonal.scale.names(); // => ["{names[0]}", "{names[1]}", ...]
      </code>
    </pre>
    <table>
      <tbody>
        {names.map(name => (
          <tr>
            <td>
              <a href={routeTo("scale", name, tonic)}>{name}</a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
