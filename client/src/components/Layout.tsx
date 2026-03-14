import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout() {
  const { user, logout, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <nav>
        <Link to="/">ClipLab</Link>
        {user ? (
          <>
            <Link to="/my-clips">My Clips</Link>
            <span>{user.username}</span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
