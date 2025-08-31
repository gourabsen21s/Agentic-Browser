import React from 'react';

const WebviewContainer: React.FC = () => {
  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        overflow: 'hidden',
        pointerEvents: 'none',
        userSelect: 'none'
      }}
    />
  );
};

export default WebviewContainer;
