import React from 'react';

import { Link } from 'react-router-dom';
const Footer = () => {
    return (
        <footer className="footer container text-white py-10">
            <div className="footer-content text-center text-2xl">
                <div className="row grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="col">
                        <Link
                            to="/Rainwater"
                            className="footer-link text-gray-400 hover:text-black no-underline relative group">
                            Rainwater tank
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-all duration-300"></span>
                        </Link>
                    </div>
                    <div className="col">
                        <Link
                            to="/FlowDischarge"
                            className="footer-link text-gray-400 hover:text-black no-underline relative group">
                            Flow Meter
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-all duration-300"></span>
                        </Link>
                    </div>
                    <div className="col">
                        <Link
                            to="/PumpSummary"
                            className="footer-link text-gray-400 hover:text-black no-underline relative group">
                            Water pump summary
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-all duration-300"></span>
                        </Link>
                    </div>
                    <div className="col">
                        <Link
                            to="/ControlValve"
                            className="footer-link text-gray-400 hover:text-black no-underline relative group">
                            Control Valve
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-black scale-x-0 group-hover:scale-x-100 transition-all duration-300"></span>
                        </Link>
                    </div>
                </div>
            </div>
        </footer>


    );
};

export default Footer;