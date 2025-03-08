import React from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { Link } from 'react-router-dom';
const Home = () => {
    return (
        <div className='container text-center align-middle p-4'>
            <div className="row p-">

                <div className="col text-center bg-gradient-to-r from-primary to-black m-4 cursor-pointer">
                    <Link className='text-decoration-none' to='/Rainwater'>
                        <h3 className='text-white p-3'>Rainwater Tank summary <i class="fa fa-arrow-circle-right ml-5" aria-hidden="true"></i></h3>
                    </Link>
                </div>


                <div className="col text-center bg-gradient-to-r from-primary to-black m-4 cursor-pointer">
                    <Link className='text-decoration-none' to='/FlowDischarge'>
                        <h3 className='text-white p-3'>Rainwater Discharge Summary <i class="fa fa-arrow-circle-right ml-5" aria-hidden="true"></i></h3>
                    </Link>
                </div>
                <div className="w-100"></div>
                <div className="col text-center bg-gradient-to-r from-primary to-black m-4 cursor-pointer">
                    <Link className='text-decoration-none' to='/PumpSummary'>
                        <h3 className='text-white p-3'>Water Pump Summary <i class="fa fa-arrow-circle-right ml-5" aria-hidden="true"></i></h3>
                    </Link>

                </div>
                <div className="col text-center bg-gradient-to-r from-primary to-black m-4 cursor-pointer">
                    <Link className='text-decoration-none' to='/ControlValve'>
                        <h3 className='text-white p-3'>Water Control Valve <i class="fa fa-arrow-circle-right ml-5" aria-hidden="true"></i></h3>
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default Home;