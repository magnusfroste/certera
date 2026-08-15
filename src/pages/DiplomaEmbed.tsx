import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const DiplomaEmbed = () => {
  const { diplomaId } = useParams();
  const [diplomaData, setDiplomaData] = useState<Tables<'signed_diplomas'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!diplomaId) return;
    const fetchDiplomaData = async () => {
      try {
        const { data, error } = await supabase
          .from('signed_diplomas')
          .select('*')
          .eq('blockchain_id', diplomaId)
          .maybeSingle();

        if (error || !data) {
          console.error('Error fetching diploma:', error);
          return;
        }

        setDiplomaData(data);
      } catch (error) {
        console.error('Unexpected error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDiplomaData();
  }, [diplomaId]);

  const getEmbedContent = () => {
    if (!diplomaData) return '';

    // QR elements are hidden via the [class*="qr"] CSS rule below instead of
    // regex-rewriting the HTML, which corrupted legitimate content containing "qr".
    const cleanedHTML = diplomaData.diploma_html;

    // signed_diplomas has no orientation column, but the stored CSS carries it:
    // the renderer caps portrait diplomas at 620px (landscape at 800px). Detect
    // that so we can re-assert the portrait width below — otherwise the
    // universal max-width:100% rule stretches portrait into a landscape shape.
    const isPortrait = /\.diploma-container\s*\{[^}]*max-width:\s*620px/.test(diplomaData.diploma_css || '');

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${diplomaData.recipient_name} - Diploma</title>
        <style>
          ${diplomaData.diploma_css}
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            overflow: hidden;
          }
          .embed-wrapper {
            position: relative;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          .embed-wrapper * {
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          ${isPortrait ? `
          /* Portrait diplomas render on a 620px canvas; re-assert that cap with
             higher specificity so the universal rule above doesn't flatten them
             into a landscape shape. Landscape is left untouched. */
          .embed-wrapper > .diploma-container {
            max-width: 620px !important;
            margin-left: auto !important;
            margin-right: auto !important;
          }
          ` : ''}
          .embed-overlay {
            position: absolute;
            bottom: 8px;
            right: 8px;
            z-index: 1000;
          }
          .embed-link {
            background: rgba(37, 99, 235, 0.95);
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            text-decoration: none;
            font-size: 11px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            backdrop-filter: blur(4px);
            transition: all 0.2s ease;
          }
          .embed-link:hover {
            background: rgba(37, 99, 235, 1);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .shield-icon {
            width: 12px;
            height: 12px;
          }
          .diploma-id-section {
            position: absolute;
            bottom: 8px;
            left: 8px;
            z-index: 1000;
            text-align: left;
          }
          .diploma-id {
            background: rgba(255, 255, 255, 0.95);
            color: #374151;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 9px;
            font-family: 'Courier New', monospace;
            font-weight: 600;
            border: 1px solid rgba(229, 231, 235, 0.8);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            backdrop-filter: blur(4px);
            word-break: break-all;
            max-width: 100px;
          }
          .diploma-label {
            font-size: 7px;
            color: #6b7280;
            font-weight: 500;
            margin-bottom: 1px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          /* Hide any remaining QR elements that might slip through */
          [class*="qr"], [id*="qr"], [class*="QR"], [id*="QR"] {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div class="embed-wrapper">
          ${cleanedHTML}
          <div class="embed-overlay">
            <a href="${window.location.origin}/diploma/${diplomaData.blockchain_id}" target="_blank" class="embed-link">
              <svg class="shield-icon" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V5l9-4z"/>
              </svg>
              View Full Diploma
            </a>
          </div>
          <div class="diploma-id-section">
            <div class="diploma-label">ID</div>
            <div class="diploma-id">${diplomaData.blockchain_id}</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #e2e8f0',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 12px'
          }}></div>
          <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>Loading diploma...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!diplomaData) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ef4444', fontSize: '16px', margin: 0 }}>Diploma not found</p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      srcDoc={getEmbedContent()}
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        background: 'transparent'
      }}
      title={`${diplomaData.recipient_name} - Diploma`}
    />
  );
};

export default DiplomaEmbed;
