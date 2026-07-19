import { useEffect, useState } from 'react';

/**
 * Hook to detect if browser has Data Saver enabled or connection is slow (2G/3G)
 */
export const useDataSaver = () => {
  const [dataSaverMode, setDataSaverMode] = useState(false);

  useEffect(() => {
    // Detect if user has enabled data saver in browser
    if (navigator.connection?.saveData) {
      setDataSaverMode(true);
    }

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const updateNetworkStatus = () => {
        const type = connection.effectiveType; // '4g', '3g', '2g', 'slow-2g'
        
        if (type === '3g' || type === '2g' || type === 'slow-2g') {
          setDataSaverMode(true);
        } else {
          setDataSaverMode(navigator.connection?.saveData || false);
        }
      };

      connection.addEventListener('change', updateNetworkStatus);
      updateNetworkStatus();
      
      return () => connection.removeEventListener('change', updateNetworkStatus);
    }
  }, []);

  return dataSaverMode;
};

export default useDataSaver;
