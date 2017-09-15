import { h } from "hyperapp";
import { Link } from "./Router";

export default ({}, children) => (
  <div class="Breadcrumbs">
    <Link to={[]}>tonal</Link> &gt;
    {children}
  </div>
);
