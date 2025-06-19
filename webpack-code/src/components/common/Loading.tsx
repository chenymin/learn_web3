import React from 'react';

interface LoadingProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  text?: string;
}

const LoadingExample: React.FC<LoadingProps> = ({
  size = 'medium',
  color = 'text-blue-600',
  text = 'Loading...',
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-4 border-t-transparent ${color} ${sizeClasses[size]}`}
      />
      {text && <span className="text-gray-600">{text}</span>}
    </div>
  );
};

// Example usage
const Loading = () => {
  return <LoadingExample size="medium" color="text-blue-600" />;
};

export default Loading;
