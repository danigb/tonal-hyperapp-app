import { h } from "hyperapp";
import { Link } from "./Router";

const imgUrl = name =>
  `https://img.shields.io/npm/v/${name}.svg?style=flat-square`;
const npmUrl = name => `https://www.npmjs.com/package/${name}/`;

const nodeiCo = name => `https://nodei.co/npm/${name}.png?mini=true`;

export const Install = ({ name, packageName }) => (
  <a href={npmUrl(packageName || "tonal-" + name)}>
    <img src={nodeiCo(packageName || "tonal-" + name)} />
  </a>
);

export default ({ packageName }) => (
  <p class="Badges">
    <a href={npmUrl(packageName)}>
      <img src={nodeiCo(packageName)} />
    </a>
  </p>
);
