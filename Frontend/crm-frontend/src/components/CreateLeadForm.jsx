import React, { useState } from 'react';
import { createLead } from '../api/api';
import toast from 'react-hot-toast';

const CreateLeadForm = ({ onLeadCreated }) => {
    const [formData, setFormData] = useState({
        Name: '',
        ContactInfo: '',
        Status: 'Pending',
        Notes: ''
    });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.Name || !formData.ContactInfo) {
            toast.error('Name and Contact Info are required');
            return;
        }

        setLoading(true);
        try {
            await createLead(formData);
            toast.success('Lead created successfully!');
            setFormData({ Name: '', ContactInfo: '', Status: 'Pending', Notes: '' });
            if (onLeadCreated) onLeadCreated();
        } catch (error) {
            console.error(error);
            toast.error('Failed to create lead');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ marginBottom: '40px' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Add New Lead</h3>
            
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    
                    {/* Name Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>
                            Lead Name
                        </label>
                        <input
                            type="text"
                            name="Name"
                            className="form-input"
                            placeholder="e.g. Ali Khan"
                            value={formData.Name}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Contact Input */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>
                            Contact Info
                        </label>
                        <input
                            type="text"
                            name="ContactInfo"
                            className="form-input"
                            placeholder="Phone or Email"
                            value={formData.ContactInfo}
                            onChange={handleChange}
                        />
                    </div>

                    {/* Status Dropdown */}
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '8px', color: 'var(--text-muted)' }}>
                            Initial Status
                        </label>
                        <select
                            name="Status"
                            className="form-input"
                            value={formData.Status}
                            onChange={handleChange}
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Interested">Interested</option>
                            <option value="Active">Active</option>
                            <option value="Success">Success</option>
                            <option value="Cancel">Cancel</option>
                        </select>
                    </div>
                </div>
                
                {/* Button Area */}
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={loading}
                        style={{ padding: '10px 24px' }}
                    >
                        {loading ? 'Creating...' : '+ Create Lead'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateLeadForm;