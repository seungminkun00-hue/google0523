import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import FactoryMap from './components/FactoryMap';
import RobotDashboard from './components/RobotDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FactoryMap />} />
        <Route path="/machine/:id" element={<RobotDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
