const users = {
    admin: "MapalAdmin@2025",
    user: "MapalUser@2025",
};

// Store login info for 2 hours
export const login = (username, password) => {
    if (users[username] && users[username] === password) {
        const expiry = new Date().getTime() + 1 * 60 * 60 * 1000;
        localStorage.setItem("auth", JSON.stringify({ username, expiry }));
        return true;
    }
    return false;
};

// Check if user is authenticated
export const isAuthenticated = () => {
    const authData = localStorage.getItem("auth");
    if (!authData) return false;

    const { expiry } = JSON.parse(authData);
    if (new Date().getTime() > expiry) {
        logout();
        return false;
    }
    return true;
};

// Logout function
export const logout = () => {
    localStorage.removeItem("auth");
    window.location.href = "/login";
};
