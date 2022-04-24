import { useCallback, useEffect, useState } from "react";

import "./App.css";
import Chat from "./Chat";
import getToolDb from "./getToolDb";

function App() {
  const [_checkLoop, setCheckLoop] = useState(0);
  const [isLoggedIn, setLoggedIn] = useState(false);

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  useEffect(() => {
    setInterval(() => setCheckLoop(new Date().getTime()), 250);
  }, []);

  const doLogin = useCallback(() => {
    const toolDb = getToolDb();
    toolDb.signIn(user, pass).then((u) => {
      if (u) {
        setTimeout(() => {
          toolDb.putData("name", user, true);
          setLoggedIn(true);
        }, 500);
      }
    });
  }, [user, pass]);

  const doSignup = useCallback(() => {
    const toolDb = getToolDb();
    toolDb.signUp(user, pass).then((u) => {
      console.log(u);
      if (u) {
        toolDb.signIn(user, pass).then((acc) => {
          if (acc) {
            setTimeout(() => {
              toolDb.putData("name", user, true);
              setLoggedIn(true);
            }, 500);
          }
        });
      }
    });
  }, [user, pass]);

  const toolDb = getToolDb() as any;

  const connectedPeers = Object.keys(toolDb.network.peerMap).length;

  return (
    <div className="wrapper">
      <div
        title={`${connectedPeers} peer${connectedPeers > 1 ? "s" : ""} online.`}
        className={`online-indicator ${connectedPeers > 0 ? "on" : "off"}`}
      />
      {isLoggedIn ? (
        <Chat />
      ) : (
        <div className="login">
          <label>User:</label>
          <input
            onChange={(e) => setUser(e.currentTarget.value)}
            value={user}
          />
          <label>Password:</label>
          <input
            onChange={(e) => setPass(e.currentTarget.value)}
            value={pass}
            type="password"
          />
          <button type="button" onClick={doLogin}>
            Login
          </button>
          <button type="button" onClick={doSignup}>
            Signup
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
