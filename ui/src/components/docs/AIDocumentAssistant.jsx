import React, { useState, useEffect } from 'react';
import documentManagerService from '../../services/documentManagerService';

/**
 * AIDocumentAssistant component
 * 
 * Provides AI-powered analysis and enhancement suggestions
 * for documentation.
 */
const AIDocumentAssistant = ({ document }) => {
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingSection, setGeneratingSection] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [sectionName, setSectionName] = useState('');
  
  // Load analysis and suggestions when document changes
  useEffect(() => {
    async function loadAIAnalysis() {
      try {
        setLoading(true);
        setError(null);
        setGeneratedContent(null);
        
        // Load document analysis
        const analysisResult = await documentManagerService.analyzeDocumentQuality(document.id);
        setAnalysis(analysisResult.analysis);
        
        // Load improvement suggestions
        const suggestionsResult = await documentManagerService.suggestImprovements(document.id);
        setSuggestions(suggestionsResult.improvements);
      } catch (err) {
        console.error('Failed to load AI analysis:', err);
        setError('Failed to analyze document. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    if (document?.id) {
      loadAIAnalysis();
    }
  }, [document]);
  
  // Handle generating a new section
  const handleGenerateSection = async () => {
    if (!sectionName.trim()) {
      return;
    }
    
    try {
      setGeneratingSection(true);
      setError(null);
      
      const result = await documentManagerService.generateMissingSection(
        document.id, 
        sectionName
      );
      
      setGeneratedContent(result.generatedContent);
    } catch (err) {
      console.error('Failed to generate section:', err);
      setError('Failed to generate section. Please try again later.');
    } finally {
      setGeneratingSection(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Analyzing document...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 text-red-400">
        <p>{error}</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 h-full overflow-auto">
      {/* Document Quality Score */}
      {analysis && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Document Quality</h3>
          <div className="bg-[#0f172a] p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Overall Score:</span>
              <div className="flex items-center">
                <span className="text-xl font-bold text-white mr-2">{analysis.qualityScore}</span>
                <span className="text-gray-400">/10</span>
              </div>
            </div>
            
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Completeness:</span>
                <span className="text-white">{analysis.completeness.score}/10</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Clarity:</span>
                <span className="text-white">{analysis.clarity.score}/10</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Analysis Insights */}
      {analysis && analysis.insights && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Analysis Insights</h3>
          <div className="bg-[#0f172a] p-4 rounded-lg">
            <ul className="space-y-2">
              {analysis.insights.map((insight, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-blue-400 mr-2">•</span>
                  <span className="text-gray-200 text-sm">{insight}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Improvement Suggestions */}
      {suggestions && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-2">Suggested Improvements</h3>
          <div className="bg-[#0f172a] p-4 rounded-lg">
            <ul className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-400 mr-2">✓</span>
                  <span className="text-gray-200 text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      
      {/* Generate Missing Section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Generate Missing Section</h3>
        <div className="bg-[#0f172a] p-4 rounded-lg">
          <div className="mb-4">
            <label htmlFor="section-name" className="block text-sm text-gray-300 mb-1">
              Section Name
            </label>
            <div className="flex">
              <input
                id="section-name"
                type="text"
                className="flex-1 bg-[#1e293b] border border-gray-700 rounded-l-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g., Installation Guide, API Reference, etc."
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                disabled={generatingSection}
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleGenerateSection}
                disabled={!sectionName.trim() || generatingSection}
              >
                {generatingSection ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
          
          {generatingSection && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 mr-3"></div>
              <p className="text-gray-300">Generating content...</p>
            </div>
          )}
          
          {generatedContent && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-white font-medium">Generated Content</h4>
                <div className="flex space-x-2">
                  <button className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition">
                    Insert in Document
                  </button>
                  <button className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
                    Copy
                  </button>
                </div>
              </div>
              <div className="bg-[#1e293b] p-3 rounded border border-gray-700 text-gray-300 text-sm font-mono whitespace-pre-wrap overflow-auto max-h-64">
                {generatedContent}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* AI Actions */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">AI Actions</h3>
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded text-sm transition">
            Enhance Documentation
          </button>
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm transition">
            Fix Formatting
          </button>
          <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm transition">
            Generate Examples
          </button>
          <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded text-sm transition">
            Check Consistency
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIDocumentAssistant;