
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Award } from 'lucide-react';

const TestDiploma = () => {
  const { diplomaId } = useParams();
  const [diplomaData, setDiplomaData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('=== TEST DIPLOMA PAGE ===');
    console.log('URL diplomaId:', diplomaId);
    console.log('Full URL:', window.location.href);
    
    if (diplomaId) {
      fetchDiplomaData();
    } else {
      setError('No diploma ID provided');
      setIsLoading(false);
    }
  }, [diplomaId]);

  const fetchDiplomaData = async () => {
    try {
      console.log('Fetching diploma with blockchain_id:', diplomaId);
      
      const { data, error } = await supabase
        .from('signed_diplomas')
        .select('*')
        .eq('blockchain_id', diplomaId)
        .maybeSingle();

      console.log('Query result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        setError(`Database error: ${error.message}`);
        return;
      }

      if (!data) {
        console.log('No diploma found');
        setError('Diploma not found');
        return;
      }

      console.log('SUCCESS: Found diploma:', data);
      setDiplomaData(data);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading diploma...</p>
          <p className="text-sm text-gray-500 mt-2">Diploma ID: {diplomaId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong>Error:</strong> {error}
          </div>
          <p className="text-sm text-gray-500">Searched for ID: {diplomaId}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Brand */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
            <Award className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">certera.ink</h1>
            <p className="text-sm text-gray-600">Test Diploma Page</p>
          </div>
        </div>
        
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Diploma Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Blockchain ID</label>
              <p className="mt-1 text-sm text-gray-900 font-mono">{diplomaData.blockchain_id}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Recipient</label>
              <p className="mt-1 text-sm text-gray-900">{diplomaData.recipient_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Institution</label>
              <p className="mt-1 text-sm text-gray-900">{diplomaData.institution_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">{new Date(diplomaData.created_at).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* URLs */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Generated URLs</h2>
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Diploma URL</label>
              <p className="mt-1 text-sm text-gray-900 font-mono break-all">{diplomaData.diploma_url}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Verification URL</label>
              <p className="mt-1 text-sm text-gray-900 font-mono break-all">{diplomaData.verification_url}</p>
            </div>
          </div>
        </div>

        {/* Simple Diploma Preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Simple Diploma Preview</h2>
          <div className="border border-gray-200 rounded p-4 bg-gray-50">
            <div 
              dangerouslySetInnerHTML={{ 
                __html: `<style>${diplomaData.diploma_css}</style>${diplomaData.diploma_html}` 
              }}
            />
          </div>
        </div>

        {/* Raw Data (for debugging) */}
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Raw Data (Debug)</h2>
          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
            {JSON.stringify(diplomaData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default TestDiploma;
