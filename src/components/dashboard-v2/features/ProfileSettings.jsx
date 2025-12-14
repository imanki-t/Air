import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Modal } from '../ui/surfaces/Modal';
import { TextField } from '../ui/inputs/TextField';
import { Switch } from '../ui/inputs/Switch';
import { FilledButton } from '../ui/buttons/FilledButton';
import { TextButton } from '../ui/buttons/TextButton';
import { Avatar } from '../ui/media/Avatar';
import { getTypography } from '../theme/typography';

export const ProfileSettings = ({ user, isOpen, onClose, onUpdate }) => {
  const { colors, isDark, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'security', label: 'Security' },
    { id: 'appearance', label: 'Appearance' },
  ];

  const handleSave = async () => {
    // Implement update logic
    if (onUpdate) await onUpdate(formData);
    onClose();
  };

  const renderContent = () => {
    switch (activeTab) {
        case 'general':
            return (
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar initials={user?.username} size="xlarge" />
                        <div>
                             <TextButton label="Change Picture" />
                             <TextButton label="Remove" danger />
                        </div>
                    </div>
                    <TextField
                        label="Username"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                    />
                    <TextField
                        label="Email"
                        value={formData.email}
                        disabled
                        helperText="Contact support to change email"
                    />
                </div>
            );
        case 'security':
             return (
                 <div className="space-y-6">
                     <TextField
                         type="password"
                         label="Current Password"
                         value={formData.currentPassword}
                         onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                     />
                     <TextField
                         type="password"
                         label="New Password"
                         value={formData.newPassword}
                         onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                     />
                     <TextField
                         type="password"
                         label="Confirm New Password"
                         value={formData.confirmPassword}
                         onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                     />
                 </div>
             );
        case 'appearance':
             return (
                 <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container-high border border-outline-variant">
                           <div>
                                <h4 style={{ color: colors.onSurface, ...getTypography('titleMedium') }}>Dark Mode</h4>
                                <p style={{ color: colors.onSurfaceVariant, ...getTypography('bodySmall') }}>
                                    Adjust the appearance of the application
                                </p>
                           </div>
                           <Switch
                                checked={isDark}
                                onChange={toggleTheme}
                           />
                      </div>
                 </div>
             );
        default: return null;
    }
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Settings"
        maxWidth="640px"
        actions={
            <>
                <TextButton label="Cancel" onClick={onClose} />
                <FilledButton label="Save Changes" onClick={handleSave} />
            </>
        }
    >
        <div className="flex h-[400px]">
            {/* Sidebar */}
            <div className="w-48 border-r pr-4" style={{ borderColor: colors.outlineVariant + '40' }}>
                 {tabs.map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full text-left px-4 py-3 rounded-full mb-1 transition-colors ${activeTab === tab.id ? 'font-bold' : ''}`}
                        style={{
                            backgroundColor: activeTab === tab.id ? colors.secondaryContainer : 'transparent',
                            color: activeTab === tab.id ? colors.onSecondaryContainer : colors.onSurfaceVariant,
                            ...getTypography('labelLarge')
                        }}
                      >
                          {tab.label}
                      </button>
                 ))}
            </div>

            {/* Content */}
            <div className="flex-1 pl-6 overflow-y-auto custom-scrollbar">
                 {renderContent()}
            </div>
        </div>
    </Modal>
  );
};
