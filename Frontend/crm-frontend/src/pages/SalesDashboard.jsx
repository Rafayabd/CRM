import React, { useState, useEffect } from 'react';
import { protectedApi } from '../api/api';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

function SalesDashboard() {
    const [myLeads, setMyLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const columns = ['Pending', 'Interested', 'Schedule', 'Active', 'Success', 'Cancel'];

    const fetchMyLeads = async () => {
        try { const res = await protectedApi.get('/leads'); setMyLeads(res.data); } 
        catch (err) { toast.error('Failed to load leads.'); } finally { setLoading(false); }
    };

    useEffect(() => { fetchMyLeads(); }, []);

    const handleStatusChange = async (e, leadId) => {
        const newStatus = e.target.value;
        const updatedLeads = myLeads.map(l => l.LeadID === leadId ? { ...l, Status: newStatus } : l);
        setMyLeads(updatedLeads);
        toast.promise(protectedApi.patch(`/leads/${leadId}/status`, { Status: newStatus }), {
            loading: 'Moving...', success: `Moved to ${newStatus}!`, error: () => { fetchMyLeads(); return 'Failed.'; }
        });
    };

    const getStatusColor = (s) => ({ Pending:'#f59e0b', Success:'#10b981', Active:'#3b82f6', Cancel:'#ef4444' }[s] || '#6b7280');

    return (
        <div className="container" style={{ maxWidth: '100%', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div><h1 style={{ margin: 0 }}>My Pipeline</h1><p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>Manage your deals.</p></div>
                <span className="badge badge-active" style={{ padding: '8px 16px', fontSize: '14px' }}>Total: {myLeads.length}</span>
            </div>
            
            {loading ? <Skeleton height="400px" /> : (
                // THIS CONTAINER ENABLES MOBILE SCROLLING
                <div className="board-container">
                    {columns.map(status => {
                        const leadsInColumn = myLeads.filter(l => l.Status === status);
                        return (
                            <div key={status} className="kanban-column">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '2px solid var(--border)' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: getStatusColor(status) }}></span>{status}
                                    </h3>
                                    <span style={{ background: 'var(--bg-card)', borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: '600', boxShadow: 'var(--shadow-sm)' }}>{leadsInColumn.length}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '150px' }}>
                                    {leadsInColumn.map(lead => (
                                        <div key={lead.LeadID} className="kanban-card">
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <Link to={`/leads/${lead.LeadID}`} style={{ textDecoration: 'none', color: 'var(--text-main)', fontWeight: '600', fontSize: '16px' }}>{lead.Name}</Link>
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(lead.CreatedAt).toLocaleDateString(undefined, {day:'numeric', month:'short'})}</span>
                                            </div>
                                            <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>📞 {lead.ContactInfo}</div>
                                            <select value={lead.Status} onChange={(e) => handleStatusChange(e, lead.LeadID)} className="form-input" style={{ padding: '8px', fontSize: '13px', background: 'var(--bg-body)', cursor: 'pointer' }}>
                                                {columns.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        </div>
                                    ))}
                                    {leadsInColumn.length === 0 && <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '14px', border: '2px dashed var(--border)', borderRadius: '12px' }}>No leads</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default SalesDashboard;