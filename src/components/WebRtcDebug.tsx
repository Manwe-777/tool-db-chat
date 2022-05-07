import { useEffect, useReducer } from "react";

import getToolDb from "../utils/getToolDb";

const initialState: any = { lastMessage: {} };

function reducer(state: any, action: any): any {
  switch (action.type) {
    case "setMessage":
      return {
        ...state,
        lastMessage: {
          ...state.lastMessage,
          [action.id]: new Date().getTime(),
        },
      };
    default:
      throw new Error();
  }
}

export default function WebRtcDebug() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const toolDb = getToolDb();

  useEffect(() => {
    toolDb.on("message", (msg) => {
      console.log(msg);
      if (msg.to) {
        msg.to.forEach((k: any) => {
          dispatch({ type: "setMessage", id: k.slice(-12) });
        });
      }
    });
  }, []);

  const connectedPeers = Object.keys((toolDb.network as any).peerMap).length;

  return (
    <>
      <div
        title={`${connectedPeers} peer${connectedPeers > 1 ? "s" : ""} online.`}
        className={`online-indicator ${connectedPeers > 0 ? "on" : "off"}`}
      >
        {connectedPeers}
      </div>
      <div className="debugger-list">
        <div style={{ color: "white" }}>Topic: {toolDb.options.topic}</div>
        <div style={{ color: "green" }}>
          Peer ID: {toolDb.options.peerAccount.address.slice(-12)}
        </div>
        {Object.keys((toolDb.network as any).peerMap).map((key) => {
          return (
            <div
              style={{
                color:
                  new Date().getTime() - state.lastMessage[key] < 500
                    ? "white"
                    : "gray",
              }}
              key={key}
            >
              {key.slice(-12)}
            </div>
          );
        })}
      </div>
    </>
  );
}
