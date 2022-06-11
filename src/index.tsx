/* eslint-disable no-use-before-define */
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { ToolDb, toolDbWebrtc, VerificationData } from "tool-db";

import { HashRouter } from "react-router-dom";

import { MapChanges } from "tool-db/dist/crdt/mapCrdt";
import App from "./components/App";
import reportWebVitals from "./reportWebVitals";

// Initialize tooldb outside of react to avoid unpleasant side effects
// Especially with hot module reloading while testing
const db = new ToolDb({
  peers: [],
  networkAdapter: toolDbWebrtc,
  debug: true, //
  topic: "testnetwork",
});

// A simple verificator to only allow insertions and not deletions
function requestsVerificator(
  msg: VerificationData<MapChanges<string>[]>
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    let isValid = true;
    // Iterate over the crdt changes to find deletions, if any
    msg.v.forEach((ch) => {
      if (ch.t === "DEL") isValid = false;
    });
    resolve(isValid);
  });
}

// // Apply to all keys starting with "group-"
db.addCustomVerification<MapChanges<string>[]>(
  "requests-",
  requestsVerificator
);

// Just for devtools/debugging
(window as any).toolDb = db;

ReactDOM.render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
