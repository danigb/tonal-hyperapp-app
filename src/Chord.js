import { h } from "hyperapp";
export default ({ tonic, name }) => (
  <div class="Chord">
    <h1>{tonic + name}</h1>
  </div>
);
