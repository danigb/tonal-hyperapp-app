import { h } from "hyperapp";
import tonal from "tonal";
import { routeTo } from "./utils";
import Tonics from "./Tonics";
import Breadcrumbs from "./Breadcrumbs";
import { Link } from "./Router";

export default ({ tonic, names = tonal.scale.names() }) => (
  <div class="Scales">
    <Tonics route={t => ["scales", t]} />
    <Breadcrumbs>
      <Link to={["note", tonic]}>{tonic}</Link> &gt;
      {tonic} scales
    </Breadcrumbs>
    <h1>{tonic} scales</h1>
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
