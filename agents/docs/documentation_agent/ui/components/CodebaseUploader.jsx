import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography, 
  Paper, 
  Grid, 
  Stepper, 
  Step, 
  StepLabel,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle
} from '@mui/material';
import {
  Folder as FolderIcon,
  Code as CodeIcon,
  Description as DocumentIcon,
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  GitHub as GitHubIcon,
  Tune as TuneIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const API_BASE_URL = '/api/documentation';

// Steps in the upload process
const steps = ['Select Repository', 'Configure', 'Upload', 'Processing'];

// File extension groups
const extensionGroups = {
  code: ['.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.cpp', '.go', '.rb', '.php', '.rs', '.cs'],
  document: ['.md', '.rst', '.txt', '.pdf', '.docx'],
  data: ['.json', '.yaml', '.yml', '.xml', '.csv'],
  web: ['.html', '.css', '.scss']
};

/**
 * Codebase Uploader Component
 * 
 * This component provides a comprehensive interface for uploading and processing
 * code repositories and files for documentation analysis.
 */
const CodebaseUploader = () => {
  // State
  const [activeStep, setActiveStep] = useState(0);
  const [repository, setRepository] = useState({
    type: 'local', // 'local' or 'git'
    path: '',
    gitUrl: '',
    branch: 'main',
    autoClone: true
  });
  const [config, setConfig] = useState({
    includeExtensions: [...extensionGroups.code, ...extensionGroups.document],
    excludePatterns: ['node_modules', 'venv', '.git', '__pycache__'],
    processInChunks: true,
    chunkSize: 10,
    maxFileSize: 10, // MB
    extractDocumentation: true,
    performRedundancyAnalysis: true,
    generateEmbeddings: true
  });
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({
    total: 0,
    processed: 0,
    failed: 0,
    status: 'pending' // 'pending', 'processing', 'complete', 'failed'
  });
  const [error, setError] = useState(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [uploadId, setUploadId] = useState(null);
  const [sessionToken, setSessionToken] = useState(null);
  
  // Effects
  useEffect(() => {
    // Generate a session token on component mount
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    setSessionToken(token);
  }, []);
  
  useEffect(() => {
    // Check processing status periodically
    let interval;
    
    if (processing && uploadId) {
      interval = setInterval(async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/process-status/${uploadId}`);
          setProcessingStatus(response.data);
          
          if (response.data.status === 'complete' || response.data.status === 'failed') {
            setProcessing(false);
            clearInterval(interval);
            
            if (response.data.status === 'complete') {
              // Fetch the processing results and summary
              fetchResults();
            }
          }
        } catch (error) {
          console.error('Error checking processing status:', error);
        }
      }, 2000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [processing, uploadId]);
  
  // File dropzone
  const onDrop = useCallback((acceptedFiles) => {
    // Filter out files larger than the configured max size
    const maxSize = config.maxFileSize * 1024 * 1024; // Convert MB to bytes
    const validFiles = acceptedFiles.filter(file => file.size <= maxSize);
    
    // Warn if some files were skipped due to size
    if (validFiles.length < acceptedFiles.length) {
      setError(`${acceptedFiles.length - validFiles.length} files exceeded the max size limit (${config.maxFileSize}MB) and were skipped.`);
    }
    
    // Filter files by extension
    const filteredFiles = validFiles.filter(file => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      return config.includeExtensions.includes(ext);
    });
    
    // Filter files by exclude patterns
    const finalFiles = filteredFiles.filter(file => {
      return !config.excludePatterns.some(pattern => 
        file.path.toLowerCase().includes(pattern.toLowerCase())
      );
    });
    
    setFiles(prevFiles => [...prevFiles, ...finalFiles]);
  }, [config.includeExtensions, config.excludePatterns, config.maxFileSize]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  
  // Step handlers
  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      return;
    }
    
    // Validate current step
    if (activeStep === 0) {
      if (repository.type === 'local' && !files.length && !repository.path) {
        setError('Please select files or specify a repository path');
        return;
      }
      if (repository.type === 'git' && !repository.gitUrl) {
        setError('Please enter a Git repository URL');
        return;
      }
    }
    
    setActiveStep((prevStep) => prevStep + 1);
    
    // If advancing to upload step, start the upload
    if (activeStep === 1) {
      handleUpload();
    }
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  // Repository type handlers
  const handleRepositoryTypeChange = (e) => {
    setRepository({
      ...repository,
      type: e.target.value
    });
  };
  
  const handleRepositoryPathChange = (e) => {
    setRepository({
      ...repository,
      path: e.target.value
    });
  };
  
  const handleGitUrlChange = (e) => {
    setRepository({
      ...repository,
      gitUrl: e.target.value
    });
  };
  
  const handleBranchChange = (e) => {
    setRepository({
      ...repository,
      branch: e.target.value
    });
  };
  
  const handleAutoCloneChange = (e) => {
    setRepository({
      ...repository,
      autoClone: e.target.checked
    });
  };
  
  // Configuration handlers
  const handleExtensionToggle = (extension) => {
    setConfig(prevConfig => {
      if (prevConfig.includeExtensions.includes(extension)) {
        return {
          ...prevConfig,
          includeExtensions: prevConfig.includeExtensions.filter(ext => ext !== extension)
        };
      } else {
        return {
          ...prevConfig,
          includeExtensions: [...prevConfig.includeExtensions, extension]
        };
      }
    });
  };
  
  const handleExtensionGroupToggle = (group) => {
    setConfig(prevConfig => {
      const groupExtensions = extensionGroups[group];
      const allIncluded = groupExtensions.every(ext => prevConfig.includeExtensions.includes(ext));
      
      if (allIncluded) {
        // Remove all extensions in this group
        return {
          ...prevConfig,
          includeExtensions: prevConfig.includeExtensions.filter(ext => !groupExtensions.includes(ext))
        };
      } else {
        // Add all extensions in this group
        const newExtensions = groupExtensions.filter(ext => !prevConfig.includeExtensions.includes(ext));
        return {
          ...prevConfig,
          includeExtensions: [...prevConfig.includeExtensions, ...newExtensions]
        };
      }
    });
  };
  
  const handleAddExcludePattern = (pattern) => {
    if (pattern && !config.excludePatterns.includes(pattern)) {
      setConfig(prevConfig => ({
        ...prevConfig,
        excludePatterns: [...prevConfig.excludePatterns, pattern]
      }));
    }
  };
  
  const handleRemoveExcludePattern = (pattern) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      excludePatterns: prevConfig.excludePatterns.filter(p => p !== pattern)
    }));
  };
  
  const handleConfigChange = (e) => {
    const { name, value, checked, type } = e.target;
    setConfig(prevConfig => ({
      ...prevConfig,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  // File handlers
  const handleRemoveFile = (file) => {
    setFiles(prevFiles => prevFiles.filter(f => f !== file));
  };
  
  const handleClearFiles = () => {
    setFiles([]);
  };
  
  // Upload and processing handlers
  const handleUpload = async () => {
    try {
      setError(null);
      setUploadProgress(0);
      setUploadedCount(0);
      
      // Create upload session
      const sessionResponse = await axios.post(`${API_BASE_URL}/create-session`, {
        repository: repository,
        config: config,
        sessionToken: sessionToken
      });
      
      const { uploadId } = sessionResponse.data;
      setUploadId(uploadId);
      
      // If Git repository and autoClone is true, initiate cloning
      if (repository.type === 'git' && repository.autoClone) {
        const cloneResponse = await axios.post(`${API_BASE_URL}/clone-repository`, {
          gitUrl: repository.gitUrl,
          branch: repository.branch,
          uploadId: uploadId
        });
        
        // Update repository path with cloned path
        setRepository(prevRepo => ({
          ...prevRepo,
          path: cloneResponse.data.repositoryPath
        }));
        
        // Skip file upload and move to processing
        setActiveStep(3);
        startProcessing(uploadId);
        return;
      }
      
      // If local repository path is provided
      if (repository.type === 'local' && repository.path) {
        const scanResponse = await axios.post(`${API_BASE_URL}/scan-repository`, {
          path: repository.path,
          extensions: config.includeExtensions,
          excludePatterns: config.excludePatterns,
          uploadId: uploadId
        });
        
        // Update files with scanned files
        setFiles(scanResponse.data.files.map(filePath => ({
          name: filePath.split('/').pop(),
          path: filePath,
          size: 0, // Size is unknown at this point
          type: ''
        })));
      }
      
      // If no files selected or found, show error
      if (files.length === 0) {
        setError('No files selected or found in repository');
        return;
      }
      
      // Upload files
      if (config.processInChunks) {
        // Process files in chunks
        const chunkSize = config.chunkSize;
        const chunks = [];
        
        for (let i = 0; i < files.length; i += chunkSize) {
          chunks.push(files.slice(i, i + chunkSize));
        }
        
        let uploaded = 0;
        
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const formData = new FormData();
          
          chunk.forEach(file => {
            formData.append('files', file);
          });
          
          formData.append('uploadId', uploadId);
          formData.append('chunkIndex', i);
          formData.append('totalChunks', chunks.length);
          
          await axios.post(`${API_BASE_URL}/upload-files`, formData, {
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(percentCompleted);
            }
          });
          
          uploaded += chunk.length;
          setUploadedCount(uploaded);
          setUploadProgress(0); // Reset for next chunk
        }
      } else {
        // Upload all files at once
        const formData = new FormData();
        
        files.forEach(file => {
          formData.append('files', file);
        });
        
        formData.append('uploadId', uploadId);
        
        await axios.post(`${API_BASE_URL}/upload-files`, formData, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
            setUploadedCount(Math.floor((files.length * progressEvent.loaded) / progressEvent.total));
          }
        });
      }
      
      // Move to processing step
      setActiveStep(3);
      
      // Start processing
      startProcessing(uploadId);
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.response?.data?.message || error.message || 'An error occurred during upload');
    }
  };
  
  const startProcessing = async (id) => {
    try {
      setProcessing(true);
      setProcessingStatus({
        total: files.length,
        processed: 0,
        failed: 0,
        status: 'processing'
      });
      
      // Start processing on the server
      await axios.post(`${API_BASE_URL}/process-files`, {
        uploadId: id,
        config: config
      });
      
      // Processing status will be updated by the useEffect
    } catch (error) {
      console.error('Processing error:', error);
      setProcessing(false);
      setProcessingStatus(prev => ({
        ...prev,
        status: 'failed'
      }));
      setError(error.response?.data?.message || error.message || 'An error occurred during processing');
    }
  };
  
  const fetchResults = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/processing-results/${uploadId}`);
      // Handle results, e.g., show summary, redirect to document manager, etc.
      console.log('Processing results:', response.data);
      
      // Redirect to document manager with the upload session ID
      window.location.href = `/document-manager?session=${uploadId}`;
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Failed to fetch processing results. Please check the document manager for your uploaded files.');
    }
  };
  
  const handleRetry = () => {
    if (activeStep === 2) {
      // Retry upload
      handleUpload();
    } else if (activeStep === 3) {
      // Retry processing
      startProcessing(uploadId);
    }
  };
  
  // Render helpers
  const renderRepositorySelection = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>Repository Type</InputLabel>
            <Select
              value={repository.type}
              onChange={handleRepositoryTypeChange}
              label="Repository Type"
            >
              <MenuItem value="local">Local Files or Directory</MenuItem>
              <MenuItem value="git">Git Repository</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        {repository.type === 'local' && (
          <>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Repository Path (optional)"
                placeholder="e.g. /path/to/your/codebase"
                value={repository.path}
                onChange={handleRepositoryPathChange}
                helperText="Leave empty to upload individual files"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Paper
                {...getRootProps()}
                sx={{
                  p: 3,
                  border: '2px dashed #aaa',
                  borderRadius: 2,
                  backgroundColor: isDragActive ? '#f0f8ff' : '#fafafa',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s'
                }}
              >
                <input {...getInputProps()} />
                <Box display="flex" flexDirection="column" alignItems="center">
                  <CloudUploadIcon sx={{ fontSize: 48, mb: 2, color: 'primary.main' }} />
                  {isDragActive ? (
                    <Typography variant="h6">Drop the files here...</Typography>
                  ) : (
                    <Typography variant="h6">
                      Drag & drop files here, or click to select files
                    </Typography>
                  )}
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                    Max file size: {config.maxFileSize}MB
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            
            {files.length > 0 && (
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="h6">Selected Files ({files.length})</Typography>
                  <Button 
                    startIcon={<DeleteIcon />} 
                    color="secondary" 
                    onClick={handleClearFiles}
                  >
                    Clear All
                  </Button>
                </Box>
                <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #eee', borderRadius: 1 }}>
                  {files.slice(0, 100).map((file, index) => (
                    <ListItem
                      key={index}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleRemoveFile(file)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        {file.type.includes('image') ? (
                          <DocumentIcon />
                        ) : file.name.endsWith('.md') ? (
                          <DocumentIcon />
                        ) : (
                          <CodeIcon />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024).toFixed(2)} KB`}
                      />
                    </ListItem>
                  ))}
                  {files.length > 100 && (
                    <ListItem>
                      <ListItemText
                        primary={`...and ${files.length - 100} more files`}
                        secondary="Only showing the first 100 files"
                      />
                    </ListItem>
                  )}
                </List>
              </Grid>
            )}
          </>
        )}
        
        {repository.type === 'git' && (
          <>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Git Repository URL"
                placeholder="e.g. https://github.com/username/repo.git"
                value={repository.gitUrl}
                onChange={handleGitUrlChange}
                InputProps={{
                  startAdornment: <GitHubIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Branch"
                value={repository.branch}
                onChange={handleBranchChange}
                placeholder="main"
              />
            </Grid>
            
            <Grid item xs={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={repository.autoClone}
                    onChange={handleAutoCloneChange}
                  />
                }
                label="Automatically clone repository"
              />
            </Grid>
          </>
        )}
      </Grid>
    );
  };
  
  const renderConfigurationOptions = () => {
    return (
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Typography variant="h6">Processing Configuration</Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={config.extractDocumentation}
                onChange={handleConfigChange}
                name="extractDocumentation"
              />
            }
            label="Extract documentation (comments, docstrings)"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={config.performRedundancyAnalysis}
                onChange={handleConfigChange}
                name="performRedundancyAnalysis"
              />
            }
            label="Perform redundancy analysis"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={config.generateEmbeddings}
                onChange={handleConfigChange}
                name="generateEmbeddings"
              />
            }
            label="Generate vector embeddings for search"
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControlLabel
            control={
              <Checkbox
                checked={config.processInChunks}
                onChange={handleConfigChange}
                name="processInChunks"
              />
            }
            label="Process files in chunks"
          />
        </Grid>
        
        {config.processInChunks && (
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Chunk Size"
              type="number"
              name="chunkSize"
              value={config.chunkSize}
              onChange={handleConfigChange}
              inputProps={{ min: 1, max: 100 }}
              helperText="Number of files to process in each chunk"
            />
          </Grid>
        )}
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Max File Size (MB)"
            type="number"
            name="maxFileSize"
            value={config.maxFileSize}
            onChange={handleConfigChange}
            inputProps={{ min: 1, max: 100 }}
            helperText="Maximum file size to process"
          />
        </Grid>
        
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Advanced Configuration</Typography>
            <Button 
              startIcon={<TuneIcon />} 
              onClick={() => setIsConfigDialogOpen(true)}
            >
              Configure
            </Button>
          </Box>
        </Grid>
      </Grid>
    );
  };
  
  const renderUploadProgress = () => {
    return (
      <Box sx={{ width: '100%', my: 3 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Uploading Files {uploadedCount} / {files.length}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {uploadProgress}%
          </Typography>
        </Box>
        
        <Box position="relative" display="flex" alignItems="center">
          <Box width="100%" mr={1}>
            <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 10, borderRadius: 5 }} />
          </Box>
        </Box>
        
        <Box display="flex" justifyContent="space-between" mt={2}>
          <Typography variant="body2" color="textSecondary">
            Total Size: {(files.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(2)} MB
          </Typography>
        </Box>
      </Box>
    );
  };
  
  const renderProcessingStatus = () => {
    return (
      <Box sx={{ width: '100%', my: 3 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Processing Files
          </Typography>
          
          {processingStatus.status === 'processing' && (
            <CircularProgress size={24} thickness={4} />
          )}
          
          {processingStatus.status === 'complete' && (
            <CheckIcon color="success" />
          )}
          
          {processingStatus.status === 'failed' && (
            <ErrorIcon color="error" />
          )}
        </Box>
        
        <Box position="relative" display="flex" alignItems="center" mb={2}>
          <Box width="100%" mr={1}>
            <LinearProgress 
              variant="determinate" 
              value={processingStatus.total > 0 ? (processingStatus.processed / processingStatus.total) * 100 : 0}
              sx={{ height: 10, borderRadius: 5 }}
              color={processingStatus.status === 'failed' ? 'error' : 'primary'}
            />
          </Box>
        </Box>
        
        <Box display="flex" justifyContent="space-between" mb={3}>
          <Typography variant="body2" color="textSecondary">
            Processed: {processingStatus.processed} / {processingStatus.total}
          </Typography>
          <Typography variant="body2" color={processingStatus.failed > 0 ? 'error' : 'textSecondary'}>
            Failed: {processingStatus.failed}
          </Typography>
        </Box>
        
        {processingStatus.status === 'complete' && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <AlertTitle>Processing Complete</AlertTitle>
            All files have been processed successfully. You will be redirected to the document manager shortly.
          </Alert>
        )}
        
        {processingStatus.status === 'failed' && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Processing Failed</AlertTitle>
            Some files could not be processed. Please check the logs for more information.
          </Alert>
        )}
      </Box>
    );
  };
  
  // Advanced configuration dialog
  const renderConfigDialog = () => {
    return (
      <Dialog
        open={isConfigDialogOpen}
        onClose={() => setIsConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Advanced Configuration</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1">Include File Extensions</Typography>
              <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                {Object.entries(extensionGroups).map(([group, extensions]) => (
                  <Box key={group}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={extensions.every(ext => config.includeExtensions.includes(ext))}
                          indeterminate={extensions.some(ext => config.includeExtensions.includes(ext)) && 
                                     !extensions.every(ext => config.includeExtensions.includes(ext))}
                          onChange={() => handleExtensionGroupToggle(group)}
                        />
                      }
                      label={group.charAt(0).toUpperCase() + group.slice(1)}
                    />
                    <Box pl={4} display="flex" flexWrap="wrap" gap={1}>
                      {extensions.map(ext => (
                        <Checkbox
                          key={ext}
                          size="small"
                          checked={config.includeExtensions.includes(ext)}
                          onChange={() => handleExtensionToggle(ext)}
                          icon={<Box component="span" sx={{ 
                            display: 'inline-block', 
                            border: '1px solid #bbb', 
                            borderRadius: 1, 
                            px: 0.5, 
                            fontSize: '0.75rem',
                            color: '#666'
                          }}>{ext}</Box>}
                          checkedIcon={<Box component="span" sx={{ 
                            display: 'inline-block', 
                            border: '1px solid #1976d2', 
                            borderRadius: 1, 
                            px: 0.5, 
                            fontSize: '0.75rem',
                            bgcolor: '#e3f2fd',
                            color: '#1976d2'
                          }}>{ext}</Box>}
                        />
                      ))}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="subtitle1">Exclude Patterns</Typography>
              <Box display="flex" alignItems="center" mt={1}>
                <TextField
                  placeholder="Add pattern to exclude"
                  size="small"
                  sx={{ mr: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddExcludePattern(e.target.value);
                      e.target.value = '';
                    }
                  }}
                />
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Add pattern to exclude"]');
                    if (input && input.value) {
                      handleAddExcludePattern(input.value);
                      input.value = '';
                    }
                  }}
                >
                  Add
                </Button>
              </Box>
              <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                {config.excludePatterns.map(pattern => (
                  <Box
                    key={pattern}
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      border: '1px solid #e0e0e0',
                      borderRadius: 4,
                      px: 1,
                      py: 0.5,
                      bgcolor: '#f5f5f5'
                    }}
                  >
                    <Typography variant="body2">{pattern}</Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => handleRemoveExcludePattern(pattern)}
                      sx={{ ml: 0.5, p: 0.25 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfigDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };
  
  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Codebase Uploader
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {activeStep === 0 && renderRepositorySelection()}
      {activeStep === 1 && renderConfigurationOptions()}
      {activeStep === 2 && renderUploadProgress()}
      {activeStep === 3 && renderProcessingStatus()}
      
      {renderConfigDialog()}
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          disabled={activeStep === 0}
          onClick={handleBack}
        >
          Back
        </Button>
        
        <Box>
          {(activeStep === 2 || activeStep === 3) && processingStatus.status === 'failed' && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              sx={{ mr: 2 }}
            >
              Retry
            </Button>
          )}
          
          <Button
            variant="contained"
            color="primary"
            onClick={handleNext}
            disabled={
              (activeStep === 0 && repository.type === 'local' && !files.length && !repository.path) ||
              (activeStep === 0 && repository.type === 'git' && !repository.gitUrl) ||
              (activeStep === 2 && uploadProgress < 100 && uploadedCount < files.length) ||
              (activeStep === 3 && processingStatus.status === 'processing') ||
              activeStep === steps.length - 1
            }
          >
            {activeStep === steps.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default CodebaseUploader;