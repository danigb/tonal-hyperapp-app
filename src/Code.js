import { h } from "hyperapp";

export default ({ lines }) => (
  <pre>
    <code>{lines.join("\n")}</code>
  </pre>
);
