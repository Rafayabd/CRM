import React, { useState, useEffect } from 'react';
import { protectedApi, exportLeads, importLeads } from '../api/api';
import CreateLeadForm from '../components/CreateLeadForm';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

function AdminDashboard() {
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState(null);
    const [salesUsers, setSalesUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = async () => {
        try {
            const [lRes, sRes, uRes] = await Promise.all([protectedApi.get('/leads'), protectedApi.get('/reports/quick-stats'), protectedApi.get('/users/sales')]);
            setLeads(lRes.data); setStats(sRes.data); setSalesUsers(uRes.data);
        } catch (err) { toast.error('Failed to load data.'); } finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAssignLead = async (leadId, assignedUserId) => {
        const toastId = toast.loading('Assigning...');
        try { await protectedApi.patch(`/leads/${leadId}/assign`, { AssignedUserID: assignedUserId }); fetchData(); toast.success('Assigned!', { id: toastId }); } catch (err) { toast.error('Failed.', { id: toastId }); }
    };

    const handleExport = async () => {
        try { const res = await exportLeads(); const url = window.URL.createObjectURL(new Blob([res.data])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'leads.csv'); document.body.appendChild(link); link.click(); toast.success('Exported!'); } catch (err) { toast.error('Export failed. (Check backend logs)'); }
    };

    const handleImportClick = () => document.getElementById('fileInput').click();
    const handleFileChange = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const formData = new FormData(); formData.append('file', file);
        const toastId = toast.loading('Importing...');
        try { const res = await importLeads(formData); toast.success(res.data.message, { id: toastId }); fetchData(); } catch (err) { toast.error('Import failed', { id: toastId }); }
        e.target.value = null;
    };

    const getStatusBadge = (status) => {
        const s = status.toLowerCase();
        const map = { success: 'badge-success', pending: 'badge-pending', active: 'badge-active', cancel: 'badge-cancel' };
        return <span className={`badge ${map[s] || 'badge-active'}`}>{status}</span>;
    };

    const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    const filteredLeads = leads.filter(l => l.Name.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="container">
            {/* Header with Responsive Flex */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', gap: '16px' }}>
                <h1 style={{ margin: 0 }}>Analytics Overview</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    {/* THESE BUTTONS USE THE NEW CSS CLASSES */}
                    <button onClick={handleExport} className="btn btn-outline">⬇ Export CSV</button>
                    <button onClick={handleImportClick} className="btn btn-primary">⬆ Import CSV</button>
                    <input type="file" id="fileInput" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
            </div>
            
            {/* Charts Grid */}
            {loading ? <Skeleton height="300px" /> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                    <div className="stat-box">
                        <h3>📈 Lead Growth (7 Days)</h3>
                        <div style={{ height: '280px', marginTop: '20px' }}>
                            <ResponsiveContainer><LineChart data={stats.leadsTrend}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickFormatter={s=>new Date(s).toLocaleDateString(undefined, {day:'numeric', month:'short'})} /><YAxis stroke="var(--text-muted)" fontSize={12} /><Tooltip contentStyle={{backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-main)', borderRadius:'8px'}} /><Line type="monotone" dataKey="count" stroke="var(--primary)" strokeWidth={3} dot={{r:4}} activeDot={{r:6}}/></LineChart></ResponsiveContainer>
                        </div>
                    </div>
                    <div className="stat-box">
                        <h3>🏆 Top Sales Performers</h3>
                        <div style={{ height: '280px', marginTop: '20px' }}>
                            <ResponsiveContainer><BarChart data={stats.leadsPerUser}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="Username" stroke="var(--text-muted)" fontSize={12} /><YAxis stroke="var(--text-muted)" fontSize={12} /><Tooltip cursor={{fill:'var(--bg-body)'}} contentStyle={{backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-main)', borderRadius:'8px'}} /><Bar dataKey="TotalLeads" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} /></BarChart></ResponsiveContainer>
                        </div>
                    </div>
                    <div className="stat-box">
                        <h3>📊 Lead Status Distribution</h3>
                        <div style={{ height: '280px', marginTop: '20px' }}>
                            <ResponsiveContainer><PieChart><Pie data={stats.leadsByStatus.map(i=>({name:i.Status, value:i.count}))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={4}>{stats.leadsByStatus.map((e,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip contentStyle={{backgroundColor:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'8px'}} /><Legend /></PieChart></ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            <CreateLeadForm onLeadCreated={() => {fetchData(); toast.success('Lead Created!');}} />

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px', marginBottom: '20px', gap: '16px' }}>
                <h2 style={{ margin: 0 }}>Recent Leads</h2>
                <input type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input" style={{ width: '100%', maxWidth: '320px' }} />
            </div>

            <div className="table-container">
                <table className="table">
                    <thead><tr><th>Name</th><th>Contact</th><th>Status</th><th>Owner</th><th>Assign To</th></tr></thead>
                    <tbody>
                        {filteredLeads.map(lead => (
                            <tr key={lead.LeadID}>
                                <td><Link to={`/leads/${lead.LeadID}`} style={{ fontWeight: '600', color: 'var(--primary)', textDecoration: 'none' }}>{lead.Name}</Link></td>
                                <td>{lead.ContactInfo}</td>
                                <td>{getStatusBadge(lead.Status)}</td>
                                <td>{lead.CreatedBy}</td>
                                <td>
                                    <select value={lead.AssignedUserID || ''} onChange={(e) => handleAssignLead(lead.LeadID, e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', fontSize: '13px', border: '1px solid var(--border)', background: 'var(--bg-body)', color: 'var(--text-main)', cursor:'pointer' }}>
                                        <option value="">Unassigned</option>
                                        {salesUsers.map(u => <option key={u.UserID} value={u.UserID}>{u.Username}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminDashboard;