import { h } from "hyperapp";
import { Link } from "./Router";
import { Install } from "./Badges";
import Tonics from "./Tonics";
import Code from "./Code";
import tonal from "tonal";

const note = tonal.note;

const OCTS = [1, 2, 3, 4, 5, 6];

const toStr = o => (o === null ? "null" : o);
const toFixed = (dec, num) =>
  typeof num === "number" ? num.toFixed(dec) : "null";
const toJson = o => JSON.stringify(o, null, 2);
const toName = n => (n ? '"' + n + '"' : "null");

const apiUrl = name =>
  "https://github.com/danigb/tonal/tree/master/packages/tonal/note#module_note." +
  name;

export default ({ tonic }) => {
  tonic = note.note(tonic);
  console.log(tonic);
  const pc = note.pc(tonic);
  const freq = note.freq(tonic);
  const midi = note.midi(tonic);
  return (
    <div class="Note">
      {pc && <h4>note</h4>}
      {pc ? <h1 class="note">{tonic}</h1> : <h1>Notes</h1>}
      {freq && (
        <div class="properties">
          <h3>
            freq: {freq.toFixed(2)}Hz
            <br />
            midi: {midi}
          </h3>
        </div>
      )}
      <Tonics
        label="Choose note:"
        oct={note.oct(tonic)}
        route={t => ["note", t]}
      />
      {pc && (
        <Tonics
          label="Change octave:"
          tonics={[pc].concat(OCTS.map(o => pc + o))}
          route={t => ["note", t]}
        />
      )}
      <Install packageName="tonal-note" />
      <Code lines={[`import note from "tonal-note"`]} />
      <p>Or using tonal facade:</p>
      <Code lines={['import tonal from "tonal"', 'tonal.note.midi("C4");']} />
      <h3>API</h3>
      <p>
        {Object.keys(tonal.note)
          .sort()
          .map(n => (
            <a class="api" href={apiUrl(n)} target="_blank">
              {n}
            </a>
          ))}
      </p>
      <h3>Properties</h3>
      <Code
        lines={[
          `note.split(${toName(tonic)}) // => ${toJson(note.split(tonic))}`,
          `note.parse(${toName(tonic)}) // => ${toJson(note.parse(tonic))}`,
          `note.step(${toName(tonic)}) //=> ${toStr(note.step(tonic))}`,
          `note.alt(${toName(tonic)}) //=> ${toStr(note.alt(tonic))}`,
          `note.oct(${toName(tonic)}) //=> ${toStr(note.oct(tonic))}`,
          `note.chroma(${toName(tonic)}) //=> ${toStr(note.chroma(tonic))}`
        ]}
      />
      <h3>Midi and frequency</h3>
      <Code
        lines={[
          `note.freq("${tonic}") => ${toStr(freq)}`,
          `note.fromFreq(${toFixed(2, freq)}) => ${tonic}`,
          `note.midi("${tonic}") => ${midi}`,
          `note.fromMidi(${midi}) => ${tonic}`
        ]}
      />
      <h3>Octaves</h3>
      <pre>
        <code>
          note.inOct(4, "{tonic}") // => {toStr(note.inOct(4, tonic))}
        </code>
      </pre>
      {pc && <Table pc={note.pc(tonic)} />}
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
