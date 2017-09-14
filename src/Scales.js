import { h } from "hyperapp";
import tonal from "tonal";
import { routeTo } from "./utils";

export default ({ tonic }) => (
  <div class="Scales">
    <h1>{tonic} scales</h1>
    <table>
      <tbody>
        {tonal.scale.names().map(name => (
          <tr>
            <td>
              <a href={routeTo("scale", name, tonic)}>
                {tonic} {name}
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
