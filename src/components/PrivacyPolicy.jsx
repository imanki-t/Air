import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ── Airstream logo mark (matches header/footer in App.jsx) ───────────────── */
const AirstreamLogo = ({ darkMode, className = 'h-8 w-8' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className={className} aria-label="Airstream logo">
    <circle cx="250" cy="250" r="210" fill="none" stroke={darkMode ? '#ffffff' : '#000000'} strokeWidth="36" />
    <circle cx="250" cy="172" r="30" fill={darkMode ? '#ffffff' : '#000000'} />
    <polyline points="155,218 250,330 345,218" fill="none" stroke={darkMode ? '#ffffff' : '#000000'} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LAST_UPDATED = 'August 6, 2026';

/* ── Section wrapper ───────────────────────────────────────────────────── */
const Section = ({ title, children, darkMode }) => (
  <section className="scroll-mt-24">
    <h2 className={`text-xl sm:text-2xl font-bold tracking-tight mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
      {title}
    </h2>
    <div className={`space-y-3 text-sm sm:text-[15px] leading-relaxed ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
      {children}
    </div>
  </section>
);

const List = ({ items, darkMode }) => (
  <ul className="space-y-2 pl-1">
    {items.map((item, i) => (
      <li key={i} className="flex gap-2.5">
        <span className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-red-500'}`} />
        <span>
          {item.label && <strong className={darkMode ? 'text-gray-100' : 'text-gray-800'}>{item.label}: </strong>}
          {item.text}
        </span>
      </li>
    ))}
  </ul>
);

const PrivacyPolicy = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(mq.matches);
    const handleChange = (e) => setDarkMode(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const sections = [
    { id: 'info-we-collect', label: 'Information We Collect' },
    { id: 'how-we-use', label: 'How We Use It' },
    { id: 'google-api', label: 'Google API Data' },
    { id: 'storage-security', label: 'Storage & Security' },
    { id: 'retention-deletion', label: 'Retention & Deletion' },
    { id: 'export-import', label: 'Export & Import' },
    { id: 'third-parties', label: 'Third Parties' },
    { id: 'your-choices', label: 'Your Choices' },
    { id: 'children', label: "Children's Privacy" },
    { id: 'changes', label: 'Changes' },
    { id: 'contact', label: 'Contact' },
  ];

  return (
    <div
      className={`relative min-h-screen overflow-x-hidden transition-colors duration-500 ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      `}</style>

      {/* Grid background — matches App.jsx */}
      {darkMode ? (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(66,135,245,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(66,135,245,0.2) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            zIndex: 0,
          }}
        />
      ) : (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(139,0,0,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,0,0,0.3) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
            zIndex: 0,
          }}
        />
      )}

      {/* Header */}
      <header
        className={`sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 border-b backdrop-blur-md ${
          darkMode ? 'bg-gray-900/90 border-gray-800 text-white' : 'bg-white/90 border-gray-200 text-gray-900'
        }`}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <AirstreamLogo darkMode={darkMode} className="h-8 w-8 select-none flex-shrink-0" />
          <span
            className={`text-2xl font-black tracking-widest select-none uppercase ${
              darkMode ? 'text-white' : 'bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent'
            }`}
          >
            AIRSTREAM
          </span>
        </Link>
        <Link
          to="/"
          className={`text-sm font-medium transition-colors duration-150 ${
            darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          ← Back home
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
        {/* Title block */}
        <div className="mb-10">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest mb-5 ${
              darkMode ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-red-500/25 bg-red-50 text-red-600'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-red-500'}`} />
            Legal
          </div>
          <h1 className={`text-3xl sm:text-5xl font-black tracking-tight mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Privacy Policy
          </h1>
          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Last updated: {LAST_UPDATED}</p>
          <p className={`mt-4 max-w-2xl text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Airstream ("we", "our", "us") is a personal file storage and sync tool. This page explains what
            data we collect when you use Airstream, why we collect it, and the choices available to you.
          </p>
        </div>

        {/* Quick nav */}
        <nav
          className={`mb-10 flex flex-wrap gap-x-4 gap-y-2 rounded-xl border p-4 text-xs sm:text-sm ${
            darkMode ? 'border-gray-800 bg-gray-900/60' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`transition-colors duration-150 ${
                darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-red-600'
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="space-y-12">
          <div id="info-we-collect">
            <Section title="1. Information We Collect" darkMode={darkMode}>
              <p>We collect only what's needed to run the service:</p>
              <List
                darkMode={darkMode}
                items={[
                  {
                    label: 'Google account info',
                    text: 'When you sign in with Google, we receive your name, email address, and profile picture.',
                  },
                  {
                    label: 'Google Drive access',
                    text: 'With your permission, we store an access/refresh token that lets Airstream upload, list, and retrieve files in your Google Drive on your behalf.',
                  },
                  {
                    label: 'Files & folders',
                    text: 'Filenames, file sizes, content types, and the files you upload, organize, or export through Airstream.',
                  },
                  {
                    label: 'Device & usage data',
                    text: 'IP address and browser/device user-agent string, used for account security (e.g. new sign-in alerts) and abuse prevention.',
                  },
                  {
                    label: 'Cookies',
                    text: 'Session and refresh-token cookies to keep you signed in. We do not use advertising or tracking cookies.',
                  },
                ]}
              />
            </Section>
          </div>

          <div id="how-we-use">
            <Section title="2. How We Use Information" darkMode={darkMode}>
              <List
                darkMode={darkMode}
                items={[
                  { text: 'To authenticate you and keep your account secure.' },
                  { text: 'To store, sync, and display your files and folders across your devices.' },
                  { text: 'To send account-related emails: welcome emails, export-ready links, and security alerts for sign-ins from a new IP address or device.' },
                  { text: 'To enforce storage limits and rate limits, and to prevent abuse of the export/import features.' },
                ]}
              />
              <p>We do not sell your data, and we do not use your files or account data for advertising.</p>
            </Section>
          </div>

          <div id="google-api">
            <Section title="3. Google API Services User Data" darkMode={darkMode}>
              <p>
                Airstream's use and transfer of information received from Google APIs adheres to the{' '}
                <a
                  href="https://developers.google.com/terms/api-services-user-data-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline underline-offset-2 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-red-600 hover:text-red-700'}`}
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. We request only the Drive scopes needed to create,
                read, and manage the files you upload through Airstream — we do not access other files in
                your Drive.
              </p>
            </Section>
          </div>

          <div id="storage-security">
            <Section title="4. Data Storage & Security" darkMode={darkMode}>
              <List
                darkMode={darkMode}
                items={[
                  { text: 'Your files are stored in your own Google Drive, not on a separate Airstream file server.' },
                  { text: 'Account and file metadata (filenames, sizes, references) are stored in our database.' },
                  { text: 'Google Drive refresh tokens are encrypted at rest.' },
                  { text: 'Exported data ZIPs are password-protected, delivered via a single-use, time-limited download link, and never stored longer than needed to generate the download.' },
                ]}
              />
            </Section>
          </div>

          <div id="retention-deletion">
            <Section title="5. Data Retention & Deletion" darkMode={darkMode}>
              <p>
                You can request account deletion at any time from your profile menu. Deleted accounts enter a
                7-day recovery window — signing back in during that period restores your account. After 7
                days, your account and associated metadata are permanently deleted. Deleting your account also
                revokes any outstanding export links.
              </p>
            </Section>
          </div>

          <div id="export-import">
            <Section title="6. Data Export & Import" darkMode={darkMode}>
              <p>
                You can export a ZIP archive of all your files at any time (limited to 3 exports per 24 hours),
                and import a previously exported archive back into your own account. Export archives can only
                be imported into the account that created them.
              </p>
            </Section>
          </div>

          <div id="third-parties">
            <Section title="7. Third-Party Services" darkMode={darkMode}>
              <List
                darkMode={darkMode}
                items={[
                  { label: 'Google', text: 'authentication and file storage (Google Drive).' },
                  { label: 'Gmail API', text: 'used to send transactional emails (welcome, export, deletion, and security alerts).' },
                ]}
              />
              <p>We do not share your personal data with third parties for their own marketing purposes.</p>
            </Section>
          </div>

          <div id="your-choices">
            <Section title="8. Your Choices" darkMode={darkMode}>
              <List
                darkMode={darkMode}
                items={[
                  { text: 'Export or delete your data at any time from the profile menu.' },
                  { text: 'Revoke Airstream\'s access to your Google account at any time via your Google Account settings.' },
                  { text: 'Contact us (below) with any privacy questions or requests.' },
                ]}
              />
            </Section>
          </div>

          <div id="children">
            <Section title="9. Children's Privacy" darkMode={darkMode}>
              <p>Airstream is not directed at children under 13, and we do not knowingly collect data from them.</p>
            </Section>
          </div>

          <div id="changes">
            <Section title="10. Changes to This Policy" darkMode={darkMode}>
              <p>
                We may update this policy from time to time. Material changes will be reflected by updating
                the "Last updated" date above.
              </p>
            </Section>
          </div>

          <div id="contact">
            <Section title="11. Contact" darkMode={darkMode}>
              <p>
                Questions about this policy or your data?{' '}
                <a
                  href="https://quickwitty.onrender.com/contacts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline underline-offset-2 ${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-red-600 hover:text-red-700'}`}
                >
                  Get in touch here
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
