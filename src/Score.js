import React from "react";
import Stave from "./Stave";
import "./Score.css";

const Score = ({ notes, onPlay }) => (
  <div className="Score">
    <Stave notes={notes} />
    <div className="controls" />
  </div>
);

export default Score;
