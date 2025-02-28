
import './App.css';
// import Controls from './Components/Control';
import Header from './Components/Header';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.js';
import Home from './Components/Home';
import Rainwater from './Components/Rainwater';
import FlowDischarge from './Components/FlowDischarge';
import PumpSummary from './Components/PumpSummary';
import ControlValve from './Components/ControlValve';
import Footer from './Components/Footer';
import { Fragment } from 'react';
import { BrowserRouter as Router, Route , Routes } from 'react-router-dom';
import "react-datepicker/dist/react-datepicker.css";

function App() {
  return (
    <Fragment>
      <Router>
        <Header />
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/Rainwater" element={<Rainwater/>} />
          <Route path="/FlowDischarge" element={<FlowDischarge/>} />
          <Route path="/PumpSummary" element={<PumpSummary/>} />
          <Route path="/ControlValve" element={<ControlValve/>} />
        </Routes>
        <Footer />
      </Router>
      {/* <TestDatePicker/> */}
      
    </Fragment>

  );
}

export default App;
