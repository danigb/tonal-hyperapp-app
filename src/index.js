import { h, app } from "hyperapp";
import Router, { decode } from "./Router";

app({
  state: {
    route: []
  },
  view: state => <Router route={state.route} />,
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
