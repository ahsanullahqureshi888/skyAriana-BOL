import React from 'react'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const AccessDenied: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="um-state um-state--error" style={{ minHeight: '48vh' }}>
      <ShieldAlert size={36} />
      <strong>Access denied</strong>
      <span>Your account does not have permission to view this workspace. Contact a Super Admin if you believe this is incorrect.</span>
      <button className="um-button um-button--secondary" onClick={() => navigate('/')}><ArrowLeft size={15} /> Return to dashboard</button>
    </div>
  )
}

export default AccessDenied
