import React from 'react';

const Logo: React.FC = () => {
    return (
        <div className='flex-1 flex items-center'>
            <span className="text-2xl font-serif font-medium text-primary-900 dark:text-white tracking-tight">echo</span>
            <span className="ml-1 mt-0.5 h-2 w-2 rounded-full bg-primary"></span>
        </div>
    );
};

export default Logo;