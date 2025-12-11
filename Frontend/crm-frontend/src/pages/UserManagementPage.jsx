import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllUsers, deleteUser, register } from '../api/api'; 
import toast from 'react-hot-toast';

function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [newUser, setNewUser] = useState({
        username: '',
        email: '',
        password: '',
        role: 'Sales User'
    });
    const [creating, setCreating] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await getAllUsers();
            setUsers(response.data);
        } catch (err) {
            toast.error('Failed to fetch users.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Are you sure? This action cannot be undone.')) return;

        const toastId = toast.loading('Deleting user...');
        try {
            await deleteUser(userId);
            fetchUsers(); 
            toast.success('User deleted successfully.', { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete user.', { id: toastId });
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        
        if(!newUser.username || !newUser.email || !newUser.password) {
            toast.error("Please fill all fields");
            return;
        }

        setCreating(true);
        const toastId = toast.loading('Creating user...');

        try {
            await register(newUser);
            toast.success('User created successfully!', { id: toastId });
            setNewUser({ username: '', email: '', password: '', role: 'Sales User' });
            fetchUsers();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Failed to create user.', { id: toastId });
        } finally {
            setCreating(false);
        }
    };

    if (loading) return <div className="container">Loading...</div>;

    return (
        <div className="container">
            {/* Header Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <Link to="/" style={{ textDecoration: 'none', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '10px', display: 'inline-block' }}>
                        &larr; Back to Dashboard
                    </Link>
                    <h1 style={{ margin: 0 }}>User Management</h1>
                </div>
            </div>

            {/* ====> ADD USER FORM (FIXED COLORS) <==== */}
            <div className="card" style={{ marginBottom: '40px', padding: '32px' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>
                    {/* Fixed Colors: var(--text-main) */}
                    <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px' }}>Add New User</h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>Create a new account for Admin or Sales staff.</p>
                </div>

                <form onSubmit={handleCreateUser}>
                    {/* Grid Layout: 2 Columns */}
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                        gap: '24px', 
                        marginBottom: '32px' 
                    }}>
                        {/* Username */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                                Username
                            </label>
                            <input 
                                type="text" 
                                placeholder="e.g. ali_khan"
                                className="form-input"
                                style={{ padding: '12px' }}
                                value={newUser.username}
                                onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                                Email Address
                            </label>
                            <input 
                                type="email" 
                                placeholder="user@company.com"
                                className="form-input"
                                style={{ padding: '12px' }}
                                value={newUser.email}
                                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                                Password
                            </label>
                            <input 
                                type="password" 
                                placeholder="••••••••"
                                className="form-input"
                                style={{ padding: '12px' }}
                                value={newUser.password}
                                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-main)', marginBottom: '8px', display: 'block' }}>
                                Role
                            </label>
                            <select 
                                className="form-input"
                                style={{ padding: '12px' }}
                                value={newUser.role}
                                onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                            >
                                <option value="Sales User">Sales User</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    {/* Footer with Button */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                        <button 
                            type="submit" 
                            disabled={creating} 
                            className="btn btn-primary" 
                            style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600' }}
                        >
                            {creating ? 'Creating...' : '+ Create User'}
                        </button>
                    </div>
                </form>
            </div>

            {/* ====> USER LIST TABLE <==== */}
            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>USER</th>
                            <th>ROLE</th>
                            <th>JOINED DATE</th>
                            <th style={{ textAlign: 'right' }}>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.UserID}>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: '600', color: 'var(--text-main)' }}>{user.Username}</span>
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{user.Email}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`badge ${user.Role === 'Admin' ? 'badge-active' : 'badge-pending'}`} style={{ padding: '4px 12px' }}>
                                        {user.Role}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                    {new Date(user.CreatedAt).toLocaleDateString()}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button 
                                        className="btn btn-danger"
                                        style={{ padding: '6px 12px', fontSize: '12px' }}
                                        onClick={() => handleDeleteUser(user.UserID)}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default UserManagementPage;