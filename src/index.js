import { h, app } from "hyperapp";
import Router, { decode } from "./Router";

const tonics = "C D E F G A B".split(" ");

app({
  state: {
    route: []
  },
  view: state => (
    <div>
      <div class="tonics">
        {tonics.map(t => <a href={"#/note/" + t}>{t}</a>)}
      </div>
      <h4>tonal</h4>
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
