import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import CollectorLayout from '@/components/CollectorLayout'
import CollectorDashboard from './CollectorDashboard'
import CollectorRequests from './CollectorRequests'
import CollectorCollectionRegistration from './CollectorCollectionRegistration'
import CollectorSettings from './CollectorSettings'
import type { User } from '@contracts/v0/schema'

interface CollectorAppProps {
  collector: User
  onLogout: () => void
}

const CollectorApp: React.FC<CollectorAppProps> = ({ collector, onLogout }) => {
  const [updatedCollector, setUpdatedCollector] = useState<User>(collector)

  const handleCollectorUpdate = (newCollector: User) => {
    setUpdatedCollector(newCollector)
  }

  return (
    <CollectorLayout collector={updatedCollector} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<CollectorDashboard collector={updatedCollector} onLogout={onLogout} />} />
        <Route path="/requests" element={<CollectorRequests collector={updatedCollector} />} />
        <Route path="/collection-registration" element={<CollectorCollectionRegistration collector={updatedCollector} />} />
        <Route path="/settings" element={<CollectorSettings collector={updatedCollector} onUpdate={handleCollectorUpdate} />} />
      </Routes>
    </CollectorLayout>
  )
}

export default CollectorApp
