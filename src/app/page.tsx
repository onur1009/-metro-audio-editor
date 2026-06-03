"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { Mic2, UploadCloud, FileAudio, Settings, Download, Scissors, VolumeX } from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import the editor so wavesurfer (which relies on window) doesn't break SSR
const AudioEditor = dynamic(() => import("../components/AudioEditor"), {
  ssr: false,
  loading: () => <div className={styles.uploadArea}>Loading Editor...</div>
});

export default function Home() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [showAdobePodcast, setShowAdobePodcast] = useState(false);
  
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  return (
    <main className={styles.container}>
      <header className={styles.header} style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <img src="/logo.png" alt="MetroVox Logo" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
          <h1 className={styles.title} style={{ fontSize: '1.5rem', background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>MetroVox</h1>
        </div>
        <button 
          className="btn-secondary" 
          onClick={() => setShowAdobePodcast(!showAdobePodcast)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: showAdobePodcast ? 'var(--text-primary)' : 'var(--secondary-color)' }}
        >
          <Settings size={16} /> 
          {showAdobePodcast ? "Kapat" : "Adobe Ses Temizleme"}
        </button>
      </header>

      {showAdobePodcast && (
        <div className={`glass-panel`} style={{ padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid var(--secondary-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>✨ Adobe Podcast ile Temizle</h2>
            <button onClick={() => setShowAdobePodcast(false)} className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
              Kapat
            </button>
          </div>
          
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--border-radius-sm)', fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            <strong style={{ color: 'var(--danger)' }}>Önemli Not:</strong> Adobe'nin katı güvenlik politikaları (Giriş ekranlarının başka sitelerde gömülü açılmasını engellemesi) nedeniyle, Adobe Podcast ekranı maalesef sayfa içine gömülemiyor. <br/><br/>
            Sesi Adobe ile temizlemek için:
            <ol style={{ margin: '0.5rem 0 0 1.5rem', padding: '0' }}>
              <li>Aşağıdaki butona tıklayarak Adobe Podcast'i yeni sekmede açın.</li>
              <li>Ses kaydınızı oraya yükleyip temizlenmiş halini cihazınıza indirin.</li>
              <li>İndirdiğiniz temiz dosyayı direkt olarak aşağıdaki "Ana Ses Dosyasını Yükle" alanına atarak işlemlerinize devam edin.</li>
            </ol>
          </div>
          
          <a 
            href="https://podcast.adobe.com/enhance" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-primary" 
            style={{ padding: '0.8rem', fontSize: '1rem', textDecoration: 'none', display: 'flex', justifyContent: 'center', background: 'var(--secondary-color)' }}
          >
            Adobe Podcast'i Yeni Sekmede Aç
          </a>
        </div>
      )}

      {!audioFile ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div className={`glass-panel ${styles.mainPanel}`} style={{ minHeight: '60vh', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <img src="/logo.png" alt="MetroVox Logo" style={{ width: '280px', height: '280px', objectFit: 'contain', marginBottom: '3rem', filter: 'drop-shadow(0 10px 20px rgba(96,165,250,0.3))' }} />
            <label className={styles.uploadArea} style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}>
              <UploadCloud className={styles.uploadIcon} />
              <span className={styles.uploadText}>Ana ses dosyasını yüklemek için tıklayın veya sürükleyin</span>
              <span className={styles.uploadSubtext}>Desteklenen formatlar: WAV, MP3, M4A</span>
              <input type="file" hidden onChange={handleAudioUpload} />
            </label>
          </div>

          <section style={{ marginTop: '2rem', padding: '2rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--border-radius-lg)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>Adım Adım Nasıl Kullanılır?</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
              <div>
                <h3 style={{ color: 'var(--secondary-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mic2 size={18}/> 1. Yükle ve Temizle</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>Ana anons ses kaydınızı yukarıdaki alana yükleyin. Ses gürültülü veya boğuk ise üstteki <b>Adobe Ses Temizleme</b> veya düzenleyici içindeki <b>Hızlı Temizle (Yapay Zeka)</b> butonu ile arka plan sesini anında yok edin.</p>
              </div>
              <div>
                <h3 style={{ color: 'var(--secondary-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Scissors size={18}/> 2. Hataları Kesin & Susturun</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>Sesi dinlerken dalga üzerinde farenizle kırmızı/mavi bir alan çizin. <b>"Kes"</b> diyerek o hatalı kısmı silebilir veya <b>"Sessize Al"</b> diyerek o kısmın sessiz geçmesini sağlayabilirsiniz.</p>
              </div>
              <div>
                <h3 style={{ color: 'var(--secondary-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Download size={18}/> 3. Jingle & Dışa Aktarma</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>Düzenlemeler bittiğinde <b>İşle ve Dışa Aktar</b> tuşuna basın. Sistem otomatik olarak standart <b>Metro Jingle</b> sesini kaydın başına ekler ve size 192 Kbps, 128 Kbps MP3 ve WAV olarak indirilebilir linkleri verir.</p>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className={styles.editorContainer}>
          <div className={`glass-panel ${styles.mainPanel}`}>
            <div className={styles.sectionTitle}>Ses Düzenleyici</div>
            <AudioEditor audioFile={audioFile} onAudioUpdate={setAudioFile} />
          </div>

          <div className={`glass-panel ${styles.sidePanel}`}>
            <div className={styles.sectionTitle}>Proje Dosyaları</div>
            
            <div className={styles.fileList}>
              <div className={styles.fileItem}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileAudio size={16} className={styles.logoIcon} />
                  <span className={styles.fileName} title={audioFile.name}>{audioFile.name}</span>
                </div>
                <button className="btn-secondary" onClick={() => setAudioFile(null)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>Kaldır</button>
              </div>
            </div>

            <div style={{ marginTop: 'auto' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
                * Arka plandaki sistem, dışa aktarırken standart jingle'ı otomatik olarak başa ekler.
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
