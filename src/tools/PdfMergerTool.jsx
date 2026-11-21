import { useState, useRef } from 'react';
import { FilePlus2, ArrowUp, ArrowDown, Trash2, Download } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';

export default function PdfMergerTool({ notify }) {
  const [files, setFiles] = useState([]);
  const [merging, setMerging] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (selected) => {
    const validPdfs = Array.from(selected).filter((f) => f.type === 'application/pdf');
    if (!validPdfs.length) {
      notify('Select valid PDF files only.', 'error');
      return;
    }

    const mapped = await Promise.all(
      validPdfs.map(async (file, idx) => {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let pageCount = '?';
        try {
          const doc = await PDFDocument.load(bytes);
          pageCount = doc.getPageCount();
        } catch {
          pageCount = '?';
        }
        return {
          id: `${Date.now()}-${idx}`,
          name: file.name,
          sizeKb: (file.size / 1024).toFixed(1),
          pageCount,
          bytes,
        };
      })
    );

    setFiles((prev) => [...prev, ...mapped]);
    notify(`Added ${mapped.length} PDF file(s).`);
  };

  const moveItem = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= files.length) return;
    const copy = [...files];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setFiles(copy);
  };

  const mergeAndDownload = async () => {
    if (files.length < 2) {
      notify('Add at least 2 PDF files to merge.', 'error');
      return;
    }
    setMerging(true);
    try {
      const mergedPdf = await PDFDocument.create();
      for (const f of files) {
        const src = await PDFDocument.load(f.bytes);
        const copied = await mergedPdf.copyPages(src, src.getPageIndices());
        copied.forEach((p) => mergedPdf.addPage(p));
      }

      const finalBytes = await mergedPdf.save();
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `UKDocKit_Merged_${mergedPdf.getPageCount()}Pages.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify(`Merged into ${mergedPdf.getPageCount()} pages!`);
    } catch {
      notify('Error merging PDFs. Ensure none are encrypted.', 'error');
    }
    setMerging(false);
  };

  return (
    <div style={{ maxWidth: '620px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
          Merge Multiple PDFs
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
          Arrange certificates, resumes, and receipts in your exact order and merge into one PDF
        </p>
      </div>

      <div className="glass-card" style={{ padding: '24px' }}>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          hidden
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '1.5px dashed rgba(56, 189, 248, 0.38)',
            borderRadius: '12px',
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '18px',
          }}
        >
          <FilePlus2 size={28} color="#38bdf8" style={{ marginBottom: '8px' }} />
          <div style={{ fontWeight: '700', fontSize: '0.98rem' }}>Select PDF Files to Merge</div>
          <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Add 2 or more PDFs • 100% offline</div>
        </div>

        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            {files.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(7, 11, 20, 0.78)',
                  border: '1px solid rgba(148, 163, 184, 0.14)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700' }}>
                    {idx + 1}. {item.name}
                  </div>
                  <div className="mono" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {item.pageCount} pages • {item.sizeKb} KB
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, -1)}
                    style={{ padding: '6px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, 1)}
                    style={{ padding: '6px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ padding: '6px', background: 'rgba(239,68,68,0.18)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          disabled={merging || files.length < 2}
          onClick={mergeAndDownload}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '10px',
            background:
              files.length < 2
                ? '#1e293b'
                : 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
            color: files.length < 2 ? '#64748b' : '#fff',
            fontWeight: '700',
            fontSize: '0.94rem',
            border: 'none',
            cursor: files.length < 2 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <Download size={17} />
          {merging ? 'Merging PDFs...' : `Merge & Download (${files.length} Files)`}
        </button>
      </div>
    </div>
  );
}