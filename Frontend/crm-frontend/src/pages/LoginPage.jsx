import React, { useState } from 'react';
import { login } from '../api/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Theme Check on Mount (Taaki Dark Mode mein Login Page bhi Dark ho)
    React.useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please fill in all fields');
            return;
        }
        setLoading(true);
        try {
            const response = await login(email, password);
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            toast.success(`Welcome back, ${response.data.user.username}!`);
            navigate('/');
            window.location.reload(); 
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg">
            <div className="login-card">
                
                {/* Logo / Icon Section */}
                <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                    <div style={{ 
                        width: '50px', height: '50px', background: 'var(--primary)', 
                        borderRadius: '12px', margin: '0 auto 12px', display: 'flex', 
                        alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'white',
                        boxShadow: '0 8px 12px -3px rgba(79, 70, 229, 0.3)'
                    }}>
                        🚀
                    </div>
                    {/* Use Theme Variables for Text Color */}
                    <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '20px', fontWeight: '700' }}>CRM Pro</h2>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>Sign in to manage your leads</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>Email Address</label>
                        <input 
                            type="email" 
                            className="form-input"
                            placeholder="name@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            style={{ height: '42px', paddingLeft: '12px', fontSize: '14px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '25px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-main)' }}>Password</label>
                        </div>
                        <input 
                            type="password" 
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ height: '42px', paddingLeft: '12px', fontSize: '14px' }}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        className="btn btn-primary"
                        style={{ 
                            width: '100%', height: '44px', fontSize: '14px', fontWeight: '600',
                            borderRadius: '8px', justifyContent: 'center'
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg className="spinner" viewBox="0 0 50 50" style={{ width: '16px', height: '16px', animation: 'spin 1s linear infinite' }}>
                                    <circle cx="25" cy="25" r="20" fill="none" stroke="white" strokeWidth="5"></circle>
                                </svg>
                                Signing in...
                            </span>
                        ) : 'Sign In'}
                    </button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                    Forgot password? Contact Admin.
                </div>
            </div>

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .spinner circle { stroke-dasharray: 90; stroke-dashoffset: 0; }
            `}</style>
        </div>
    );
}

export default LoginPage;