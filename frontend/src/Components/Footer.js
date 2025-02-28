import React from 'react';

import { Link } from 'react-router-dom';
const Footer = () => {
    return (
        <footer className="footer container">
            <div className="footer-content mt-16 text-center text-2xl">
                <div className="row">
                    <div className="col">
                        <Link to="/Rainwater" className="footer-link text-gray-400">
                            Rainwater tank
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/FlowDischarge" className="footer-link text-gray-400">
                            Flow Meter
                        </Link>
                    </div>
                    <div className="col">
                        <Link to="/PumpSummary" className="footer-link text-gray-400">
                            Water pump summary
                        </Link> </div>
                    <div className="col">
                        <Link to="/ControlValve" className="footer-link text-gray-400">
                            Control Valve
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;