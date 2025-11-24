import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { isAdmin, logout } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div>
            <nav className="nav">
                <div className="nav-brand">🏆 Trophy Series</div>

                <ul className="nav-links">
                    <li>
                        <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                            Race Results
                        </Link>
                    </li>
                    <li>
                        <Link to="/standings" className={`nav-link ${isActive('/standings') ? 'active' : ''}`}>
                            Championship
                        </Link>
                    </li>
                    {isAdmin && (
                        <li>
                            <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
                                Admin
                            </Link>
                        </li>
                    )}
                </ul>

                <div>
                    {isAdmin ? (
                        <button onClick={logout} className="btn btn-secondary">
                            Logout
                        </button>
                    ) : (
                        <Link to="/login" className="btn btn-secondary">
                            Admin Login
                        </Link>
                    )}
                </div>
            </nav>

            <main>{children}</main>
        </div>
    );
}
