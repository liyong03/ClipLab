import { useNavigate, Link } from 'react-router-dom';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (username: string, password: string) => {
    await register(username, password);
    navigate('/');
  };

  return (
    <div className="page">
      <AuthForm mode="register" onSubmit={handleRegister} />
      <div className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </div>
  );
}
