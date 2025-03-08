import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../Auth";

const Login = ({ setAuth }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        if (login(username, password)) {
            setAuth(true);
            navigate("/");
        } else {
            setError("Invalid username or password");
        }
    };

    return (
        <div className="flex items-center justify-center mt-5">
            <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-8">
                <h2 className="text-2xl font-semibold text-center text-gray-700">Login</h2>
                {error && <p className="text-red-500 text-center mt-2">{error}</p>}
                <form onSubmit={handleLogin} className="mt-6">
                    <div className="mb-4">
                        <label className="block text-gray-600 text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-600 text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 outline-none"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary1 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition duration-200"
                    >
                        Login
                    </button>
                </form>
                <p className="text-gray-500 text-sm text-center mt-4">
                    Need help? <a href="#" className="text-blue-500 hover:underline">Contact support</a>
                </p>
            </div>
        </div>
    );
};

export default Login;
