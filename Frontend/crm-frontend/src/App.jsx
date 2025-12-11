import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// 1. IMPORT TOAST LIBRARY
import { Toaster } from 'react-hot-toast'; 

import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import LeadDetailPage from './pages/LeadDetailPage';
import UserManagementPage from './pages/UserManagementPage';

function App() {
    const token = localStorage.getItem('token');
    
    return (
        <BrowserRouter>
            {/* 2. ADD THE TOASTER COMPONENT HERE */}
            <Toaster 
                position="top-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#333',
                        color: '#fff',
                    },
                    success: {
                        style: {
                            background: 'green',
                        },
                    },
                    error: {
                        style: {
                            background: 'red',
                        },
                    },
                }} 
            />
            
            <Routes>
                <Route path="/login" element={token ? <Navigate to="/" /> : <LoginPage />} />
                <Route path="/" element={token ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/leads/:leadId" element={token ? <LeadDetailPage /> : <Navigate to="/login" />} />
                <Route path="/users" element={token ? <UserManagementPage /> : <Navigate to="/login" />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;