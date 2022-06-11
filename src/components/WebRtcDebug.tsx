import { useEffect, useState } from "react";

import getToolDb from "../utils/getToolDb";

export default function WebRtcDebug() {
  const toolDb = getToolDb();

  const [_refresh, setRefresh] = useState(0);

  useEffect(() => {
    setInterval(() => {
      setRefresh(new Date().getTime());
    }, 200);
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
                color: "white",
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
