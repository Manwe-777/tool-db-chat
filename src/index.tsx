/* eslint-disable no-use-before-define */
import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { ToolDb, toolDbWebrtc, VerificationData } from "tool-db";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { GroupData } from "./types";

// Initialize tooldb outside of react to avoid unpleasant side effects
// Especially with hot module reloading while testing
const db = new ToolDb({
  peers: [],
  networkAdapter: toolDbWebrtc,
  debug: true, //
  topic: "testnetwork",
});

// A simple verificator to only allow the creator of the key to modify it
function groupVerificator(msg: VerificationData<GroupData>): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const ownerId = msg.k.slice(6).split("-")[0];
    if (ownerId !== msg.v.owner) {
      resolve(false);
    } else {
      resolve(true);
    }
  });
}

// Apply to all keys starting with "group-"
db.addCustomVerification<GroupData>("group-", groupVerificator);

// Just for devtools/debugging
(window as any).toolDb = db;

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
