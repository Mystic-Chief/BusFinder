import React from "react";
import BusSearch from "./components/BusSearch";

function App() {
  return (
    <div className="app-container">
      <h1>🚌 Bus Finder</h1>
      <div className="card">
        <BusSearch />
      </div>
    </div>
  );
}

export default App;
