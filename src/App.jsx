import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import FactoryMap from './components/FactoryMap';
import RobotDashboard from './components/RobotDashboard';

function App() {
  return (
    <HashRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<FactoryMap />} />
          <Route path="/machine/:id" element={<RobotDashboard />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
