import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Download,
  RotateCw,
  Contrast,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { jsPDF } from 'jspdf';

const EXAM_PRESETS = [
  { id: 'ssc-photo', label: 'SSC CGL / CHSL — Photo', w: 200, h: 230, maxKb: 50 },
  { id: 'ssc-sign', label: 'SSC CGL / CHSL — Signature', w: 140, h: 60, maxKb: 20 },
  { id: 'rrb-photo', label: 'RRB NTPC / Group-D — Photo', w: 240, h: 320, maxKb: 70 },
  { id: 'rrb-sign', label: 'RRB NTPC / Group-D — Signature', w: 140, h: 60, maxKb: 40 },
  { id: 'upsc-photo', label: 'UPSC Civil Services — Photo', w: 350, h: 350, maxKb: 300 },
  { id: 'ibps-photo', label: 'IBPS / SBI Bank — Photo', w: 200, h: 230, maxKb: 50 },
  { id: 'ibps-thumb', label: 'IBPS / SBI — Thumb / Declaration', w: 240, h: 240, maxKb: 50 },
  { id: 'appsc-photo', label: 'APPSC / TSPSC — Photo + Sign', w: 200, h: 260, maxKb: 50 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('formatter');

  // Image & Controls
  const [sourceImg, setSourceImg] = useState(null);
  const [origMeta, setOrigMeta] = useState({ w: 0, h: 0, kb: 0 });
  const [rotation, setRotation] = useState(0);
  const [bwMode, setBwMode] = useState(false);
  const [fitMode, setFitMode] = useState('cover');

  // Preset & Custom Settings
  const [selectedPreset, setSelectedPreset] = useState('ssc-photo');
  const [unit, setUnit] = useState('px');
  const [targetW, setTargetW] = useState(200);
  const [targetH, setTargetH] = useState(230);
  const [maxKb, setMaxKb] = useState(50);

  // Clean Progressive Toggles
  const [showStamp, setShowStamp] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [printName, setPrintName] = useState('');
  const [printDate, setPrintDate] = useState('');

  // Output State
  const [outputPreview, setOutputPreview] = useState(null);
  const [outputStats, setOutputStats] = useState({ w: 200, h: 230, kb: 0 });
  const [toast, setToast] = useState(null);

  // PDF Builder State
  const [pdfImages, setPdfImages] = useState([]);
  const [pdfMaxKb, setPdfMaxKb] = useState(250);
  const [buildingPdf, setBuildingPdf] = useState(false);

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  const notify = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const handleImageUpload = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      notify('Upload a valid JPG, PNG, or WEBP image.', 'error');
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setSourceImg(img);
      setOrigMeta({ w: img.width, h: img.height, kb: (file.size / 1024).toFixed(1) });
      setRotation(0);
      setBwMode(false);
    };
    img.src = url;
  };

  const handlePresetChange = (id) => {
    setSelectedPreset(id);
    const found = EXAM_PRESETS.find((p) => p.id === id);
    if (found) {
      setUnit('px');
      setTargetW(found.w);
      setTargetH(found.h);
      setMaxKb(found.maxKb);
    }
  };

  const getPixelDimensions = useCallback(() => {
    const rawW = parseFloat(targetW) || 200;
    const rawH = parseFloat(targetH) || 230;
    if (unit === 'cm') {
      const dpi = 118.11;
      return {
        w: Math.max(20, Math.round((rawW / 2.54) * dpi)),
        h: Math.max(20, Math.round((rawH / 2.54) * dpi)),
      };
    }
    return { w: Math.max(20, Math.round(rawW)), h: Math.max(20, Math.round(rawH)) };
  }, [targetW, targetH, unit]);

  useEffect(() => {
    if (!sourceImg) return;
    const { w, h } = getPixelDimensions();
    const limitKb = Math.max(5, parseInt(maxKb, 10) || 50);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = w;
    canvas.height = h;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const hasStamp = showStamp && (printName.trim() !== '' || printDate.trim() !== '');
    const stampHeight = hasStamp ? Math.round(h * 0.18) : 0;
    const drawAreaH = h - stampHeight;

    ctx.save();
    ctx.translate(w / 2, drawAreaH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    if (bwMode) ctx.filter = 'grayscale(100%) contrast(145%) brightness(105%)';

    const isRotated = rotation === 90 || rotation === 270;
    const srcW = isRotated ? sourceImg.height : sourceImg.width;
    const srcH = isRotated ? sourceImg.width : sourceImg.height;

    if (fitMode === 'cover') {
      const scale = Math.max(w / srcW, drawAreaH / srcH);
      const finalW = sourceImg.width * scale;
      const finalH = sourceImg.height * scale;
      ctx.drawImage(sourceImg, -finalW / 2, -finalH / 2, finalW, finalH);
    } else {
      const drawW = isRotated ? drawAreaH : w;
      const drawH = isRotated ? w : drawAreaH;
      ctx.drawImage(sourceImg, -drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.restore();

    if (hasStamp) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, h - stampHeight, w, stampHeight);
      ctx.strokeStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(0, h - stampHeight);
      ctx.lineTo(w, h - stampHeight);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(9, Math.floor(w * 0.055));
      ctx.font = `700 ${fontSize}px Arial, sans-serif`;

      const nameText = printName.trim().toUpperCase();
      const dateText = printDate.trim();
      if (nameText && dateText) {
        ctx.fillText(nameText, w / 2, h - stampHeight * 0.68);
        ctx.fillText(`DOP: ${dateText}`, w / 2, h - stampHeight * 0.28);
      } else if (nameText) {
        ctx.fillText(nameText, w / 2, h - stampHeight / 2);
      } else {
        ctx.fillText(`DOP: ${dateText}`, w / 2, h - stampHeight / 2);
      }
    }

    let low = 0.08;
    let high = 0.98;
    let bestDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    let bestKb = Math.round((bestDataUrl.length * 3) / 4 / 1024);

    if (bestKb > limitKb) {
      for (let i = 0; i < 8; i++) {
        const mid = (low + high) / 2;
        const attempt = canvas.toDataURL('image/jpeg', mid);
        const kb = Math.round((attempt.length * 3) / 4 / 1024);
        if (kb <= limitKb) {
          bestDataUrl = attempt;
          bestKb = kb;
          low = mid;
        } else {
          high = mid;
        }
      }
      if (bestKb > limitKb) {
        bestDataUrl = canvas.toDataURL('image/jpeg', 0.08);
        bestKb = Math.round((bestDataUrl.length * 3) / 4 / 1024);
      }
    } else {
      const highUrl = canvas.toDataURL('image/jpeg', 0.95);
      const highKb = Math.round((highUrl.length * 3) / 4 / 1024);
      if (highKb <= limitKb) {
        bestDataUrl = highUrl;
        bestKb = highKb;
      }
    }

    setOutputPreview(bestDataUrl);
    setOutputStats({ w, h, kb: bestKb });
  }, [sourceImg, rotation, bwMode, fitMode, showStamp, printName, printDate, maxKb, getPixelDimensions]);

  const downloadImage = () => {
    if (!outputPreview) return;
    const link = document.createElement('a');
    link.download = `UKDocKit_${outputStats.w}x${outputStats.h}_${outputStats.kb}KB.jpg`;
    link.href = outputPreview;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Saved ${outputStats.w}×${outputStats.h}px (${outputStats.kb} KB)`);
  };

  // PDF Handlers
  const handlePdfFiles = (files) => {
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!valid.length) return;
    setPdfImages((prev) => [
      ...prev,
      ...valid.map((file, idx) => ({
        id: `${Date.now()}-${idx}`,
        name: file.name,
        url: URL.createObjectURL(file),
      })),
    ]);
  };

  const movePdfPage = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= pdfImages.length) return;
    const copy = [...pdfImages];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    setPdfImages(copy);
  };

  const generatePdf = async () => {
    if (!pdfImages.length) {
      notify('Add at least 1 certificate image.', 'error');
      return;
    }
    setBuildingPdf(true);
    try {
      const perPageKb = Math.max(25, Math.floor((pdfMaxKb - 8) / pdfImages.length));
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      for (let i = 0; i < pdfImages.length; i++) {
        if (i > 0) doc.addPage();
        const img = await new Promise((resolve) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.src = pdfImages[i].url;
        });

        const scale = Math.min(1, 1240 / Math.max(img.width, img.height));
        const cw = Math.round(img.width * scale);
        const ch = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0, cw, ch);

        let q = 0.78;
        let dataUrl = canvas.toDataURL('image/jpeg', q);
        while (Math.round((dataUrl.length * 3) / 4 / 1024) > perPageKb && q > 0.15) {
          q -= 0.08;
          dataUrl = canvas.toDataURL('image/jpeg', q);
        }

        const pageW = 190;
        const pageH = Math.min(277, (ch / cw) * pageW);
        doc.addImage(dataUrl, 'JPEG', 10, 10, pageW, pageH);
      }

      const blob = doc.output('blob');
      const finalKb = Math.round(blob.size / 1024);
      doc.save(`UKDocKit_Certificates_${finalKb}KB.pdf`);
      notify(`PDF Saved (${pdfImages.length} pages • ${finalKb} KB)`);
    } catch {
      notify('Failed to build PDF.', 'error');
    }
    setBuildingPdf(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* MINIMAL TOP BAR */}
      <nav
        style={{
          borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
          backgroundColor: 'rgba(7, 11, 20, 0.85)',
          backdropFilter: 'blur(12px)',
          padding: '14px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '920px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '900',
                fontSize: '0.85rem',
                color: '#fff',
              }}
            >
              UK
            </span>
            <span style={{ fontWeight: '800', fontSize: '1.08rem', letterSpacing: '-0.02em' }}>
              DocKit <span style={{ color: '#64748b', fontWeight: '500', fontSize: '0.85rem' }}>Pro</span>
            </span>
          </div>

          {/* CLEAN PILL SWITCHER */}
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#0f172a',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid rgba(148, 163, 184, 0.15)',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('formatter')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.84rem',
                backgroundColor: activeTab === 'formatter' ? '#1e293b' : 'transparent',
                color: activeTab === 'formatter' ? '#38bdf8' : '#94a3b8',
              }}
            >
              <ImageIcon size={15} /> Photo &amp; Sign
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pdf')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.84rem',
                backgroundColor: activeTab === 'pdf' ? '#1e293b' : 'transparent',
                color: activeTab === 'pdf' ? '#38bdf8' : '#94a3b8',
              }}
            >
              <FileText size={15} /> Image to PDF
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN STUDIO CONTAINER */}
      <main style={{ flex: 1, maxWidth: '880px', width: '100%', margin: '0 auto', padding: '36px 20px 64px' }}>
        {activeTab === 'formatter' && (
          <div>
            {/* CLEAN TITLE */}
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Govt Exam Photo &amp; Signature Formatter
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
                100% private browser processing • Instant exact-KB compression
              </p>
            </div>

            {/* STEP 1: UPLOAD OR LIVE WORKSPACE */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />

            {!sourceImg ? (
              <div
                className="glass-card"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) handleImageUpload(e.dataTransfer.files[0]);
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
                  <Upload size={24} color="#38bdf8" />
                </div>
                <div style={{ fontWeight: '700', fontSize: '1.05rem', marginBottom: '4px' }}>
                  Click or drop your photo / signature
                </div>
                <div style={{ color: '#64748b', fontSize: '0.84rem' }}>
                  JPG, PNG, WEBP supported • Auto-converted to JPG
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: '20px',
                  alignItems: 'start',
                }}
              >
                {/* LEFT: CLEAN PREVIEW CARD */}
                <div className="glass-card" style={{ padding: '20px' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <span className="mono" style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: '700' }}>
                      ● LIVE OUTPUT
                    </span>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: 'transparent',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={13} /> Replace
                    </button>
                  </div>

                  <div
                    style={{
                      backgroundColor: '#050811',
                      borderRadius: '12px',
                      height: '240px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '14px',
                      border: '1px solid rgba(148, 163, 184, 0.12)',
                      marginBottom: '14px',
                    }}
                  >
                    {outputPreview && (
                      <img
                        src={outputPreview}
                        alt="Preview"
                        style={{ maxWidth: '100%', maxHeight: '210px', borderRadius: '4px' }}
                      />
                    )}
                  </div>

                  {/* COMPACT TOOLBAR */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                    <button
                      type="button"
                      onClick={() => setRotation((r) => (r + 90) % 360)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        color: '#e2e8f0',
                        border: '1px solid rgba(148, 163, 184, 0.15)',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <RotateCw size={14} /> Rotate
                    </button>
                    <button
                      type="button"
                      onClick={() => setBwMode((b) => !b)}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: bwMode ? 'rgba(56, 189, 248, 0.18)' : '#1e293b',
                        color: bwMode ? '#38bdf8' : '#e2e8f0',
                        border: bwMode ? '1px solid #38bdf8' : '1px solid rgba(148, 163, 184, 0.15)',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <Contrast size={14} /> B&amp;W
                    </button>
                    <button
                      type="button"
                      onClick={() => setFitMode((m) => (m === 'cover' ? 'fill' : 'cover'))}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: '#1e293b',
                        color: '#e2e8f0',
                        border: '1px solid rgba(148, 163, 184, 0.15)',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      {fitMode === 'cover' ? 'Smart Fit' : 'Stretch'}
                    </button>
                  </div>

                  {/* OUTPUT METRICS */}
                  <div
                    className="mono"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.78rem',
                      color: '#94a3b8',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(7, 11, 20, 0.7)',
                    }}
                  >
                    <span>
                      Size: <strong style={{ color: '#f8fafc' }}>{outputStats.w}×{outputStats.h}px</strong>
                    </span>
                    <span>
                      Weight: <strong style={{ color: '#34d399' }}>{outputStats.kb} KB</strong> / {maxKb}KB
                    </span>
                  </div>
                </div>

                {/* RIGHT: CLEAN CONTROLS CARD */}
                <div className="glass-card" style={{ padding: '22px' }}>
                  {/* EXAM PRESET DROPDOWN */}
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
                    Exam Preset
                  </label>
                  <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                    style={{ width: '100%', marginBottom: '10px', fontWeight: '600' }}
                  >
                    {EXAM_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({p.w}×{p.h}px • ≤{p.maxKb}KB)
                      </option>
                    ))}
                    <option value="custom">Custom Dimensions &amp; KB</option>
                  </select>

                  {/* QUICK 3 PILLS */}
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
                    {[
                      { id: 'ssc-photo', label: 'SSC Photo' },
                      { id: 'ssc-sign', label: 'Signature' },
                      { id: 'upsc-photo', label: 'UPSC Square' },
                    ].map((quick) => (
                      <button
                        key={quick.id}
                        type="button"
                        onClick={() => handlePresetChange(quick.id)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          borderRadius: '8px',
                          fontSize: '0.76rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          border:
                            selectedPreset === quick.id
                              ? '1px solid #38bdf8'
                              : '1px solid rgba(148, 163, 184, 0.15)',
                          backgroundColor:
                            selectedPreset === quick.id ? 'rgba(56, 189, 248, 0.14)' : 'rgba(7, 11, 20, 0.6)',
                          color: selectedPreset === quick.id ? '#38bdf8' : '#94a3b8',
                        }}
                      >
                        {quick.label}
                      </button>
                    ))}
                  </div>

                  {/* COLLAPSIBLE 1: NAME & DATE STAMP */}
                  <div
                    style={{
                      borderTop: '1px solid rgba(148, 163, 184, 0.12)',
                      paddingTop: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowStamp((s) => !s)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#e2e8f0',
                        fontWeight: '600',
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                    >
                      <span>+ Name &amp; Date Stamp (DOP)</span>
                      {showStamp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showStamp && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                        <input
                          type="text"
                          placeholder="Name (e.g. UDAY B)"
                          value={printName}
                          onChange={(e) => setPrintName(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Date (21-11-2026)"
                          value={printDate}
                          onChange={(e) => setPrintDate(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  {/* COLLAPSIBLE 2: CUSTOM SIZE & KB */}
                  <div
                    style={{
                      borderTop: '1px solid rgba(148, 163, 184, 0.12)',
                      paddingTop: '12px',
                      marginBottom: '20px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowCustom((c) => !c)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: '#e2e8f0',
                        fontWeight: '600',
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                    >
                      <span>+ Custom Width, Height &amp; Max KB</span>
                      {showCustom ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showCustom && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 72px', gap: '6px' }}>
                          <input
                            type="number"
                            step="any"
                            placeholder="W"
                            value={targetW}
                            onChange={(e) => {
                              setTargetW(e.target.value);
                              setSelectedPreset('custom');
                            }}
                          />
                          <input
                            type="number"
                            step="any"
                            placeholder="H"
                            value={targetH}
                            onChange={(e) => {
                              setTargetH(e.target.value);
                              setSelectedPreset('custom');
                            }}
                          />
                          <input
                            type="number"
                            placeholder="KB"
                            value={maxKb}
                            onChange={(e) => {
                              setMaxKb(e.target.value);
                              setSelectedPreset('custom');
                            }}
                          />
                          <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                            style={{ padding: '8px' }}
                          >
                            <option value="px">px</option>
                            <option value="cm">cm</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PRIMARY DOWNLOAD BUTTON */}
                  <button
                    type="button"
                    onClick={downloadImage}
                    style={{
                      width: '100%',
                      padding: '13px',
                      borderRadius: '11px',
                      background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                      color: '#fff',
                      fontWeight: '700',
                      fontSize: '0.96rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 8px 22px rgba(37, 99, 235, 0.32)',
                    }}
                  >
                    <Download size={18} /> Download JPG ({outputStats.kb} KB)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: IMAGE TO PDF */}
        {activeTab === 'pdf' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
                Certificates to Compressed PDF
              </h1>
              <p style={{ color: '#94a3b8', fontSize: '0.92rem', marginTop: '4px' }}>
                Combine scanned marksheets into a single A4 PDF under your exact KB limit
              </p>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
              <input
                ref={pdfInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => e.target.files && handlePdfFiles(e.target.files)}
              />

              <div
                onClick={() => pdfInputRef.current?.click()}
                style={{
                  border: '1.5px dashed rgba(56, 189, 248, 0.38)',
                  borderRadius: '12px',
                  padding: '32px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: '18px',
                }}
              >
                <FileText size={28} color="#38bdf8" style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: '700', fontSize: '0.98rem' }}>Add Certificate Images</div>
                <div style={{ color: '#64748b', fontSize: '0.82rem' }}>Select multiple pages at once</div>
              </div>

              {pdfImages.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                  {pdfImages.map((item, idx) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(7, 11, 20, 0.75)',
                        border: '1px solid rgba(148, 163, 184, 0.12)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                          src={item.url}
                          alt={item.name}
                          style={{ width: '32px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                          Page {idx + 1} — <span style={{ color: '#94a3b8', fontWeight: '400' }}>{item.name}</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => movePdfPage(idx, -1)}
                          style={{ padding: '5px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePdfPage(idx, 1)}
                          style={{ padding: '5px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <ArrowDown size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPdfImages((prev) => prev.filter((_, i) => i !== idx))}
                          style={{ padding: '5px', background: 'rgba(239,68,68,0.18)', color: '#f87171', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '130px' }}>
                  <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                    Max PDF (KB)
                  </label>
                  <input
                    type="number"
                    value={pdfMaxKb}
                    onChange={(e) => setPdfMaxKb(parseInt(e.target.value, 10) || 250)}
                    style={{ width: '100%' }}
                  />
                </div>
                <button
                  type="button"
                  disabled={buildingPdf}
                  onClick={generatePdf}
                  style={{
                    flex: 1,
                    marginTop: '18px',
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <Download size={17} />
                  {buildingPdf ? 'Building PDF...' : `Download PDF (≤ ${pdfMaxKb} KB)`}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CLEAN FOOTER */}
      <footer
        style={{
          borderTop: '1px solid rgba(148, 163, 184, 0.1)',
          padding: '20px',
          textAlign: 'center',
          color: '#64748b',
          fontSize: '0.82rem',
        }}
      >
        UK WEBS Ecosystem • Built by Uday Bhaskar N
      </footer>

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: toast.type === 'error' ? '#dc2626' : '#059669',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '999px',
            fontWeight: '600',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 100,
          }}
        >
          <CheckCircle2 size={16} /> {toast.msg}
        </div>
      )}
    </div>
  );
}