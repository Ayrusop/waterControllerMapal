import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Home from "./Components/Home";
import Rainwater from "./Components/Rainwater";
import FlowDischarge from "./Components/FlowDischarge";
import PumpSummary from "./Components/PumpSummary";
import ControlValve from "./Components/ControlValve";
import Login from "./Components/Login";
import PrivateRoute from "./PrivateRoute";
import { isAuthenticated, logout } from "./Auth";
import "react-datepicker/dist/react-datepicker.css";
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.js';
function App() {
  const [auth, setAuth] = useState(isAuthenticated());

  useEffect(() => {
    const checkAuth = () => setAuth(isAuthenticated());
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  return (
    <Router>
      <Header auth={auth} onLogout={logout} />
      <Footer />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login setAuth={setAuth} />} />
        <Route path="/Rainwater" element={<PrivateRoute component={Rainwater} />} />
        <Route path="/FlowDischarge" element={<PrivateRoute component={FlowDischarge} />} />
        <Route path="/PumpSummary" element={<PrivateRoute component={PumpSummary} />} />
        <Route path="/ControlValve" element={<PrivateRoute component={ControlValve} />} />
      </Routes>
     
    </Router>
  );
}

export default App;
