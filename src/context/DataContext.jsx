import { createContext, useContext, useState } from 'react';
import { db } from '../firebase'; 
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [homeData, setHomeData] = useState({ subjects: [], recents: [] });
  const [isHomeLoaded, setIsHomeLoaded] = useState(false);
  const [libraryMaterials, setLibraryMaterials] = useState([]);
  const [isLibraryLoaded, setIsLibraryLoaded] = useState(false);

  const fetchAllData = async () => {
    if (isLibraryLoaded) return;
    
    try {
      // Fetch all data in parallel for better performance
      const [materialsSnap, subjectsSnap] = await Promise.all([
        getDocs(query(collection(db, "materials"), orderBy("createdAt", "desc"))),
        getDocs(collection(db, "subjects"))
      ]);

      // Process materials
      const materialsData = materialsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Process subjects
      const subjectsData = subjectsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Set Library Data
      setLibraryMaterials(materialsData);
      setIsLibraryLoaded(true);

      // 🚨 ULTIMATE FIX FOR HOME PAGE "RECENTLY ADDED"
      // Filter out Pending/Rejected items first, then take top 5 approved (or legacy without status)
      const approvedMaterialsForHome = materialsData.filter(m => {
        const stat = (m.status || "").toString().trim().toLowerCase();
        return stat === "" || stat === "approved";
      });

      // Set Home Data (only approved top 5)
      setHomeData({ 
        subjects: subjectsData,
        recents: approvedMaterialsForHome.slice(0, 5)
      });
      setIsHomeLoaded(true);

    } catch (error) {
      console.error("🔥 Data fetch error:", error);
      setIsHomeLoaded(true);
      setIsLibraryLoaded(true);
    }
  };

  return (
    <DataContext.Provider value={{ 
      homeData, 
      libraryMaterials, 
      fetchLibraryData: fetchAllData, 
      fetchHomeData: fetchAllData,
      isLibraryLoaded,
      isHomeLoaded
    }}>
      {children}
    </DataContext.Provider>
  );
};