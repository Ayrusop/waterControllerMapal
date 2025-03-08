import { Link } from 'react-router-dom'
import logo from '../assets/adhiba-logo.png'
import avatar from '../assets/mapal-logo.png'
import { useState } from 'react'; // Import React hooks

const Header = ({ auth, onLogout }) => {
    const [showConfirmLogout, setShowConfirmLogout] = useState(false);

    const handleLogoutClick = () => {
        setShowConfirmLogout(true); // Show confirmation dialog
    };

    const handleConfirmLogout = (confirm) => {
        if (confirm) {
            onLogout(); // Proceed with logout if confirmed
        }
        setShowConfirmLogout(false); // Close the dialog
    };

    return (
        <div className="container bg-white">
            <header className="flex justify-between px-5 py-3 items-center">
                <div>
                    <Link to={'/'}>
                        <img src={avatar} className="h-[80px]" alt="logo" />
                    </Link>
                </div>
                <h1 className="mt-3 text-5xl text-primary1">Rainwater Monitoring System</h1>
                <div className="flex items-center mt-3">
                    <div>
                        <Link to={'/'}>
                            <img src={logo} className="h-[50px]" alt="logo" />
                        </Link>
                    </div>
                </div>
                <div>
                    <ul className="navbar-nav ms-auto mt-4">
                        {
                            auth ? (
                                <>
                                    <li className="nav-item">
                                        <button
                                            className="btn btn-danger flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 transition-all duration-300 p-2 rounded-md"
                                            onClick={handleLogoutClick}>
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                <path fillRule="evenodd" d="M13.293 4.707a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L16.586 10H3a1 1 0 110-2h13.586l-3.293-3.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                            
                                        </button>
                                    </li>
                                </>
                            ) : (
                                <li className="nav-item">
                                    <Link
                                            className="bg-[rgba(49,57,133,1)] text-white hover:bg-[rgba(49,57,133,0.8)] transition-all duration-300 p-2 rounded-md no-underline"
                                        to="/login">
                                        Login
                                    </Link>
                                </li>
                            )
                        }
                    </ul>
                </div>
            </header>

            {/* Confirm Logout Modal */}
            {showConfirmLogout && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-1/3 text-center">
                        <h3 className="text-lg font-bold">Are you sure you want to logout?</h3>
                        <div className="mt-4 flex justify-center gap-4">
                            <button
                                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-all duration-300"
                                onClick={() => handleConfirmLogout(true)}>
                                Yes
                            </button>
                            <button
                                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-all duration-300"
                                onClick={() => handleConfirmLogout(false)}>
                                No
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Header;
