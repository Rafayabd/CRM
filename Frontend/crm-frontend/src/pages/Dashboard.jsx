import React, { useState, useEffect } from 'react';
import AdminDashboard from './AdminDashboard';
import SalesDashboard from './SalesDashboard';
import { Link, useNavigate } from 'react-router-dom';
import { getNotifications, markNotificationsRead } from '../api/api';

function Dashboard() {
    const user = JSON.parse(localStorage.getItem('user'));
    const navigate = useNavigate();
    
    // 1. Initialize Dark Mode from LocalStorage (Refresh par yaad rakhega)
    const [darkMode, setDarkMode] = useState(() => {
        return localStorage.getItem('theme') === 'dark';
    });

    const [notifications, setNotifications] = useState([]);
    const [showNotifDropdown, setShowNotifDropdown] = useState(false);
    const unreadCount = notifications.filter(n => !n.IsRead).length;

    const fetchNotifs = async () => {
        try {
            const res = await getNotifications();
            setNotifications(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchNotifs(); }, []);

    const handleBellClick = async () => {
        if (!showNotifDropdown && unreadCount > 0) {
            await markNotificationsRead();
            setNotifications(notifications.map(n => ({ ...n, IsRead: 1 })));
        }
        setShowNotifDropdown(!showNotifDropdown);
    };

    const handleNotifItemClick = (link) => {
        navigate(link);
        setShowNotifDropdown(false);
    };

    // 2. Toggle Theme & Save to LocalStorage
    const toggleTheme = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

    // 3. Apply Class to Body
    useEffect(() => {
        if (darkMode) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    }, [darkMode]);

    const handleLogout = () => {
        localStorage.removeItem('token'); 
        localStorage.removeItem('user'); 
        // Theme preference rehne dete hain taaki login page consistent rahe
        window.location.reload();
    };

    return (
        <div>
           <header>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--primary)' }}>My CRM</h2>
                    <nav style={{ display: 'flex', gap: '15px' }}>
                        <Link to="/" style={styles.navLink}>Dashboard</Link>
                        {user.role === 'Admin' && <Link to="/users" style={styles.navLink}>Users</Link>}
                    </nav>
                </div>
                
                <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    {/* Notification */}
                    <div style={{ position: 'relative' }}>
                        <button onClick={handleBellClick} style={styles.iconBtn}>
                            <span style={{ filter: darkMode ? 'invert(1)' : 'none' }}>🔔</span>
                            {unreadCount > 0 && <span style={styles.redDot}>{unreadCount}</span>}
                        </button>
                        {showNotifDropdown && (
                            <div style={styles.dropdown}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '5px', color: 'var(--text-main)' }}>Notifications</h4>
                                {notifications.length === 0 ? <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No new notifications</p> : 
                                    notifications.map(n => (
                                        <div key={n.NotificationID} onClick={() => handleNotifItemClick(n.Link)} style={styles.notifItem}>
                                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-main)' }}>{n.Message}</p>
                                            <small style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(n.CreatedAt).toLocaleString()}</small>
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>

                    {/* Dark Mode Toggle */}
                    <button onClick={toggleTheme} style={styles.iconBtn}>
                        {darkMode ? '☀️' : '🌙'}
                    </button>

                    {/* User Info */}
                    <span style={styles.userInfo}><strong>{user.username}</strong></span>
                    <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '6px 12px', fontSize: '12px' }}>Logout</button>
                </div>
            </header>
            
            <main>
                {user.role === 'Admin' ? <AdminDashboard /> : <SalesDashboard />}
            </main>
        </div>
    );
}

const styles = {
    navLink: { color: 'var(--text-main)', textDecoration: 'none', fontWeight: '500', fontSize: '14px' },
    userInfo: { color: 'var(--text-muted)', fontSize: '13px', display: 'inline-block' },
    iconBtn: { background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', position: 'relative', color: 'var(--text-main)' },
    redDot: { position: 'absolute', top: '-3px', right: '-3px', background: '#ef4444', color: 'white', fontSize: '9px', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    
    // Dropdown styling fixed for dark mode
    dropdown: { 
        position: 'absolute', top: '40px', right: '0', width: '260px', 
        backgroundColor: 'var(--bg-card)', 
        border: '1px solid var(--border)', 
        borderRadius: '12px', padding: '15px', 
        boxShadow: 'var(--shadow-md)', 
        zIndex: 1000 
    },
    notifItem: { padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }
};

export default Dashboard;