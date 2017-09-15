/* global Vex */
import { h } from "hyperapp";
import tonal from "tonal";

const { Renderer, Formatter } = Vex.Flow;
const W = 700;
const H = 120;

const draw = notes => canvas => {
  console.log("draw canvas", notes);
  console.log("notes", notes);
  const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
  const ctx = renderer.getContext();
  ctx.clearRect(0, 0, W, H);
  var stave = new Vex.Flow.Stave(0, 0, W - 5);
  stave
    .addClef("treble")
    .setContext(ctx)
    .draw();

  let oct = 4;
  Formatter.FormatAndDraw(
    ctx,
    stave,
    notes.map(function(n) {
      const letter = n.charAt(0);
      const alt = n.slice(1);
      if (tonal.note.chroma(n) === 0) oct++;
      const note = new Vex.Flow.StaveNote({
        keys: [letter + "/" + oct],
        duration: "q"
      });
      console.log(letter, alt, oct);
      if (alt) note.addAccidental(0, new Vex.Flow.Accidental(alt));
      return note;
    })
  );
};

export default ({ notes, onPlay }) => {
  return (
    <div className="Score">
      <canvas
        width={W}
        height={H}
        oncreate={draw(notes)}
        onupdate={draw(notes)}
      />
      <div className="controls" />
    </div>
  );
};
