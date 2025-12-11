import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
    getLeadDetails, updateLeadDetails, getComments, addComment, deleteLead, getLeadLogs,
    getTasks, addTask, toggleTask, deleteTask // <=== NEW IMPORTS
} from '../api/api';
import toast from 'react-hot-toast';

function LeadDetailPage() {
    const { leadId } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user && user.role === 'Admin';

    const [lead, setLead] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [tasks, setTasks] = useState([]); // <=== TASKS STATE
    const [newTask, setNewTask] = useState({ desc: '', date: '' }); // <=== NEW TASK FORM
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ Name: '', ContactInfo: '', Notes: '' });

    const fetchLeadData = async () => {
        try {
            // Fetch everything in parallel
            const [leadRes, commentsRes, logsRes, tasksRes] = await Promise.all([
                getLeadDetails(leadId),
                getComments(leadId),
                getLeadLogs(leadId),
                getTasks(leadId) // <=== FETCH TASKS
            ]);

            setLead(leadRes.data);
            setFormData({ Name: leadRes.data.Name, ContactInfo: leadRes.data.ContactInfo, Notes: leadRes.data.Notes || '' });
            setTasks(tasksRes.data); // <=== SET TASKS

            const comments = commentsRes.data.map(c => ({ ...c, type: 'COMMENT' }));
            const logs = logsRes.data.map(l => ({ ...l, type: 'LOG' }));
            const combined = [...comments, ...logs].sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));
            setTimeline(combined);

        } catch (err) {
            toast.error('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeadData(); }, [leadId]);

    // ... (Existing Handlers: Save, Delete, Comment - SAME AS BEFORE)
    const handleSaveDetails = async (e) => { e.preventDefault(); try { await updateLeadDetails(leadId, formData); await fetchLeadData(); setIsEditing(false); toast.success('Saved'); } catch (err) { toast.error('Failed to save'); } };
    const handleDelete = async () => { if (!window.confirm('Delete this lead?')) return; try { await deleteLead(leadId); navigate('/'); toast.success('Deleted'); } catch (err) { toast.error('Failed delete'); } };
    const handleAddComment = async (e) => { e.preventDefault(); if (!newComment.trim()) return; try { await addComment(leadId, newComment); setNewComment(''); fetchLeadData(); toast.success('Comment added'); } catch (err) { toast.error('Failed'); } };
    const getWhatsAppLink = (contact) => { const cleanNumber = contact.replace(/[^0-9]/g, ''); return `https://wa.me/${cleanNumber}`; };

    // ====> NEW TASK HANDLERS <====
    const handleAddTask = async (e) => {
        e.preventDefault();
        if (!newTask.desc) return toast.error("Description needed");
        try {
            await addTask(leadId, { Description: newTask.desc, DueDate: newTask.date });
            setNewTask({ desc: '', date: '' });
            fetchLeadData();
            toast.success('Task added');
        } catch (err) { toast.error('Failed to add task'); }
    };

    const handleToggleTask = async (taskId) => {
        try { await toggleTask(taskId); fetchLeadData(); } catch (err) { toast.error('Failed to update task'); }
    };

    const handleDeleteTask = async (taskId) => {
        if(!window.confirm("Delete task?")) return;
        try { await deleteTask(taskId); fetchLeadData(); toast.success("Task deleted"); } catch (err) { toast.error('Failed to delete'); }
    };

    if (loading) return <div className="container">Loading...</div>;
    if (!lead) return <div className="container">Not Found</div>;

    return (
        <div className="container">
            <Link to="/" style={{ textDecoration:'none', color:'var(--text-muted)', marginBottom:'20px', display:'inline-block' }}>&larr; Back</Link>
            
            {/* Lead Info Card */}
            <div className="card" style={{ marginBottom:'30px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid var(--border)', paddingBottom:'15px', marginBottom:'20px' }}>
                    <h1 style={{ margin:0, fontSize:'24px' }}>{lead.Name}</h1>
                    <div>
                        <button className="btn btn-primary" style={{ marginRight:'10px' }} onClick={() => setIsEditing(!isEditing)}>{isEditing ? 'Cancel' : 'Edit'}</button>
                        {isAdmin && <button className="btn btn-danger" onClick={handleDelete}>Delete</button>}
                    </div>
                </div>

                {isEditing ? (
                    <form onSubmit={handleSaveDetails}>
                        <div style={{ display:'grid', gap:'15px', marginBottom:'20px' }}>
                            <input className="form-input" value={formData.Name} onChange={e=>setFormData({...formData, Name:e.target.value})} placeholder="Name"/>
                            <input className="form-input" value={formData.ContactInfo} onChange={e=>setFormData({...formData, ContactInfo:e.target.value})} placeholder="Contact"/>
                            <textarea className="form-input" value={formData.Notes} onChange={e=>setFormData({...formData, Notes:e.target.value})} placeholder="Notes" rows="3"/>
                        </div>
                        <button type="submit" className="btn btn-success">Save Changes</button>
                    </form>
                ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'20px' }}>
                        <div>
                            <label style={{fontSize:'12px', color:'var(--text-muted)'}}>Contact Info</label>
                            <p style={{marginTop:'5px', fontWeight:'500', fontSize:'16px'}}>{lead.ContactInfo}</p>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <a href={`tel:${lead.ContactInfo}`} className="btn" style={{ background: '#e0e7ff', color: '#4338ca', padding: '8px 12px', fontSize: '13px', textDecoration: 'none' }}>📞 Call</a>
                                <a href={getWhatsAppLink(lead.ContactInfo)} target="_blank" rel="noreferrer" className="btn" style={{ background: '#dcfce7', color: '#166534', padding: '8px 12px', fontSize: '13px', textDecoration: 'none' }}>💬 WhatsApp</a>
                            </div>
                        </div>
                        <div><label style={{fontSize:'12px', color:'var(--text-muted)'}}>Status</label><p style={{marginTop:'0', fontWeight:'500'}}><span className="badge badge-active">{lead.Status}</span></p></div>
                        <div><label style={{fontSize:'12px', color:'var(--text-muted)'}}>Assigned To</label><p style={{marginTop:'0', fontWeight:'500'}}>{lead.AssignedTo || 'Unassigned'}</p></div>
                        <div style={{gridColumn:'1/-1'}}><label style={{fontSize:'12px', color:'var(--text-muted)'}}>Notes</label><p style={{marginTop:'0', backgroundColor:'var(--bg-body)', padding:'10px', borderRadius:'8px', color: 'var(--text-main)'}}>{lead.Notes || 'No notes'}</p></div>
                    </div>
                )}
            </div>

            {/* Grid for Tasks & Timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                
                {/* ====> TASKS SECTION <==== */}
                <div className="card">
                    <h3>Tasks & Reminders</h3>
                    <form onSubmit={handleAddTask} style={{ display:'flex', gap:'10px', marginBottom:'20px', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <input className="form-input" placeholder="New task..." value={newTask.desc} onChange={e=>setNewTask({...newTask, desc: e.target.value})} style={{ marginBottom: '5px' }} />
                            <input type="date" className="form-input" value={newTask.date} onChange={e=>setNewTask({...newTask, date: e.target.value})} style={{ fontSize: '12px', padding: '8px' }} />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ height: 'fit-content', alignSelf: 'flex-start' }}>Add</button>
                    </form>

                    <div className="tasks-list">
                        {tasks.map(task => (
                            <div key={task.TaskID} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px', borderBottom:'1px solid var(--border)', opacity: task.IsCompleted ? 0.6 : 1 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={task.IsCompleted} 
                                        onChange={() => handleToggleTask(task.TaskID)} 
                                        style={{ width:'18px', height:'18px', cursor:'pointer' }}
                                    />
                                    <div>
                                        <p style={{ margin:0, textDecoration: task.IsCompleted ? 'line-through' : 'none', fontWeight:'500' }}>{task.Description}</p>
                                        {task.DueDate && <small style={{ color: new Date(task.DueDate) < new Date() && !task.IsCompleted ? '#ef4444' : 'var(--text-muted)' }}>
                                            {new Date(task.DueDate) < new Date() && !task.IsCompleted ? '⚠️ Overdue: ' : '📅 '}
                                            {new Date(task.DueDate).toLocaleDateString()}
                                        </small>}
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteTask(task.TaskID)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444' }}>✕</button>
                            </div>
                        ))}
                        {tasks.length === 0 && <p style={{ color:'var(--text-muted)', fontSize:'13px', textAlign:'center' }}>No tasks pending.</p>}
                    </div>
                </div>

                {/* Timeline Section */}
                <div className="card">
                    <h3>Activity Timeline</h3>
                    <form onSubmit={handleAddComment} style={{ display:'flex', gap:'10px', marginBottom:'30px' }}>
                        <input className="form-input" placeholder="Write a comment..." value={newComment} onChange={e=>setNewComment(e.target.value)} />
                        <button type="submit" className="btn btn-primary">Post</button>
                    </form>

                    <div className="timeline" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                        {timeline.map((item, index) => (
                            <div key={index} style={{ display:'flex', gap:'15px', marginBottom:'20px' }}>
                                <div style={{ width:'32px', height:'32px', borderRadius:'50%', backgroundColor: item.type === 'COMMENT' ? '#e0e7ff' : '#f3f4f6', color: item.type === 'COMMENT' ? '#4f46e5' : '#6b7280', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', flexShrink:0 }}>
                                    {item.type === 'COMMENT' ? '💬' : '🔄'}
                                </div>
                                <div>
                                    <div style={{ fontSize:'14px' }}>
                                        <strong style={{ marginRight:'5px' }}>{item.Username || 'System'}</strong>
                                        <span style={{ color:'var(--text-muted)' }}>{item.type === 'COMMENT' ? 'commented' : item.Description}</span>
                                    </div>
                                    {item.type === 'COMMENT' && <div style={{ background:'var(--bg-body)', padding:'10px', borderRadius:'8px', marginTop:'5px', fontSize:'14px', color:'var(--text-main)' }}>{item.CommentText}</div>}
                                    <div style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'4px' }}>{new Date(item.CreatedAt).toLocaleString()}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default LeadDetailPage;