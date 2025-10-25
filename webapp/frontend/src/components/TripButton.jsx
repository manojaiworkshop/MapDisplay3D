import React from 'react';

const TripButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="absolute top-24 right-4 z-40 bg-white shadow-md rounded-full p-3 flex items-center justify-center hover:bg-gray-50"
      title="Plan trip"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6a2 2 0 012-2h1l2 2h3" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l0 0" />
      </svg>
    </button>
  );
};

export default TripButton;
