import { useEffect, useState } from "react";
import getToolDb from "../utils/getToolDb";

export default function WebRtcDebug() {
  const toolDb = getToolDb();

  const connectedPeers = Object.keys((toolDb.network as any).peerMap).length;

  const [_update, setUpdate] = useState(0);

  useEffect(() => {
    setInterval(() => {
      setUpdate(new Date().getTime());
    }, 200);
  }, []);

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
            <div style={{ color: "white" }} key={key}>
              {key.slice(-12)}
            </div>
          );
        })}
      </div>
    </>
  );
}
