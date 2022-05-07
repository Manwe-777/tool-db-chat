import { useEffect, useState } from "react";
import Login from "./Login";

import "./App.css";
import Chat from "./ChatApp";

import WebRtcDebug from "./WebRtcDebug";

function App() {
  const [_checkLoop, setCheckLoop] = useState(0);
  const [isLoggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setInterval(() => setCheckLoop(new Date().getTime()), 250);
  }, []);

  return (
    <div className="wrapper">
      <WebRtcDebug />
      {isLoggedIn ? <Chat /> : <Login setLoggedIn={setLoggedIn} />}
    </div>
  );
}

export default App;
