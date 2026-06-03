"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import { Play, Pause, Scissors, VolumeX, Download, Loader2, ZoomIn, Wand2 } from "lucide-react";
import styles from "../app/page.module.css";

// Utility to convert AudioBuffer to WAV Blob
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);
  const channels = [];
  const sampleRate = buffer.sampleRate;
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(offset, data, true);
    offset += 2;
  }
  function setUint32(data: number) {
    view.setUint32(offset, data, true);
    offset += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(36 + length);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1);
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][pos]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(offset, sample, true);
      offset += 2;
    }
    pos++;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

interface AudioEditorProps {
  audioFile: File;
  onAudioUpdate: (file: File) => void;
}

export default function AudioEditor({ audioFile, onAudioUpdate }: AudioEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<RegionsPlugin | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [gain, setGain] = useState(1);
  const [zoom, setZoom] = useState(10);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [useJingle, setUseJingle] = useState(true);
  const [exportName, setExportName] = useState("Metro_Anons");
  const [downloadLinks, setDownloadLinks] = useState<{ format: string; url: string }[]>([]);

  useEffect(() => {
    if (!containerRef.current || !timelineRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "rgba(148, 163, 184, 0.5)",
      progressColor: "#3b82f6",
      cursorColor: "#60a5fa",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 150,
      normalize: true,
      minPxPerSec: zoom,
    });
    
    wavesurferRef.current = ws;
    ws.setVolume(gain);

    ws.registerPlugin(TimelinePlugin.create({
      container: timelineRef.current,
      height: 20,
      timeInterval: 5,
      primaryLabelInterval: 10,
      style: {
        fontSize: '10px',
        color: '#94a3b8'
      }
    }));

    const wsRegions = ws.registerPlugin(RegionsPlugin.create());
    regionsRef.current = wsRegions;
    
    wsRegions.enableDragSelection({
      color: "rgba(59, 130, 246, 0.2)",
    });

    wsRegions.on("region-created", (region) => {
      // Allow only one region at a time for simplicity
      const currentRegions = wsRegions.getRegions();
      currentRegions.forEach(r => {
        if (r.id !== region.id) r.remove();
      });
      setActiveRegionId(region.id);
    });

    wsRegions.on("region-clicked", (region, e) => {
      e.stopPropagation();
      setActiveRegionId(region.id);
      region.play();
    });

    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("timeupdate", (time) => setCurrentTime(time));
    ws.on("ready", () => setDuration(ws.getDuration()));

    // Load file
    const objectUrl = URL.createObjectURL(audioFile);
    ws.load(objectUrl);

    return () => {
      ws.destroy();
      URL.revokeObjectURL(objectUrl);
      setActiveRegionId(null);
    };
  }, [audioFile]);

  const togglePlay = () => {
    wavesurferRef.current?.isPlaying() ? wavesurferRef.current.pause() : wavesurferRef.current?.play();
  };

  const removeActiveRegion = () => {
    if (!activeRegionId || !regionsRef.current) return;
    const region = regionsRef.current.getRegions().find(r => r.id === activeRegionId);
    if (region) {
      region.remove();
      setActiveRegionId(null);
    }
  };

  const enhanceAudio = async () => {
    setIsEnhancing(true);
    const formData = new FormData();
    formData.append("audio", audioFile);

    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Ses temizleme başarısız oldu.");

      const blob = await response.blob();
      const newFile = new File([blob], `temiz_${audioFile.name}`, { type: "audio/wav" });
      onAudioUpdate(newFile);
    } catch (error) {
      console.error(error);
      alert("Sesi temizlerken bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const applyLocalEdit = async (type: "cut" | "silence") => {
    if (!activeRegionId || !regionsRef.current) return;
    const region = regionsRef.current.getRegions().find(r => r.id === activeRegionId);
    if (!region) return;

    setIsEditing(true);
    
    // Slight timeout to let React render the loading state
    setTimeout(async () => {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const arrayBuffer = await audioFile.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        const startSample = Math.floor(region.start * audioBuffer.sampleRate);
        const endSample = Math.floor(region.end * audioBuffer.sampleRate);
        
        let newBuffer: AudioBuffer;

        if (type === "cut") {
          const newLength = audioBuffer.length - (endSample - startSample);
          newBuffer = audioCtx.createBuffer(audioBuffer.numberOfChannels, newLength, audioBuffer.sampleRate);

          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const oldData = audioBuffer.getChannelData(channel);
            const newData = newBuffer.getChannelData(channel);
            
            newData.set(oldData.subarray(0, startSample), 0);
            newData.set(oldData.subarray(endSample), startSample);
          }
        } else {
          newBuffer = audioCtx.createBuffer(audioBuffer.numberOfChannels, audioBuffer.length, audioBuffer.sampleRate);
          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            const oldData = audioBuffer.getChannelData(channel);
            const newData = newBuffer.getChannelData(channel);
            newData.set(oldData);
            newData.fill(0, startSample, endSample);
          }
        }

        const wavBlob = audioBufferToWav(newBuffer);
        const newFile = new File([wavBlob], audioFile.name, { type: "audio/wav" });
        
        onAudioUpdate(newFile);
      } catch (error) {
        console.error(error);
        alert("Düzenleme sırasında hata oluştu.");
      } finally {
        setIsEditing(false);
      }
    }, 50);
  };

  const handleGainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setGain(val);
    wavesurferRef.current?.setVolume(val);
  };

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setZoom(val);
    wavesurferRef.current?.zoom(val);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    wavesurferRef.current?.setTime(time);
    setCurrentTime(time);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const processAudio = async () => {
    setIsProcessing(true);
    setDownloadLinks([]);
    
    const formData = new FormData();
    // Use the already locally cut/silenced audioFile!
    formData.append("audio", audioFile);
    
    // We don't need backend edits anymore since it's done locally
    formData.append("edits", "[]");
    formData.append("gain", gain.toString());
    formData.append("useJingle", useJingle.toString());

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "İşlem sırasında sunucudan bir hata döndü.");
      }

      const data = await response.json();
      if (data.files) {
        setDownloadLinks(data.files);
      }
    } catch (error) {
      console.error(error);
      alert("İşlem sırasında bir hata oluştu.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ width: '100%', minWidth: 0, position: 'relative' }}>
        <div className={styles.waveformContainer} ref={containerRef} style={{ width: '100%' }} />
        <div ref={timelineRef} style={{ marginTop: '5px', width: '100%' }} />
      </div>
      
      <div className={styles.controls} style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)' }}>
        <button className={styles.iconButton} onClick={togglePlay} style={{ width: '40px', height: '40px' }}>
          {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }}/>}
        </button>
        <span style={{ fontSize: '0.85rem', minWidth: '45px', textAlign: 'right' }}>{formatTime(currentTime)}</span>
        <input 
          type="range" 
          min="0" 
          max={duration || 100} 
          step="0.1" 
          value={currentTime} 
          onChange={handleSeek} 
          className={styles.slider} 
          style={{ flex: 1 }} 
        />
        <span style={{ fontSize: '0.85rem', minWidth: '45px' }}>{formatTime(duration)}</span>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        
        <div className={styles.controlGroup} style={{ flex: 1, minWidth: '150px' }}>
          <label className={styles.sectionTitle} style={{ fontSize: '0.9rem', color: 'var(--success)' }}>
            ✨ Yapay Zeka Ses Temizleme
          </label>
          <button 
            className="btn-primary" 
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', background: 'var(--success)', color: '#fff', border: 'none' }}
            onClick={enhanceAudio}
            disabled={isEnhancing}
          >
            {isEnhancing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />} 
            {isEnhancing ? "Hızlı Temizle..." : "Hızlı Temizle"}
          </button>
        </div>

        <div className={styles.controlGroup} style={{ flex: 1, minWidth: '150px' }}>
          <label className={styles.sectionTitle} style={{ fontSize: '0.9rem' }}>
            Genel Ses Seviyesi (Gain): {gain.toFixed(1)}x
          </label>
          <input 
            type="range" 
            min="0.1" max="3" step="0.1" 
            value={gain} 
            onChange={handleGainChange} 
            className={styles.slider}
          />
        </div>

        <div className={styles.controlGroup} style={{ flex: 1, minWidth: '200px' }}>
          <label className={styles.sectionTitle} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ZoomIn size={14} /> Yakınlaş (Zoom)
          </label>
          <input 
            type="range" 
            min="10" max="250" step="5" 
            value={zoom} 
            onChange={handleZoomChange} 
            className={styles.slider}
          />
        </div>

        <div className={styles.controlGroup} style={{ flex: 1, minWidth: '250px' }}>
          <label className={styles.sectionTitle} style={{ fontSize: '0.9rem' }}>
            Seçili Alan İşlemleri
          </label>
          <div className={styles.actionRow}>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: activeRegionId && !isEditing ? 1 : 0.5 }}
              onClick={() => applyLocalEdit("cut")}
              disabled={!activeRegionId || isEditing}
            >
              {isEditing ? <Loader2 className="animate-spin" size={16} /> : <Scissors size={16} color="var(--danger)" />} Kes
            </button>
            <button 
              className="btn-secondary" 
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: activeRegionId && !isEditing ? 1 : 0.5 }}
              onClick={() => applyLocalEdit("silence")}
              disabled={!activeRegionId || isEditing}
            >
              {isEditing ? <Loader2 className="animate-spin" size={16} /> : <VolumeX size={16} />} Sessize Al
            </button>
          </div>
          {activeRegionId && (
            <button className="btn-secondary" style={{ color: 'var(--danger)' }} onClick={removeActiveRegion}>
              Seçimi İptal Et
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
        {downloadLinks.length > 0 ? (
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(96, 165, 250, 0.1)', borderRadius: 'var(--border-radius-lg)', border: '1px solid var(--primary-color)' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>İşlem Tamamlandı! Dosyalarınız Hazır:</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {downloadLinks.map((link, index) => {
              let suffix = "";
              let ext = "";
              if (link.format === "192 Kbps MP3") { suffix = "_M5-MP3"; ext = ".mp3"; }
              else if (link.format === "128 Kbps MP3") { suffix = "_MP3"; ext = ".mp3"; }
              else if (link.format === "WAV") { suffix = "_WAVE"; ext = ".wav"; }
              
              const safeName = exportName.trim() || "Anons";
              const downloadFilename = `${safeName}${suffix}${ext}`;

              return (
                <a 
                  key={index} 
                  href={`${link.url}&name=${encodeURIComponent(downloadFilename)}`}
                  download={downloadFilename}
                  className="btn-primary"
                  style={{ flex: 1, minWidth: '150px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
                >
                  <Download size={16} /> {link.format}
                </a>
              );
            })}
          </div>
          <button className="btn-secondary" onClick={() => setDownloadLinks([])} style={{ marginTop: '1.5rem', padding: '0.6rem 1rem' }}>
            Yeni Düzenleme Yap
          </button>
        </div>
      ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label htmlFor="exportName" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Çıktı Dosya Adı:</label>
              <input 
                type="text" 
                id="exportName" 
                value={exportName} 
                onChange={(e) => setExportName(e.target.value)} 
                placeholder="Dosya adını girin (Örn: Sirkeci_Anons)"
                style={{ padding: '0.8rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: '1rem' }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: 'var(--border-radius-sm)' }}>
              <input 
                type="checkbox" 
                id="useJingle" 
                checked={useJingle} 
                onChange={(e) => setUseJingle(e.target.checked)} 
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="useJingle" style={{ fontSize: '0.95rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                Dışa aktarırken standart Metro Jingle'ını başa ekle
              </label>
            </div>
            <button 
              className="btn-primary" 
              style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '1.1rem', padding: '1rem' }}
              onClick={processAudio}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <><Loader2 className="animate-spin" size={24} /> İşleniyor... (Bu işlem biraz sürebilir)</>
              ) : (
                <><Download size={24} /> {useJingle ? "İşle ve Dışa Aktar (Jingle & MP3)" : "İşle ve Dışa Aktar (Sadece Ses)"}</>
              )}
            </button>
          </div>
        )}
      </div>
      
      <style>{`
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
