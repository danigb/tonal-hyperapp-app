import { h, app } from "hyperapp";
import Router, { Link, decode } from "./Router";

app({
  state: {
    route: []
  },
  view: state => (
    <div>
      <p id="top">
        <Link to={["tonal"]}>tonal</Link> |
        <Link to={["notes"]}>notes</Link> |
        <Link to={["intervals"]}>intervals</Link> |
        <Link to={["scales"]}>scales</Link> |
        <Link to={["chords"]}>chords</Link>
      </p>
      <Router route={state.route} />
    </div>
  ),
  actions: {
    route: (state, actions, data) => {
      return { route: decode(data) };
    }
  },
  events: {
    load: (state, actions) => {
      console.log("load!");
      window.onhashchange = () => {
        actions.route(location.hash.slice(2));
      };
      window.onhashchange();
    }
  }
});
