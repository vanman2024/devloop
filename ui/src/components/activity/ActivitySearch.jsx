import React, { useState } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';

const ActivitySearch = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  return (
    <Form onSubmit={handleSubmit}>
      <InputGroup>
        <Form.Control
          type="text"
          placeholder="Search activities by title, description, or user..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="bg-gray-800 text-white border-gray-600"
        />
        {searchQuery && (
          <Button 
            variant="outline-secondary" 
            onClick={handleClear}
            className="border-gray-600"
          >
            <i className="fas fa-times"></i>
          </Button>
        )}
        <Button 
          type="submit" 
          variant="primary"
        >
          <i className="fas fa-search me-1"></i> Search
        </Button>
      </InputGroup>
    </Form>
  );
};

export default ActivitySearch;