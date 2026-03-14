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
    <div>
      <AuthForm mode="register" onSubmit={handleRegister} />
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}
