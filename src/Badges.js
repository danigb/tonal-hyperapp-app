import { h } from "hyperapp";
import { Link } from "./Router";

const imgUrl = name =>
  `https://img.shields.io/npm/v/tonal-${name}.svg?style=flat-square`;
const npmUrl = name => `https://www.npmjs.com/package/tonal-${name}/`;

const nodeiCo = name => `https://nodei.co/npm/tonal-${name}.png?mini=true`;

export default ({ packageName }) => (
  <p class="Badges">
    <a href={npmUrl(packageName)}>
      <img src={nodeiCo(packageName)} />
    </a>
  </p>
);
