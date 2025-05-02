// Homepage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Homepage = ({ isLoggedIn }) => {
  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h2>Welcome to Kuwuten!</h2>
      <p>Your personal file management system.</p>
      <Link to={isLoggedIn ? "/dashboard" : "/login"}>
        <button style={{ marginTop: '20px', padding: '10px 20px', cursor: 'pointer' }}>
          Go to Dashboard
        </button>
      </Link>
    </div>
  );
};

export default Homepage;
