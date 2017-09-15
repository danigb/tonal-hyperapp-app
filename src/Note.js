import { h } from "hyperapp";
import { Link } from "./Router";
import Tonics from "./Tonics";
import tonal from "tonal";

const note = tonal.note;

const OCTS = [1, 2, 3, 4, 5, 6];

const toStr = o => (o === null ? "null" : o);

export default ({ tonic }) => {
  const pc = note.pc(tonic);
  const freq = note.freq(tonic);
  const midi = note.midi(tonic);
  return (
    <div class="Note">
      <h4>note</h4>
      <h1>{tonic}</h1>
      <Tonics route={t => ["note", t]} />
      <h3>Properties</h3>
      <pre>
        <code>
          note.parse("{tonic}") // =>
          {JSON.stringify(note.parse(tonic), null, 2)}
        </code>
        <code>
          note.alt("{tonic}") // => {note.alt(tonic)}
        </code>
        <code>
          note.oct("{tonic}") // => {toStr(note.oct(tonic))}
        </code>
      </pre>
      <h3>Midi and frequency</h3>
      <pre>
        <code>
          note.freq("{tonic}") // => {toStr(freq)}
        </code>
        {freq && <code>note.fromFreq({freq.toFixed(1)}) // =></code>}
        <code>
          note.midi("{tonic}") // => {toStr(midi)}
        </code>
        {midi && (
          <code>
            note.fromMidi({midi}) // => "{tonic}"
          </code>
        )}
      </pre>
      <p>
        <Link to={["note", pc]}>{pc}</Link> |
        <Link to={["scales", tonic]}>scales</Link> |
        <Link to={["chords", tonic]}>chords</Link>
      </p>
      <h3>Octaves</h3>
      <pre>
        <code>
          note.inOct(4, "{tonic}") // => {toStr(note.inOct(4, tonic))}
        </code>
      </pre>
      <Table pc={note.pc(tonic)} />
    </div>
  );
};

function Table({ pc }) {
  return (
    <table>
      <thead>
        <tr>
          <td>Note</td>
          <td>Midi</td>
          <td>Frecuency</td>
        </tr>
      </thead>
      <tbody>
        {OCTS.map(o => (
          <tr>
            <td>
              <Link to={["note", pc + o]}>{pc + o}</Link>
            </td>
            <td>{note.midi(pc + o)}</td>
            <td>{note.freq(pc + o).toFixed(3)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
