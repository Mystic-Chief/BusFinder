import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ExamScheduleUpload = () => {
    const [examTitle, setExamTitle] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [incomingFile, setIncomingFile] = useState(null);
    const [outgoingFile, setOutgoingFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (file) {
            if (type === 'incoming') {
                setIncomingFile(file);
            } else if (type === 'outgoing') {
                setOutgoingFile(file);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (!examTitle || !startDate || !endDate || !incomingFile || !outgoingFile) {
            setError('All fields are required.');
            setLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append('examTitle', examTitle);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('examScheduleIncoming', incomingFile);
        formData.append('examScheduleOutgoing', outgoingFile);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/file/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                withCredentials: true,
            });

            if (response.data.success) {
                setSuccess('Exam schedules uploaded successfully!');
            } else {
                setError('Failed to upload exam schedules.');
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError('An error occurred while uploading the files.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="exam-schedule-upload">
            <h2>Upload Exam Schedules</h2>
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Exam Title</label>
                    <input
                        type="text"
                        value={examTitle}
                        onChange={(e) => setExamTitle(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>End Date</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Incoming Schedule File</label>
                    <input
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => handleFileChange(e, 'incoming')}
                        required
                    />
                </div>
                <div className="form-group">
                    <label>Outgoing Schedule File</label>
                    <input
                        type="file"
                        accept=".xlsx"
                        onChange={(e) => handleFileChange(e, 'outgoing')}
                        required
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Uploading...' : 'Upload'}
                </button>
            </form>
        </div>
    );
};

export default ExamScheduleUpload;