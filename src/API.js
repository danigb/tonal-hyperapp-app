import { h } from "hyperapp";
import tonal from "tonal";
import { Install } from "./Badges";

const BASE_URL = "https://github.com/danigb/tonal/tree/master/packages/tonal/";
const apiUrl = (modName, fnName) =>
  BASE_URL + "note#module_" + modName + "." + fnName;

export default ({ module }) => [
  <h2>API</h2>,
  <Install packageName={"tonal-" + module} />,
  <p>
    {Object.keys(tonal[module])
      .sort()
      .map(n => (
        <a class="api" href={apiUrl(module, n)} target="_blank">
          {n}
        </a>
      ))}
  </p>
];
