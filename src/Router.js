import { h } from "hyperapp";
import Note from "./Note";
import Scales from "./Scales";
import Scale from "./Scale";
import Chords from "./Chords";
import Chord from "./Chord";
import Welcome from "./Welcome";

export const encode = paths =>
  "#/" + paths.map(n => n.replace(/ /g, "_")).join("/");

export const decode = route => route.split("/").map(n => n.replace(/_/g, " "));

export const Link = ({ to }, children) => <a href={encode(to)}>{children}</a>;

export default ({ route }) => {
  switch (route[0]) {
    case "note":
      return <Note tonic={route[1]} />;
    case "scales":
      return <Scales tonic={route[1]} />;
    case "scale":
      return <Scale name={route[1]} tonic={route[2]} />;
    case "chords":
      return <Chords tonic={route[1]} />;
    case "chord":
      return <Chord name={route[1]} tonic={route[2]} />;
    default:
      return <Welcome />;
  }
};
