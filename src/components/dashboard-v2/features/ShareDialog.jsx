import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Modal } from '../ui/surfaces/Modal';
import { TextField } from '../ui/inputs/TextField';
import { FilledButton } from '../ui/buttons/FilledButton';
import { TextButton } from '../ui/buttons/TextButton';
import { Checkbox } from '../ui/inputs/Checkbox';
import { Chip } from '../ui/feedback/Chip';
import { getTypography } from '../theme/typography';
import fileService from '../../../services/fileService';
import { IconButton } from '../ui/buttons/IconButton';

export const ShareDialog = ({ file, isOpen, onClose }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [settings, setSettings] = useState({
      expiresIn: 7, // days
      password: '',
      allowDownload: true
  });

  const handleGenerate = async () => {
    setLoading(true);
    try {
        const result = await fileService.generateShareLink(file._id, settings);
        // Assuming result returns { link: '...' }
        setGeneratedLink(result.link || `https://airstream.app/share/${result.token}`);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(generatedLink);
      // Show toast
  };

  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Share "${file?.filename}"`}
        actions={
            <TextButton label="Done" onClick={onClose} />
        }
    >
        <div className="space-y-6 pt-2">
             {!generatedLink ? (
                 <>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                             <Checkbox
                                checked={settings.allowDownload}
                                onChange={() => setSettings(s => ({...s, allowDownload: !s.allowDownload}))}
                             />
                             <span style={{ color: colors.onSurface }}>Allow Download</span>
                        </div>

                        <TextField
                            label="Password Protection (Optional)"
                            type="password"
                            value={settings.password}
                            onChange={(e) => setSettings(s => ({...s, password: e.target.value}))}
                        />

                        <div className="flex flex-col gap-2">
                             <span style={{ color: colors.onSurfaceVariant, ...getTypography('bodySmall') }}>Expires In</span>
                             <div className="flex gap-2">
                                  {[1, 7, 30].map(days => (
                                      <Chip
                                        key={days}
                                        label={`${days} Day${days > 1 ? 's' : ''}`}
                                        selected={settings.expiresIn === days}
                                        onClick={() => setSettings(s => ({...s, expiresIn: days}))}
                                      />
                                  ))}
                             </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <FilledButton
                            label={loading ? "Generating..." : "Generate Link"}
                            onClick={handleGenerate}
                            fullWidth
                            disabled={loading}
                        />
                    </div>
                 </>
             ) : (
                 <div className="space-y-4">
                     <p style={{ color: colors.onSurface }}>Link generated successfully!</p>
                     <div className="flex items-center gap-2 p-2 rounded border border-outline bg-surface-container-low">
                         <span className="truncate flex-1 font-mono text-sm">{generatedLink}</span>
                         <IconButton
                            icon={
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            }
                            onClick={copyToClipboard}
                            tooltip="Copy"
                         />
                     </div>
                     <TextButton label="Generate New Link" onClick={() => setGeneratedLink('')} fullWidth />
                 </div>
             )}
        </div>
    </Modal>
  );
};
