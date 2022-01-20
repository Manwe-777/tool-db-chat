import { useCallback, useState } from "react";

import "./App.css";
import Chat from "./Chat";
import getToolDb from "./getToolDb";

function App() {
  const [isLoggedIn, setLoggedIn] = useState(false);

  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");

  const doLogin = useCallback(() => {
    const toolDb = getToolDb();
    toolDb.signIn(user, pass).then((u) => {
      if (u) {
        toolDb.putData("name", user, true);
        setLoggedIn(true);
      }
    });
  }, [user, pass]);

  const doSignup = useCallback(() => {
    const toolDb = getToolDb();
    toolDb.signUp(user, pass).then((u) => {
      console.log(u);
      if (u) {
        toolDb.putData("name", user, true);
        setLoggedIn(true);
      }
    });
  }, [user, pass]);

  return (
    <div className="wrapper">
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
