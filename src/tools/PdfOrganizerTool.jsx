import { useState, useRef } from 'react';
import {
  FileUp,
  Trash2,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Download,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfOrganizerTool({ notify }) {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [pages, setPages] = useState([]); // { id, pageIndex, thumb, rotation, isBlank }
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const inputRef = useRef(null);

  const handlePdfUpload = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      notify('Please select a valid PDF file.', 'error');
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(arrayBuffer);
      setPdfBytes(uint8);
      setFileName(file.name.replace(/\.pdf$/i, ''));

      const loadingTask = pdfjsLib.getDocument({ data: uint8.slice() });
      const pdf = await loadingTask.promise;

      const renderedPages = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 0.45 });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        // Auto-detect near-white/blank pages
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let darkPixels = 0;
        for (let p = 0; p < imgData.length; p += 16) {
          if (imgData[p] < 240 || imgData[p + 1] < 240 || imgData[p + 2] < 240) {
            darkPixels++;
          }
        }
        const totalSampled = imgData.length / 16;
        const isBlank = darkPixels / totalSampled < 0.004;

        renderedPages.push({
          id: `pg-${i}-${Date.now()}`,
          pageIndex: i - 1,
          thumb: canvas.toDataURL('image/jpeg', 0.75),
          rotation: 0,
          isBlank,
        });
      }

      setPages(renderedPages);
      const blankCount = renderedPages.filter((p) => p.isBlank).length;
      if (blankCount > 0) {
        notify(`Loaded ${pdf.numPages} pages (${blankCount} blank/white page detected!).`);
      } else {
        notify(`Loaded ${pdf.numPages} pages ready to organize.`);
      }
    } catch {
      notify('Could not read this PDF. Check if it is password-protected.', 'error');
    }
    setLoading(false);
  };

  const movePage = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= pages.length) return;
    const updated = [...pages];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setPages(updated);
  };

  const rotatePage = (idx) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const removePage = (idx) => {
    if (pages.length <= 1) {
      notify('At least 1 page must remain in the PDF.', 'error');
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== idx));
  };

  const removeAllBlankPages = () => {
    const nonBlank = pages.filter((p) => !p.isBlank);
    if (nonBlank.length === pages.length) {
      notify('No blank/white pages found.', 'error');
      return;
    }
    if (nonBlank.length === 0) {
      notify('All pages appear blank.', 'error');
      return;
    }
    const removed = pages.length - nonBlank.length;
    setPages(nonBlank);
    notify(`Removed ${removed} blank white page(s)!`);
  };

  const downloadOrganizedPdf = async () => {
    if (!pdfBytes || !pages.length) return;
    setExporting(true);
    try {
      const srcDoc = await PDFDocument.load(pdfBytes);
      const newDoc = await PDFDocument.create();

      for (const item of pages) {
        const [copiedPage] = await newDoc.copyPages(srcDoc, [item.pageIndex]);
        if (item.rotation !== 0) {
          const currentRot = copiedPage.getRotation().angle;
          copiedPage.setRotation(degrees((currentRot + item.rotation) % 360));
        }
        newDoc.addPage(copiedPage);
      }

      const finalBytes = await newDoc.save();
      const blob = new Blob([finalBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${fileName || 'UKDocKit'}_Organized.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify(`Downloaded clean PDF (${pages.length} pages)!`);
    } catch {
      notify('Failed to export organized PDF.', 'error');
    }
    setExporting(false);
  };

  const blankCount = pages.filter((p) => p.isBlank).length;

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: '26px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
          Organize PDF &amp; Remove White Pages
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
          Delete unwanted blank pages, fix page order, rotate pages, and download a clean PDF
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => e.target.files?.[0] && handlePdfUpload(e.target.files[0])}
      />

      {!pages.length ? (
        <div
          className="glass-card"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files?.[0]) handlePdfUpload(e.dataTransfer.files[0]);
          }}
          style={{
            maxWidth: '540px',
            margin: '0 auto',
            padding: '56px 24px',
            textAlign: 'center',
            border: '1.5px dashed rgba(56, 189, 248, 0.38)',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '14px',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            <FileUp size={24} color="#38bdf8" />
          </div>
          <div style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '4px' }}>
            {loading ? 'Rendering PDF pages...' : 'Click or drop your PDF file here'}
          </div>
          <div style={{ color: '#64748b', fontSize: '0.84rem' }}>
            Auto-detects blank white pages • Reorder &amp; delete pages visually
          </div>
        </div>
      ) : (
        <div>
          {/* ACTION TOOLBAR */}
          <div
            className="glass-card"
            style={{
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: '700' }}>
                {pages.length} Pages
              </span>

              {blankCount > 0 && (
                <button
                  type="button"
                  onClick={removeAllBlankPages}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(245, 158, 11, 0.16)',
                    border: '1px solid rgba(245, 158, 11, 0.45)',
                    color: '#fbbf24',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={14} /> Remove {blankCount} White Page{blankCount > 1 ? 's' : ''}
                </button>
              )}

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  color: '#cbd5e1',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={13} /> New PDF
              </button>
            </div>

            <button
              type="button"
              disabled={exporting}
              onClick={downloadOrganizedPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.88rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <Download size={16} />
              {exporting ? 'Saving...' : `Download Clean PDF (${pages.length}p)`}
            </button>
          </div>

          {/* VISUAL PAGE GRID */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
              gap: '16px',
            }}
          >
            {pages.map((page, idx) => (
              <div
                key={page.id}
                className="glass-card"
                style={{
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  borderColor: page.isBlank
                    ? 'rgba(245, 158, 11, 0.5)'
                    : 'rgba(148, 163, 184, 0.15)',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span className="mono" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8' }}>
                    #{idx + 1}
                  </span>
                  {page.isBlank && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: '700',
                        padding: '2px 6px',
                        borderRadius: '5px',
                        backgroundColor: 'rgba(245, 158, 11, 0.18)',
                        color: '#fbbf24',
                      }}
                    >
                      Blank Page
                    </span>
                  )}
                </div>

                {/* THUMBNAIL */}
                <div
                  style={{
                    width: '100%',
                    height: '190px',
                    backgroundColor: '#050811',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: '10px',
                    padding: '6px',
                  }}
                >
                  <img
                    src={page.thumb}
                    alt={`Page ${idx + 1}`}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      transform: `rotate(${page.rotation}deg)`,
                      transition: 'transform 0.2s ease',
                      borderRadius: '3px',
                    }}
                  />
                </div>

                {/* PAGE CONTROLS: MOVE LEFT, ROTATE, DELETE, MOVE RIGHT */}
                <div style={{ display: 'flex', gap: '5px', width: '100%' }}>
                  <button
                    type="button"
                    title="Move Left"
                    disabled={idx === 0}
                    onClick={() => movePage(idx, -1)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '7px',
                      backgroundColor: '#1e293b',
                      color: idx === 0 ? '#475569' : '#e2e8f0',
                      border: 'none',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowLeft size={14} />
                  </button>

                  <button
                    type="button"
                    title="Rotate 90°"
                    onClick={() => rotatePage(idx)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '7px',
                      backgroundColor: '#1e293b',
                      color: '#38bdf8',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <RotateCw size={14} />
                  </button>

                  <button
                    type="button"
                    title="Delete Page"
                    onClick={() => removePage(idx)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '7px',
                      backgroundColor: 'rgba(239, 68, 68, 0.18)',
                      color: '#f87171',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>

                  <button
                    type="button"
                    title="Move Right"
                    disabled={idx === pages.length - 1}
                    onClick={() => movePage(idx, 1)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '7px',
                      backgroundColor: '#1e293b',
                      color: idx === pages.length - 1 ? '#475569' : '#e2e8f0',
                      border: 'none',
                      cursor: idx === pages.length - 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}