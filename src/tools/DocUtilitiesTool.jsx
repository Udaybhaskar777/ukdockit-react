import { useState } from 'react';
import { Copy, Download, Trash2, FileText } from 'lucide-react';

export default function DocUtilitiesTool({ notify }) {
  const [text, setText] = useState('');
  const [docTitle, setDocTitle] = useState('UKDocKit_Document');

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const lines = text ? text.split('\n').length : 0;

  const transformText = (type) => {
    if (!text) return;
    if (type === 'upper') setText(text.toUpperCase());
    if (type === 'lower') setText(text.toLowerCase());
    if (type === 'title') {
      setText(
        text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      );
    }
    if (type === 'clean') {
      setText(
        text
          .replace(/[ \t]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      );
      notify('Removed extra spaces & blank lines!');
    }
  };

  const exportFile = (ext) => {
    if (!text.trim()) {
      notify('Write or paste some document text first.', 'error');
      return;
    }
    let content = text;
    let mime = 'text/plain;charset=utf-8';

    if (ext === 'html') {
      mime = 'text/html;charset=utf-8';
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitle}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;line-height:1.6;padding:0 20px;}</style></head><body><pre style="white-space:pre-wrap;font-family:inherit;">${text}</pre></body></html>`;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${docTitle || 'UKDocKit_Note'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    notify(`Exported as .${ext.toUpperCase()} file!`);
  };

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
          Document Cleaner &amp; File Exporter
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
          Clean messy copied PDF text, fix casing, check word limits, and export to TXT, MD, or HTML
        </p>
      </div>

      <div className="glass-card" style={{ padding: '22px' }}>
        {/* STATS & CASE TOOLBAR */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '12px',
          }}
        >
          <div className="mono" style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: '700' }}>
            {words} Words • {chars} Chars • {lines} Lines
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'clean', label: 'Remove Blank Lines' },
              { id: 'title', label: 'Title Case' },
              { id: 'upper', label: 'UPPERCASE' },
              { id: 'lower', label: 'lowercase' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => transformText(btn.id)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  backgroundColor: '#1e293b',
                  color: '#e2e8f0',
                  border: '1px solid rgba(148, 163, 184, 0.16)',
                  fontSize: '0.76rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* DOCUMENT EDITOR */}
        <textarea
          rows={10}
          placeholder="Paste text from PDF, type an application declaration, or draft notes..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: 'rgba(7, 11, 20, 0.85)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            borderRadius: '12px',
            padding: '14px',
            color: '#f8fafc',
            fontSize: '0.94rem',
            lineHeight: 1.6,
            resize: 'vertical',
            outline: 'none',
            marginBottom: '14px',
          }}
        />

        {/* EXPORT BAR */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            placeholder="File name"
            style={{ flex: '1 1 180px' }}
          />

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(text);
              notify('Copied to clipboard!');
            }}
            style={{
              padding: '10px 14px',
              borderRadius: '9px',
              backgroundColor: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(148, 163, 184, 0.2)',
              fontWeight: '600',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Copy size={15} /> Copy
          </button>

          <button
            type="button"
            onClick={() => exportFile('txt')}
            style={{
              padding: '10px 14px',
              borderRadius: '9px',
              backgroundColor: '#0ea5e9',
              color: '#fff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={15} /> .TXT
          </button>

          <button
            type="button"
            onClick={() => exportFile('md')}
            style={{
              padding: '10px 14px',
              borderRadius: '9px',
              backgroundColor: '#2563eb',
              color: '#fff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={15} /> .MD
          </button>

          <button
            type="button"
            onClick={() => exportFile('html')}
            style={{
              padding: '10px 14px',
              borderRadius: '9px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={15} /> .HTML
          </button>

          <button
            type="button"
            onClick={() => setText('')}
            style={{
              padding: '10px',
              borderRadius: '9px',
              backgroundColor: 'rgba(239, 68, 68, 0.16)',
              color: '#f87171',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}