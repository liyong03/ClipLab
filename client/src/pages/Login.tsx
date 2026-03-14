import { useNavigate, Link } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (username: string, password: string) => {
    await login(username, password);
    navigate('/');
  };

  return (
    <div className="page">
      <AuthForm mode="login" onSubmit={handleLogin} />
      <div className="auth-footer">
        Don't have an account? <Link to="/register">Register</Link>
      </div>
    </div>
  );
}
