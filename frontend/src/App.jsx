import { useState } from "react";
import GameMenu from "./components/GameMenu";
import MinimumCost from "./components/MinimumCost";

export default function App() {
  const [screen, setScreen] = useState("menu");

  return (
    <>
      {screen === "menu"         && <GameMenu onSelect={setScreen} />}
      {screen === "minimum-cost" && <MinimumCost onBack={() => setScreen("menu")} />}
    </>
  );
}
