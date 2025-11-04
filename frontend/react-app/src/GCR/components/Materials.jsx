import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  Card, Container, Button, Form, Row, Col, Modal,
  Spinner, Alert, Toast, ListGroup, Tab, Nav
} from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../api';

// Retry function for API calls
const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

function Materials({ className, showCreateModal: externalShowCreateModal, onShowCreateModalChange, onMaterialCreated, hideContent = false }) {
  const [materials, setMaterials] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [materialData, setMaterialData] = useState({
    title: '',
    description: '',
    type: 'link',
    content: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await retry(() => 
        axios.get(`${API_BASE_URL}/api/materials?className=${encodeURIComponent(className || '')}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      );
      setMaterials(res.data || []);
    } catch (err) {
      console.error('Fetch materials error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to load materials.');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  }, [className]);
  
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // If parent controls the modal, sync it
  useEffect(() => {
    if (externalShowCreateModal !== undefined && externalShowCreateModal !== null) {
      setShowCreateModal(Boolean(externalShowCreateModal));
    }
  }, [externalShowCreateModal]);
  
  const handleCreateMaterial = async () => {
    // Reset error state
    setError('');
    
    // Validate title
    if (!materialData.title.trim()) {
      setError('Title is required');
      setShowToast(true);
      return;
    }
    
    // Validate type
    if (!materialData.type) {
      setError('Material type is required');
      setShowToast(true);
      return;
    }
    
    // Validate content based on type
    if (materialData.type === 'link' && !materialData.content) {
      setError('Please enter a valid URL');
      setShowToast(true);
      return;
    }
    
    if (materialData.type === 'file' && !fileToUpload) {
      setError('Please select a file to upload');
      setShowToast(true);
      return;
    }
    
    if (materialData.type === 'video' && !materialData.content) {
      setError('Please enter a valid video URL');
      setShowToast(true);
      return;
    }
    
    try {
      let content = materialData.content;
      
      // If it's a file upload, upload the file first
      if (materialData.type === 'file' && fileToUpload) {
        try {
          const formData = new FormData();
          formData.append('file', fileToUpload);
          
          console.log('Uploading file:', fileToUpload.name, 'size:', fileToUpload.size);
          
          const uploadRes = await retry(() => 
            axios.post(`${API_BASE_URL}/api/upload`, formData, {
              headers: { 
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${localStorage.getItem('token')}`
              },
              onUploadProgress: (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                console.log('Upload progress:', percentCompleted + '%');
              }
            })
          );
          
          console.log('File upload successful:', uploadRes.data);
          content = uploadRes.data.filePath;
        } catch (uploadErr) {
          console.error('File upload error:', uploadErr);
          throw new Error('File upload failed: ' + (uploadErr.response?.data?.error || uploadErr.message));
        }
      }
      
      await retry(() => 
        axios.post(
          `${API_BASE_URL}/api/materials`,
          { 
            ...materialData,
            content,
            class: className
          },
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        )
      );
      
      // Call the callback if provided
      if (onMaterialCreated) {
        onMaterialCreated({
          ...materialData,
          content,
          class: className,
          _id: Date.now(), // temporary ID
          createdAt: new Date().toISOString()
        });
      }
      
      setShowCreateModal(false);
  // notify parent if it's controlling the modal
  if (onShowCreateModalChange) onShowCreateModalChange(false);
      setMaterialData({
        title: '',
        description: '',
        type: 'link',
        content: '',
      });
      setFileToUpload(null);
      await fetchMaterials();
      setError('Material created successfully!');
      setShowToast(true);
    } catch (err) {
      console.error('Create material error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to create material. Check your inputs.');
      setShowToast(true);
    }
  };
  
  const handleDelete = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material? This cannot be undone.')) {
      return;
    }
    
    try {
      await retry(() => 
        axios.delete(`${API_BASE_URL}/api/materials/${materialId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      );
      await fetchMaterials();
      setError('Material deleted successfully.');
      setShowToast(true);
    } catch (err) {
      console.error('Delete material error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to delete material.');
      setShowToast(true);
    }
  };
  
  const handleFileChange = (e) => {
    setFileToUpload(e.target.files[0]);
  };
  
  // Group materials by type
  const linkMaterials = materials.filter(m => m.type === 'link');
  const documentMaterials = materials.filter(m => m.type === 'file' || m.type === 'document');
  const videoMaterials = materials.filter(m => m.type === 'video');
  
  if (loading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" role="status" aria-label="Loading materials" />
        <p>Loading materials...</p>
      </div>
    );
  }

  return (
    <div>
      {!hideContent && (
        <>
          <h4 className="fw-bold mb-3 d-flex justify-content-between align-items-center">
            <span>Class Materials</span>
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => {
                setShowCreateModal(true);
                if (onShowCreateModalChange) onShowCreateModalChange(true);
              }}
              aria-label="Add material"
            >
              + Add Material
            </Button>
          </h4>

          {error && (
            <Toast
              show={showToast}
              onClose={() => setShowToast(false)}
              delay={5000}
              autohide
              bg={error.includes('successfully') ? 'success' : 'danger'}
              style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 10000 }}
            >
              <Toast.Body className="text-white">{error}</Toast.Body>
            </Toast>
          )}

          <Tab.Container defaultActiveKey="all">
            <Nav variant="tabs" className="mb-3">
              <Nav.Item>
                <Nav.Link eventKey="all">All</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="links">Links</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="documents">Documents</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="videos">Videos</Nav.Link>
              </Nav.Item>
            </Nav>

            <Tab.Content>
              <Tab.Pane eventKey="all">
                <ListGroup>
                  {materials.length === 0 ? (
                    <Alert variant="light" className="text-center">No materials available for this class yet.</Alert>
                  ) : (
                    materials.map(material => (
                      <ListGroup.Item 
                        key={material._id}
                        className="d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <h5 className="mb-1">{material.title}</h5>
                          <div className="text-muted mb-1">{material.description}</div>
                          <div className="d-flex align-items-center">
                            <small className="text-muted me-2">
                              {new Date(material.createdAt).toLocaleDateString()}
                            </small>
                            <span className="badge bg-info text-dark me-2">{material.type}</span>
                            {material.type === 'link' || material.type === 'video' ? (
                              <a 
                                href={material.content}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary me-2"
                              >
                                Open
                              </a>
                            ) : (
                              <a 
                                href={material.content && material.content.startsWith('http') ? material.content : `${API_BASE_URL}/${material.content}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-info w-100"
                              >
                                View
                              </a>
                            )}
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(material._id)}
                    >
                      Delete
                    </Button>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </Tab.Pane>
          
          <Tab.Pane eventKey="links">
            <ListGroup>
              {linkMaterials.length === 0 ? (
                <Alert variant="light" className="text-center">No links available.</Alert>
              ) : (
                linkMaterials.map(material => (
                  <ListGroup.Item 
                    key={material._id}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <h5 className="mb-1">{material.title}</h5>
                      <div className="text-muted mb-1">{material.description}</div>
                      <div>
                        <a 
                          href={material.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          Open Link
                        </a>
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(material._id)}
                    >
                      Delete
                    </Button>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </Tab.Pane>
          
          <Tab.Pane eventKey="documents">
            <ListGroup>
              {documentMaterials.length === 0 ? (
                <Alert variant="light" className="text-center">No documents available.</Alert>
              ) : (
                documentMaterials.map(material => (
                  <ListGroup.Item 
                    key={material._id}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <h5 className="mb-1">{material.title}</h5>
                      <div className="text-muted mb-1">{material.description}</div>
                      <div>
                        <a 
                          href={material.content && material.content.startsWith('http') ? material.content : `${API_BASE_URL}/${material.content}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-info w-100"
                        >
                          View
                        </a>
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(material._id)}
                    >
                      Delete
                    </Button>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </Tab.Pane>
          
          <Tab.Pane eventKey="videos">
            <ListGroup>
              {videoMaterials.length === 0 ? (
                <Alert variant="light" className="text-center">No videos available.</Alert>
              ) : (
                videoMaterials.map(material => (
                  <ListGroup.Item 
                    key={material._id}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <h5 className="mb-1">{material.title}</h5>
                      <div className="text-muted mb-1">{material.description}</div>
                      <div>
                        <a 
                          href={material.content}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary"
                        >
                          Watch Video
                        </a>
                      </div>
                    </div>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(material._id)}
                    >
                      Delete
                    </Button>
                  </ListGroup.Item>
                ))
              )}
            </ListGroup>
          </Tab.Pane>
        </Tab.Content>
          </Tab.Container>
        </>
      )}

      {/* Modal is rendered regardless of hideContent so parent can open it */}
      <Modal
        show={showCreateModal}
        onHide={() => {
          setShowCreateModal(false);
          setMaterialData({
            title: '',
            description: '',
            type: 'link',
            content: '',
          });
          setFileToUpload(null);
          if (onShowCreateModalChange) onShowCreateModalChange(false);
        }}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Material</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                value={materialData.title}
                onChange={(e) => setMaterialData({ ...materialData, title: e.target.value })}
                placeholder="Material title"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Description (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={materialData.description}
                onChange={(e) => setMaterialData({ ...materialData, description: e.target.value })}
                placeholder="Brief description"
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select
                value={materialData.type}
                onChange={(e) => setMaterialData({ ...materialData, type: e.target.value })}
              >
                <option value="link">Link</option>
                <option value="file">File/Document</option>
                <option value="video">Video</option>
              </Form.Select>
            </Form.Group>
            
            {materialData.type === 'file' ? (
              <Form.Group className="mb-3">
                <Form.Label>File</Form.Label>
                <Form.Control
                  type="file"
                  onChange={handleFileChange}
                  required
                />
                <Form.Text className="text-muted">
                  Max file size: 5MB. Supported formats: PDF, JPEG, PNG
                </Form.Text>
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label>
                  {materialData.type === 'link' ? 'URL' : 'Video URL'}
                </Form.Label>
                <Form.Control
                  type="url"
                  value={materialData.content}
                  onChange={(e) => setMaterialData({ ...materialData, content: e.target.value })}
                  placeholder={materialData.type === 'link' ? 'https://example.com' : 'https://youtube.com/watch?v=...'}
                  required
                />
              </Form.Group>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setMaterialData({
                title: '',
                description: '',
                type: 'link',
                content: '',
              });
              setFileToUpload(null);
              if (onShowCreateModalChange) onShowCreateModalChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleCreateMaterial}
            disabled={!materialData.title || (materialData.type !== 'file' && !materialData.content) || (materialData.type === 'file' && !fileToUpload)}
          >
            Add Material
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Materials;